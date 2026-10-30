import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Scholarship Finder", template: "%s | Scholarship Finder" },
  description:
    "Explore manually curated scholarships in Europe and the Americas, with clear eligibility information and official sources.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased">
        <a
          href="#main-content"
          className="sr-only fixed top-3 left-3 z-50 rounded-lg bg-primary px-5 py-3 text-primary-foreground focus:not-sr-only"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main-content" tabIndex={-1} className="flex-1">
          {children}
        </main>
        <footer className="border-t border-border px-6 py-6 text-sm text-muted-foreground">
          <div className="mx-auto flex max-w-6xl flex-col justify-between gap-2 sm:flex-row">
            <span>Scholarship Finder</span>
            <span>
              Official providers are the authority on requirements and
              deadlines.
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
