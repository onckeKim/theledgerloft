import type { Metadata } from "next";
import { NewPasswordForm } from "@/components/auth/auth-forms";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

// Reached from the reset email via /auth/callback, which signs the user in first.
export default async function Page() {
  await verifySession("/reset-password");
  return (
    <>
      <h1 className="mb-6 text-h1">Choose a new password</h1>
      <NewPasswordForm />
    </>
  );
}
