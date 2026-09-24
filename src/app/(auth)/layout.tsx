import Link from "next/link";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="mx-auto flex max-w-[720px] items-center justify-between border-b border-border px-4 py-4">
        <Link href="/" className="font-display text-[19px] font-semibold no-underline">
          The Ledger Loft
        </Link>
      </header>
      <main id="main" className="mx-auto max-w-[480px] px-4 py-16">
        {children}
      </main>
    </>
  );
}
