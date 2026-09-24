import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  DisplayNameForm,
  EmailForm,
  PasswordForm,
  ThemeForm,
} from "@/components/settings/profile-forms";
import { Card, Eyebrow } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { verifySession } from "@/lib/auth/dal";
import { THEME_COOKIE, isTheme } from "@/lib/settings/schemas";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profile" };

/** Profile, email, password (PRD US-42) and appearance (US-45). */
export default async function Page() {
  const session = await verifySession("/app/settings/profile");
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", session.userId)
    .maybeSingle();
  const theme = (await cookies()).get(THEME_COOKIE)?.value;
  return (
    <>
      <PageHeader eyebrow="Settings" title="Profile" />
      <div className="grid max-w-[720px] gap-4">
        <Card>
          <Eyebrow>Name</Eyebrow>
          <DisplayNameForm initial={profile?.display_name ?? ""} />
        </Card>
        <Card>
          <Eyebrow>Email</Eyebrow>
          <p className="mb-4 mt-1">
            You sign in with <strong>{session.email ?? "your email"}</strong>.
          </p>
          <EmailForm />
        </Card>
        <Card>
          <Eyebrow>Password</Eyebrow>
          <div className="mt-2">
            <PasswordForm />
          </div>
        </Card>
        <Card>
          <Eyebrow>Appearance</Eyebrow>
          <div className="mt-2">
            <ThemeForm initial={isTheme(theme) ? theme : "system"} />
          </div>
        </Card>
      </div>
      <p className="mt-4">
        <Link href={"/app/settings" as never}>Back to settings</Link>
      </p>
    </>
  );
}
