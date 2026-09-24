import "server-only";
import { z } from "zod";

/**
 * Server environment, validated once at start-up. Add every new variable here AND in .env.example.
 * Secrets (added from A4) must never use the NEXT_PUBLIC_ prefix.
 */
const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    /** Public base URL, used for absolute links and redirects. Required in production. */
    NEXT_PUBLIC_SITE_URL: z.url().optional(),
    /**
     * Development-only preview of signed-in screens with synthetic data (no accounts until A4).
     * Refused in production so it can never bypass sign-in on a real deployment.
     */
    APP_PREVIEW: z.enum(["off", "synthetic"]).default("off"),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && env.APP_PREVIEW !== "off") {
      ctx.addIssue({
        code: "custom",
        path: ["APP_PREVIEW"],
        message: "must be 'off' in production",
      });
    }
    if (env.NODE_ENV === "production" && !env.NEXT_PUBLIC_SITE_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_SITE_URL"],
        message: "is required in production",
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
