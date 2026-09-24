import type { Metadata } from "next";
import Link from "next/link";
import { DownloadButton } from "@/components/export/download-button";
import { Card, Eyebrow } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { verifySession } from "@/lib/auth/dal";
import { createDataExport } from "@/lib/export/actions";

export const metadata: Metadata = { title: "Your data" };

/** Data rights (PRD US-43). Works for every signed-in user, with or without pilot access. */
export default async function Page() {
  await verifySession("/app/settings/data");
  return (
    <>
      <PageHeader eyebrow="Settings" title="Your data" />
      <Card className="max-w-[720px]">
        <Eyebrow>Download</Eyebrow>
        <h2 className="mb-2 mt-1 text-h3">Download all my data</h2>
        <p className="text-fg-muted">
          A zip file with one spreadsheet (CSV) for each kind of record you&apos;ve entered: your
          plan, transactions, goals, debts, check-ins and account activity. It includes a README
          that explains the columns.
        </p>
        <p className="text-body-sm text-fg-muted">
          The file contains your financial information, so keep it somewhere safe. The download link
          works for 10 minutes, and the download is recorded in your account activity.
        </p>
        <DownloadButton
          label="Download all my data"
          failure="We couldn't create your download. Your data is safe. Try again."
          create={createDataExport}
        />
      </Card>
      <p className="mt-4">
        <Link href={"/app/settings" as never}>Back to settings</Link>
      </p>
    </>
  );
}
