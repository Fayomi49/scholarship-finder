import { BookOpen } from "lucide-react";

export function EmptyDirectory() {
  return (
    <section
      aria-labelledby="empty-heading"
      className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center sm:px-12"
    >
      <BookOpen
        className="mx-auto mb-5 size-10 text-primary"
        aria-hidden="true"
      />
      <h2 id="empty-heading" className="font-serif text-3xl">
        The directory is taking shape
      </h2>
      <p className="mx-auto mt-4 max-w-md leading-7 text-muted-foreground">
        No scholarships are available yet. Opportunities will appear here after
        they have been manually added and verified against official sources.
      </p>
      <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground">
        You’ll be able to review funding, deadlines and eligibility details for
        each opportunity.
      </p>
    </section>
  );
}
