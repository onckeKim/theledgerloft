import type { Metadata } from "next";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card, Eyebrow } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Settings" };

// Budget setup, data export and deletion arrive with their slices (PRD US-41…US-44).
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
    </>
  );
}
