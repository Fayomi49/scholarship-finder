"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useHydrated } from "@/lib/use-hydrated";
import { Button } from "@/components/ui/button";
import { fields, types, regions, fundingTypes } from "./schema";

type Run = {
  id: string;
  provider: string;
  status: string;
  stage: string;
  resultsCount: number;
  duplicatesCount: number;
  reviewedCount: number;
  searchCalls: number;
  pagesFetched: number;
  errors: unknown;
  createdAt: string;
};
const label = (s: string) => s.replaceAll("-", " ");
export function RunPanel({
  initialRuns,
  provider,
}: {
  initialRuns: Run[];
  provider: string;
}) {
  const hydrated = useHydrated();
  const [runs, setRuns] = useState(initialRuns);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const active = runs.find((r) => ["QUEUED", "RUNNING"].includes(r.status));
  const activeId = active?.id;
  useEffect(() => {
    if (!activeId) return;
    const controller = new AbortController();
    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/discovery/runs", {
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error("Could not refresh discovery progress.");
        const next = (await response.json()) as Run[];
        setRuns(next);
        setError("");
        if (!next.some((r) => ["QUEUED", "RUNNING"].includes(r.status)))
          router.refresh();
      } catch (e) {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Could not refresh progress.",
          );
      }
    }, 2500);
    return () => {
      clearInterval(interval);
      controller.abort();
    };
  }, [activeId, router]);
  return (
    <section
      aria-labelledby="discovery-heading"
      className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8"
    >
      <h2 id="discovery-heading" className="font-serif text-3xl">
        Find your next opportunity
      </h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Search technology opportunities in Europe, the Americas and
        international online programmes. Every result stays in your review queue
        until you approve it.
      </p>
      {provider === "mock" && (
        <p className="mt-4 rounded-lg bg-accent p-3 text-sm">
          Demo mode: synthetic examples only, no internet requests. Demo
          candidates cannot be published.
        </p>
      )}
      <form
        className="mt-6"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          const raw = Object.fromEntries(
            [...new FormData(event.currentTarget).entries()].filter(
              ([, v]) => v !== "",
            ),
          );
          try {
            const response = await fetch("/api/discovery/runs", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(raw),
            });
            const data = await response.json();
            if (!response.ok)
              throw new Error(data.error ?? "Discovery could not start.");
            setRuns((previous) =>
              [data.run, ...previous.filter((r) => r.id !== data.run.id)].slice(
                0,
                10,
              ),
            );
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Discovery could not start.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={!hydrated || busy || Boolean(active)}>
          <legend className="mb-3 text-sm font-semibold">
            Optional search filters
          </legend>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "field", text: "Field", values: fields },
              {
                name: "opportunityType",
                text: "Opportunity type",
                values: types,
              },
              {
                name: "region",
                text: "Target region",
                values: regions.filter((r) => r !== "unknown"),
              },
              {
                name: "fundingType",
                text: "Funding type",
                values: fundingTypes,
              },
            ].map(({ name, text, values }) => (
              <label key={name} className="text-sm">
                {text}
                <select
                  name={name}
                  className="mt-2 w-full rounded-lg border border-border bg-background p-3"
                >
                  <option value="">Any</option>
                  {values.map((v) => (
                    <option key={v} value={v}>
                      {label(v)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label className="text-sm">
              Eligibility nationality (country code)
              <input
                name="nationality"
                placeholder="e.g. NG"
                maxLength={2}
                className="mt-2 w-full rounded-lg border border-border bg-background p-3"
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                This filter is sent to the search provider.
              </span>
            </label>
          </div>
          <Button type="submit" className="mt-5">
            {busy
              ? "Starting…"
              : active
                ? "Discovery in progress"
                : "Find New Scholarships"}
          </Button>
        </fieldset>
      </form>
      {error && (
        <p role="alert" className="mt-4 text-sm">
          {error}
        </p>
      )}
      <div aria-live="polite" aria-atomic="true">
        {active && (
          <p className="mt-5 text-sm">
            {active.status === "QUEUED"
              ? "Queued. Keep the local discovery worker running to process this request."
              : `Discovery stage: ${active.stage.replaceAll("-", " ")}. You may leave this page; the worker continues.`}
          </p>
        )}
      </div>
      <Link
        href="/admin/discoveries"
        className="mt-5 inline-block min-h-11 py-3 font-semibold text-primary underline underline-offset-4"
      >
        Review discovered opportunities →
      </Link>
      {runs.length > 0 && (
        <div className="mt-5 space-y-3">
          <h3 className="font-semibold">Recent discovery runs</h3>
          {runs.map((r) => (
            <article
              key={r.id}
              className="rounded-lg border border-border p-4 text-sm"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <span>
                  {r.status.toLowerCase()} · {r.provider}
                </span>
                <time dateTime={r.createdAt}>
                  {new Date(r.createdAt).toLocaleString("en-GB", {
                    timeZone: "UTC",
                  })}{" "}
                  UTC
                </time>
              </div>
              <p className="mt-2">
                {r.resultsCount} results · {r.duplicatesCount} duplicates ·{" "}
                {r.reviewedCount} previously reviewed
              </p>
              <p className="mt-1 text-muted-foreground">
                {r.searchCalls}/8 search calls · {r.pagesFetched}/20 page
                attempts
              </p>
              {Array.isArray(r.errors) && r.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer">
                    {r.errors.length} issues
                  </summary>
                  <ul className="mt-2 space-y-1">
                    {r.errors.map((e: { code?: string }, i: number) => (
                      <li key={i}>
                        {e.code?.replaceAll("-", " ") ?? "Processing failed"}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
