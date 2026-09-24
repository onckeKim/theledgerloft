import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Account deleted" };

/** After account deletion (PRD US-44 AC2). Public: the person is signed out. */
export default function Page() {
  return (
    <section className="mx-auto max-w-[640px] px-4 py-16">
      <h1 className="mb-4 text-h1">Your account has been deleted</h1>
      <p>
        Your sign-in and your planner data have been removed. We&apos;ve kept only a record that an
        account was deleted, with no financial details. Copies in our database backups expire within
        the backup period set out in the <Link href={"/privacy" as never}>privacy notice</Link>.
      </p>
      <p>Thank you for trying The Ledger Loft. You&apos;re welcome back any time.</p>
      <Link href={"/" as never}>Back to the home page</Link>
    </section>
  );
}
