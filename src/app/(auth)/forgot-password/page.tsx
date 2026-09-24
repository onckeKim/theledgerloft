import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function Page() {
  return (
    <>
      <h1 className="mb-2 text-h1">Reset your password</h1>
      <p className="mb-6 text-fg-muted">
        Enter your email and we&apos;ll send you a link to choose a new password.
      </p>
      <ForgotPasswordForm />
    </>
  );
}
