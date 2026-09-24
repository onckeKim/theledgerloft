#!/usr/bin/env node
/**
 * Staging smoke test (release review B1). Read-only: it signs nobody up and changes nothing.
 *   node scripts/smoke-staging.mjs https://<staging-host> [https://<project>.supabase.co <publishable-key>]
 * Exits non-zero if any check fails. Also runs from GitHub: Actions → "Staging smoke test".
 */
const [base, supabaseUrl, publishableKey] = process.argv.slice(2);
if (!base || !/^(https:\/\/|http:\/\/localhost[:/])/.test(base)) {
  console.error(
    "Usage: node scripts/smoke-staging.mjs https://<staging-host> [supabase-url publishable-key]",
  );
  process.exit(2);
}
const url = (p) => new URL(p, base).toString();
let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};
const get = (p, init = {}) => fetch(url(p), { redirect: "manual", ...init });

const home = await get("/");
check("home page loads", home.status === 200, `HTTP ${home.status}`);
const csp = home.headers.get("content-security-policy") ?? "";
check("CSP with a per-request nonce", /script-src[^;]*'nonce-/.test(csp));
check(
  "CSP form-action allows only this site and PayFast",
  /form-action 'self' https:\/\/\*\.payfast\.co\.za/.test(csp),
);
check("HSTS", /max-age=\d+/.test(home.headers.get("strict-transport-security") ?? ""));
check("X-Frame-Options DENY", home.headers.get("x-frame-options") === "DENY");
check("X-Content-Type-Options nosniff", home.headers.get("x-content-type-options") === "nosniff");
check("no X-Powered-By", !home.headers.get("x-powered-by"));
const again = await get("/");
const nonce = (h) => /'nonce-([^']+)'/.exec(h.headers.get("content-security-policy") ?? "")?.[1];
check("a fresh nonce on each request", nonce(home) && nonce(home) !== nonce(again));

for (const p of [
  "/sign-in",
  "/sign-up",
  "/privacy",
  "/terms",
  "/disclaimer",
  "/pilot",
  "/account-deleted",
]) {
  const r = await get(p);
  check(`${p} loads`, r.status === 200, `HTTP ${r.status}`);
}
const app = await get("/app/budget");
check(
  "signed-out /app/budget redirects to sign-in",
  [302, 303, 307, 308].includes(app.status) &&
    (app.headers.get("location") ?? "").includes("/sign-in"),
  `HTTP ${app.status} → ${app.headers.get("location")}`,
);
const exp = await get("/api/exports/00000000-0000-4000-8000-000000000000");
check("signed-out export download is refused", exp.status === 401, `HTTP ${exp.status}`);
const notify = await get("/api/payfast/notify", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: "m_payment_id=x&signature=0",
});
check(
  "payment notification refuses a forged call",
  notify.status === 400 || notify.status === 404,
  `HTTP ${notify.status}: ${notify.status === 404 ? "payments not set up" : "payments set up, forged call rejected"}`,
);
const missing = await get("/this-page-does-not-exist");
check("unknown pages return 404", missing.status === 404, `HTTP ${missing.status}`);

if (supabaseUrl && publishableKey) {
  const s = await fetch(new URL("/auth/v1/settings", supabaseUrl), {
    headers: { apikey: publishableKey },
  });
  const settings = s.ok ? await s.json() : {};
  check("Supabase auth settings readable", s.ok, `HTTP ${s.status}`);
  check("email sign-up enabled", settings.external?.email === true);
  check("email confirmation required", settings.mailer_autoconfirm === false);
  const t = await fetch(new URL("/rest/v1/households?select=id&limit=1", supabaseUrl), {
    headers: { apikey: publishableKey },
  });
  check(
    "database refuses signed-out reads",
    t.status === 401 || t.status === 403,
    `HTTP ${t.status}`,
  );
}

console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
