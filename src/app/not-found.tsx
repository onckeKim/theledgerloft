import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-[640px] px-4 py-24 text-center">
      <span className="ll-label">Page not found</span>
      <h1 className="mb-4 mt-2 text-h1">We couldn&apos;t find that page</h1>
      <p className="mb-8 text-body-lg text-fg-muted">
        The link may be old, or the page may have moved.
      </p>
      <ButtonLink href="/">Go to the home page</ButtonLink>
    </main>
  );
}
