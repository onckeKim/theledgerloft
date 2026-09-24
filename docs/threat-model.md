# Threat Model

Status: v0.1 (Playbook step A2). Method: data flow + STRIDE. Revisit at L5 (schema), L9 (payments) and before release.

## 1. System and trust boundaries

```
[Browser] ──HTTPS──> [Next.js on Vercel: pages, server actions, route handlers] ──> [Supabase: Auth, Postgres+RLS, Storage]
    │                        │                                                   ▲
    │                        └──HTTPS──> [Email provider]                         │
    └──redirect──> [PayFast checkout] ──server-to-server notification (ITN)──> [Next.js /api/payfast/notify]
```

Boundaries: (1) browser ↔ server, (2) server ↔ Supabase, (3) PayFast ↔ our notification endpoint, (4) our code ↔
third-party packages. **Assets:** C3 financial data, C4 secrets, account access, payment state.

## 2. Threats and mitigations

| ID | STRIDE | Threat | Mitigation | Verified by |
|---|---|---|---|---|
| T1 | Info disclosure / Elevation | User A reads or changes User B's household data by changing an id (IDOR), or RLS is missing on a table | RLS on every household table; policies check membership via `auth.uid()`; server code uses the user's session client, not the service role; CI test fails if any public table lacks RLS | L5 RLS test suite (A reads B → 0 rows, A writes B → denied) |
| T2 | Info disclosure | Service-role key or PayFast passphrase leaks into the client bundle or repo | Keys only in server env vars; `server-only` imports; secret scanning in CI; bundle grep test for key prefixes | CI |
| T3 | Spoofing | Account takeover by credential stuffing or weak passwords | Supabase Auth rate limits; minimum password length 10 + breached-password check if available; email verification; optional TOTP MFA (S) | Auth config review |
| T4 | Tampering / Spoofing | Forged or replayed PayFast notification grants paid access | Verify signature with passphrase, validate source per current PayFast docs, confirm amount and merchant id against our own record, idempotent on `pf_payment_id`; never trust client price or plan | L9: `src/lib/payments/payments.test.ts` (forged, tampered, wrong source, unconfirmed), `supabase/tests/payments.sql` (tampered amount, wrong merchant, duplicate, out of order, reused PayFast id, no secret), `e2e/payments.spec.ts` |
| T5 | Tampering | Client sends a different price, plan or household id | Server derives price, plan and household from the session and database only | Server action tests |
| T6 | Info disclosure | Export link shared or guessed; export includes another household's data | Private storage bucket; signed URL ≤ 10 min; generation queries scoped by household; audit event | L8 export tests with two seeded households |
| T7 | Tampering | Stored XSS via descriptions, category names or reflections | React escaping; no `dangerouslySetInnerHTML`; strict Content-Security-Policy; PDF generator escapes text | Lint rule + CSP header test |
| T8 | Tampering | CSV injection (`=`, `+`, `-`, `@` at the start of a cell) in data export | Prefix risky cells with `'` in CSV export | Unit test |
| T9 | Info disclosure | Financial data in logs, error tracker or analytics | Log allow-list of fields; scrub request bodies; analytics events have no amounts or free text (`analytics-plan.md`) | Log redaction test |
| T10 | Repudiation | User disputes an export, deletion or payment | Audit events (actor, action, entity, time) for sensitive actions | Audit tests |
| T11 | Denial of service | Scripted sign-ups, transaction floods, export spam | Platform rate limits; per-user limits on exports (for example 10 per hour); pagination | Load test N2 |
| T12 | Elevation | Malicious or compromised npm package | Lockfile; minimal dependencies; Dependabot or equivalent; `npm audit` high or critical blocks release | CI |
| T13 | Info disclosure | Session theft via cookie misuse | HttpOnly, Secure, SameSite=Lax cookies (Supabase SSR helpers); short access tokens | Header test |
| T14 | Info disclosure | Real user data pasted into AI tools or support chats | Policy: synthetic data only in development; support uses screenshots with the user's consent | Operating rule |
| T15 | Tampering | Deleted account data lingers | Deletion cascades tested; storage files removed; backups rotate per N11 | Deletion test |

## 3. Out of scope for MVP (and why the risk is lower)
- Bank credential theft: we don't collect bank credentials.
- Card data theft: card entry happens on PayFast; we never receive card numbers.
- Multi-member household abuse (for example a controlling partner): **re-assess before shipping sharing (A-02)**. It needs safety features such as leaving a household and private notes.

## 4. Security tests required before release
T1, T2, T4, T5, T6, T7, T8, T9, T15 have automated tests; T3, T11, T13 have configuration evidence; T12 has a clean audit.
