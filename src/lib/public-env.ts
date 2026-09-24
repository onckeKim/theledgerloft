import { z } from "zod";

/**
 * Public (browser-safe) settings. Each is referenced literally so Next.js can inline it at build time.
 * The Supabase publishable key is designed to be public; access is controlled by row level security.
 */
export const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  // Support and privacy contact shown on the privacy notice and terms. Set in the host, not the repo (D-048).
  NEXT_PUBLIC_SUPPORT_EMAIL: z.preprocess((v) => (v === "" ? undefined : v), z.email().optional()),
});

export type PublicEnv = z.infer<typeof publicSchema>;

export function parsePublicEnv(source: Record<string, string | undefined>): PublicEnv {
  const result = publicSchema.safeParse(source);
  if (!result.success)
    throw new Error(`Invalid public environment variables:\n${z.prettifyError(result.error)}`);
  return result.data;
}

export const publicEnv: PublicEnv = parsePublicEnv({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
});
