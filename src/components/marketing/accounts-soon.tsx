import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";

/** Shown on auth pages until Supabase Auth arrives in A4. */
export function AccountsSoon({ title }: { title: string }) {
  return (
    <>
      <h1 className="mb-4 text-h1">{title}</h1>
      <Alert tone="info">
        <p>Accounts open with the founding pilot. You&apos;ll be able to sign in here soon.</p>
      </Alert>
      <ButtonLink href="/pilot" variant="secondary" className="mt-6">
        About the founding pilot
      </ButtonLink>
    </>
  );
}
