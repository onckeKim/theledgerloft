import { defineConfig, devices } from "@playwright/test";
import { LOCAL_PAYMENTS_SECRET } from "./e2e/constants";

const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    // Runs against a production build so the tests see what users get.
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
      // Smoke tests never sign in, so a placeholder project is enough (no network calls without a session).
      NEXT_PUBLIC_SUPABASE_URL: process.env.E2E_SUPABASE_URL ?? "https://placeholder.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        process.env.E2E_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_placeholder_for_e2e",
      // PayFast's published sandbox test values (SDK README) and the local stack's test secret (supabase/seed.sql).
      // Nothing here reaches PayFast: tests stop the browser at the checkout form.
      PAYFAST_MODE: "sandbox",
      PAYFAST_MERCHANT_ID: "10000100",
      PAYFAST_MERCHANT_KEY: "46f0cd694581a",
      PAYFAST_PASSPHRASE: "jt7NOE43FZPn",
      PAYMENTS_DB_SECRET: LOCAL_PAYMENTS_SECRET,
    },
  },
});
