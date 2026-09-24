import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card, Eyebrow } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Settings" };

/** Settings (PRD US-41…US-45). Signed in is enough: data rights never depend on paying. */
export default async function Page() {
  const session = await verifySession("/app/settings");
  const sections = [
    {
      href: "/app/settings/profile",
      eyebrow: "Profile",
      title: "Name, email, password and appearance",
      body: `Signed in as ${session.email ?? "your account"}.`,
    },
    {
      href: "/app/settings/budget",
      eyebrow: "Budget setup",
      title: "Pay frequency, month start day and style",
      body: "Changes to the start day apply from next month.",
    },
    {
      href: "/app/settings/data",
      eyebrow: "Your data",
      title: "Download or delete",
      body: "Everything you've entered, as spreadsheets, or delete your account.",
    },
  ];
  return (
    <>
      <PageHeader eyebrow="Account" title="Settings" />
      <div className="grid max-w-[720px] gap-4">
        {sections.map((s) => (
          <Card key={s.href}>
            <Eyebrow>{s.eyebrow}</Eyebrow>
            <h2 className="mb-1 mt-1 text-h3">
              <Link href={s.href as never} className="no-underline hover:underline">
                {s.title}
              </Link>
            </h2>
            <p className="m-0 text-fg-muted">{s.body}</p>
          </Card>
        ))}
        <Card>
          <form action={signOut}>
            <Button type="submit" variant="secondary">
              Sign out
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
