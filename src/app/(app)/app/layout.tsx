import { DisclaimerFooter } from "@/components/shell/disclaimer-footer";
import { SideNav } from "@/components/shell/side-nav";
import { TabBar } from "@/components/shell/tab-bar";

// Protection happens in each page via verifySession(), because layouts don't re-run on client navigation
// (Next.js authentication guide). proxy.ts also redirects signed-out visitors early.
export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[72px_1fr] lg:grid-cols-[240px_1fr]">
      <SideNav />
      <div>
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-bg px-4 md:hidden">
          <span className="font-display text-[19px] font-semibold">The Ledger Loft</span>
        </header>
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1120px] px-4 pb-28 pt-6 md:px-8 md:pb-16 md:pt-12"
        >
          {children}
          <DisclaimerFooter />
        </main>
        <TabBar />
      </div>
    </div>
  );
}
