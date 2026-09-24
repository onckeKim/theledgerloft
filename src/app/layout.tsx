import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { THEME_COOKIE } from "@/lib/settings/schemas";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: "600",
  variable: "--font-playfair",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "The Ledger Loft", template: "%s · The Ledger Loft" },
  description:
    "Your Ledger Loft planner, with the maths done for you. A budgeting and planning tool, not financial advice.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F4EE" },
    { media: "(prefers-color-scheme: dark)", color: "#141E29" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Render every page per request so Next.js can apply the CSP nonce set in proxy.ts (decision D-019).
  await connection();
  // Light or dark if chosen in Settings (US-45), otherwise the device's setting (CSS prefers-color-scheme).
  const theme = (await cookies()).get(THEME_COOKIE)?.value;
  return (
    <html
      lang="en-ZA"
      className={`${playfair.variable} ${inter.variable}`}
      data-theme={theme === "light" || theme === "dark" ? theme : undefined}
    >
      <body className="min-h-dvh">
        <a
          href="#main"
          className="absolute -left-[999px] top-2 z-50 bg-raised px-4 py-2 focus:left-2"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
