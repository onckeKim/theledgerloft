import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/auth-forms";
import { safeNextPath } from "@/lib/auth/next-path";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function Page({ searchParams }: PageProps<"/sign-in">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  const notice =
    params.link === "expired"
      ? "That link has expired or was already used. Sign in, or request a new link."
      : undefined;
  return (
    <>
      <h1 className="mb-6 text-h1">Sign in</h1>
      <SignInForm next={next} notice={notice} />
    </>
  );
}
