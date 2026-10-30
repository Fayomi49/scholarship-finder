import Link from "next/link";
import { Compass, ArrowUpRight } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-3 font-semibold tracking-tight"
          aria-label="Scholarship Finder home"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Compass className="size-6" aria-hidden="true" />
          </span>
          Scholarship Finder
        </Link>
        <nav
          aria-label="Main navigation"
          className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm font-medium"
        >
          <Link
            href="/scholarships"
            className="inline-flex min-h-11 items-center gap-1 hover:text-primary"
          >
            Explore scholarships{" "}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center hover:text-primary"
          >
            Dashboard
          </Link>
          <Link
            href="/#how-it-works"
            className="inline-flex min-h-11 items-center hover:text-primary"
          >
            How it works
          </Link>
        </nav>
      </div>
    </header>
  );
}
