import "server-only";
import { z } from "zod";
import { publicSchema } from "./public-env";
import { isLocalHost } from "./security/https";

/**
 * Server environment, validated once at start-up. Add every new variable here AND in .env.example.
 * Secrets (service-role key from later steps, PayFast in L9) must never use the NEXT_PUBLIC_ prefix.
 */
/** An empty value (e.g. copied from .env.example) counts as not set. */
const optional = <T extends z.ZodType>(t: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), t.optional());

const schema = publicSchema
  .extend({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    // PayFast (L9). All server-only. Payments are switched on only when all four are set.
    PAYFAST_MODE: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z.enum(["sandbox", "live"]).default("sandbox"),
    ),
    PAYFAST_MERCHANT_ID: optional(z.string().regex(/^\d{1,20}$/)),
    PAYFAST_MERCHANT_KEY: optional(z.string().regex(/^[A-Za-z0-9]{1,40}$/)),
    PAYFAST_PASSPHRASE: optional(
      z.string().regex(/^[A-Za-z0-9]{12,100}$/, "use 12–100 letters and numbers"),
    ),
    // Lets the notify route apply verified payments (public.payfast_apply_itn). Its bcrypt hash is in the database.
    PAYMENTS_DB_SECRET: optional(z.string().min(32)),
  })
  .superRefine((env, ctx) => {
    const payfast = [
      "PAYFAST_MERCHANT_ID",
      "PAYFAST_MERCHANT_KEY",
      "PAYFAST_PASSPHRASE",
      "PAYMENTS_DB_SECRET",
    ] as const;
    const set = payfast.filter((k) => env[k]);
    if (set.length > 0 && set.length < payfast.length)
      for (const k of payfast.filter((k) => !env[k]))
        ctx.addIssue({
          code: "custom",
          path: [k],
          message: "is required when payments are set up",
        });
    if (env.NODE_ENV === "production" && !env.NEXT_PUBLIC_SITE_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_SITE_URL"],
        message: "is required in production",
      });
    }
    // Secure cookies and upgrade-insecure-requests follow the site URL (src/lib/security/https.ts): only a local
    // production build may use http.
    if (
      env.NODE_ENV === "production" &&
      env.NEXT_PUBLIC_SITE_URL?.startsWith("http://") &&
      !isLocalHost(env.NEXT_PUBLIC_SITE_URL)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_SITE_URL"],
        message: "must use https in production",
      });
    }
  });

export type Env = z.infer<typeof schema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export const env: Env = parseEnv(process.env);

/** PayFast settings, or null while payments aren't set up (the join page then says the pilot isn't open). */
export function payfastConfig() {
  if (
    !env.PAYFAST_MERCHANT_ID ||
    !env.PAYFAST_MERCHANT_KEY ||
    !env.PAYFAST_PASSPHRASE ||
    !env.PAYMENTS_DB_SECRET
  )
    return null;
  return {
    mode: env.PAYFAST_MODE,
    merchantId: env.PAYFAST_MERCHANT_ID,
    merchantKey: env.PAYFAST_MERCHANT_KEY,
    passphrase: env.PAYFAST_PASSPHRASE,
    dbSecret: env.PAYMENTS_DB_SECRET,
  };
}

/** Absolute URL for links in emails (verification, password reset). */
export function siteUrl(path: string): string {
  return new URL(path, env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").toString();
}
