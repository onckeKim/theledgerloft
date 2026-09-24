import { redirect } from "next/navigation";
import type { Route } from "next";
import { requireAccess } from "@/lib/auth/dal";
import { setupStatus } from "@/lib/setup/queries";
import { resumeRoute } from "@/lib/setup/steps";

// "/app/setup" resumes where the person left off (PRD US-16 AC4: save and finish later).
export default async function Page() {
  await requireAccess("/app/setup");
  const status = await setupStatus();
  if (status.completed) redirect("/app" as Route);
  redirect(`/app/setup/${resumeRoute(status.step)}` as Route);
}
