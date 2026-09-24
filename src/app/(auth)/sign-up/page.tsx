import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default function Page() {
  return (
    <>
      <h1 className="mb-2 text-h1">Create an account</h1>
      <p className="mb-6 text-fg-muted">
        For the founding pilot. You&apos;ll set up your planner after confirming your email.
      </p>
      <SignUpForm />
    </>
  );
}
