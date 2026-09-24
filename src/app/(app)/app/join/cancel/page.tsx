import { redirect } from "next/navigation";
import type { Route } from "next";
import { verifySession } from "@/lib/auth/dal";

/** PayFast's cancel link (PRD US-06 AC4): back to the offer with a neutral message. */
export default async function Page() {
  await verifySession("/app/join/cancel");
  redirect("/app/join?notice=cancelled" as Route);
}
