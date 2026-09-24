import "server-only";
import { z } from "zod";
import { publicSchema } from "./public-env";

/**
 * Server environment, validated once at start-up. Add every new variable here AND in .env.example.
 * Secrets (service-role key from later steps, PayFast in L9) must never use the NEXT_PUBLIC_ prefix.
 */
const schema = publicSchema
  .extend({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  })
  .superRefine((env, ctx) => {
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

/** Absolute URL for links in emails (verification, password reset). */
export function siteUrl(path: string): string {
  return new URL(path, env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").toString();
}
