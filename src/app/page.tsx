import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Globe2,
  ListChecks,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    number: "01",
    title: "Explore your options",
    description:
      "Look for opportunities in Europe and the Americas, curated manually from official sources.",
    icon: Globe2,
  },
  {
    number: "02",
    title: "Understand the requirements",
    description:
      "Review degree, field and nationality restrictions. Missing details will be flagged for verification.",
    icon: ShieldCheck,
  },
  {
    number: "03",
    title: "Plan your next step",
    description:
      "Check the official provider’s requirements and deadline before you prepare an application.",
    icon: ListChecks,
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-6 sm:px-8">
      <section
        className="grid gap-10 py-16 sm:py-24 lg:grid-cols-[1.3fr_1fr] lg:items-center lg:gap-16"
        aria-labelledby="welcome-heading"
      >
        <div>
          <p className="mb-6 text-xs font-bold tracking-[0.18em] text-primary uppercase">
            Your next chapter starts with a possibility
          </p>
          <h1
            id="welcome-heading"
            className="max-w-2xl font-serif text-5xl leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl"
          >
            A wider world.
            <br />
            <span className="text-primary">A clearer path.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">
            Find your way through scholarships in Europe and the Americas, with
            clear requirements and official sources to guide your next step.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/scholarships">
                Explore scholarships{" "}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <a href="#how-it-works">How it works</a>
            </Button>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            Manually curated. Eligibility made clear.
          </p>
        </div>
        <aside
          className="relative rounded-2xl border border-border bg-accent p-7 sm:p-9"
          aria-labelledby="approach-heading"
        >
          <div className="mb-10 flex items-center justify-between">
            <BookOpen className="size-8 text-primary" aria-hidden="true" />
            <span className="rounded-full border border-primary/25 px-3 py-1 text-xs font-medium text-primary">
              A thoughtful approach
            </span>
          </div>
          <h2
            id="approach-heading"
            className="font-serif text-3xl leading-tight"
          >
            Good decisions start
            <br />
            with clear information.
          </h2>
          <ul className="mt-7 space-y-4 text-sm leading-6">
            {[
              "Official source links and verification dates",
              "Eligibility details you can review",
              "Unknown requirements clearly marked",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <ShieldCheck
                  className="mt-0.5 size-5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-8 border-t border-primary/20 pt-5 text-sm leading-6 text-muted-foreground">
            Your eligibility depends on each provider’s rules. Always confirm
            details at the official source.
          </p>
        </aside>
      </section>
      <section
        id="how-it-works"
        className="scroll-mt-8 border-t border-border py-12 sm:py-16"
        aria-labelledby="steps-heading"
      >
        <p className="text-xs font-bold tracking-[0.18em] text-primary uppercase">
          A little clarity, at every step
        </p>
        <h2 id="steps-heading" className="mt-3 font-serif text-3xl sm:text-4xl">
          From possibility to a plan
        </h2>
        <div className="mt-9 grid gap-7 md:grid-cols-3">
          {steps.map(({ number, title, description, icon: Icon }) => (
            <article key={number} className="border-t border-border pt-5">
              <div className="mb-6 flex items-center justify-between">
                <span className="font-mono text-sm text-muted-foreground">
                  {number}
                </span>
                <Icon className="size-5 text-primary" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
