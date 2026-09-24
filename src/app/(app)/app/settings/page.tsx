import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card, Eyebrow } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Settings" };

// Budget setup, profile changes and account deletion arrive with their slices (PRD US-41, US-42, US-44).
export default async function Page() {
  const session = await verifySession("/app/settings");
  return (
    <>
      <PageHeader eyebrow="Account" title="Settings" />
      <Card className="max-w-[720px]">
        <Eyebrow>Profile</Eyebrow>
        <dl className="mt-3">
          <dt className="font-semibold">Email</dt>
          <dd className="m-0 text-fg-muted">{session.email ?? "Not available"}</dd>
        </dl>
        <form action={signOut} className="mt-6">
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </Card>
      <Card className="mt-4 max-w-[720px]">
        <Eyebrow>Your data</Eyebrow>
        <h2 className="mb-2 mt-1 text-h3">Download all my data</h2>
        <p className="text-fg-muted">
          Everything you&apos;ve entered, as spreadsheets, whenever you want it.
        </p>
        <Link href={"/app/settings/data" as never}>Go to your data</Link>
      </Card>
    </>
  );
}
