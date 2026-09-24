import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Check your email", robots: { index: false } };

export default async function Page({ searchParams }: PageProps<"/check-email">) {
  const { reason } = await searchParams;
  const reset = reason === "reset";
  return (
    <div className="text-center">
      <MailCheck
        aria-hidden="true"
        size={40}
        strokeWidth={1.5}
        className="mx-auto mb-4 text-sage"
      />
      <h1 className="mb-4 text-h1">Check your email</h1>
      <p className="mb-8 text-body-lg text-fg-muted">
        {reset
          ? "If there's an account for that address, we've sent a link to choose a new password. It expires in one hour."
          : "We've sent you a link to confirm your email address. Open it on this device to finish signing up."}
      </p>
      <ButtonLink href="/sign-in" variant="secondary">
        Back to sign in
      </ButtonLink>
    </div>
  );
}
