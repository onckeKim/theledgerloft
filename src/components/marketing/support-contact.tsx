import { publicEnv } from "@/lib/public-env";

/** The support and privacy contact (NEXT_PUBLIC_SUPPORT_EMAIL), or a visible placeholder until it's set. */
export function SupportContact() {
  const email = publicEnv.NEXT_PUBLIC_SUPPORT_EMAIL;
  if (!email) return <span>[contact email to be added]</span>;
  return (
    <a className="underline" href={`mailto:${email}`}>
      {email}
    </a>
  );
}
