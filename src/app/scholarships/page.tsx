import Link from "next/link";
import type { Metadata } from "next";
import { EmptyDirectory } from "@/features/scholarships/empty-directory";
import { db } from "@/server/db";
import { opportunitySchema } from "@/features/discovery/schema";

export const metadata: Metadata = { title: "Explore scholarships" };
export const dynamic = "force-dynamic";
export default async function ScholarshipsPage() {
  let records: Awaited<
    ReturnType<ReturnType<typeof db>["scholarship"]["findMany"]>
  > = [];
  let unavailable = false;
  if (process.env.DATABASE_URL) {
    try {
      records = await db().scholarship.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { verifiedAt: "desc" },
        take: 50,
      });
    } catch {
      unavailable = true;
    }
  }
  return (
    <div className="mx-auto max-w-6xl px-6 py-12 sm:px-8 sm:py-16">
      <p className="text-xs font-bold tracking-[0.18em] text-primary uppercase">
        Europe, the Americas & online
      </p>
      <h1 className="mt-3 font-serif text-4xl sm:text-5xl">
        Explore scholarships
      </h1>
      <p className="mt-4 mb-10 max-w-2xl leading-7 text-muted-foreground">
        Discover owner-reviewed opportunities with official sources,
        verification dates and clear eligibility information.
      </p>
      {unavailable ? (
        <p role="alert">
          The directory is temporarily unavailable. Please try again later.
        </p>
      ) : !records.length ? (
        <EmptyDirectory />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {records.map((record) => {
            const data = opportunitySchema.parse(record.data);
            return (
              <article
                key={record.id}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <h2 className="font-serif text-2xl">
                  <Link
                    href={`/scholarships/${record.id}`}
                    className="text-primary underline underline-offset-4"
                  >
                    {record.title}
                  </Link>
                </h2>
                <p className="mt-3 text-sm">
                  {record.provider} · {record.country ?? record.deliveryMode} ·{" "}
                  {record.fundingType} funding
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Deadline:{" "}
                  {data.deadlineInstant ?? data.deadline ?? data.deadlineType}
                  {data.deadline && !data.deadlineInstant
                    ? " (timezone not stated)"
                    : ""}
                </p>
                <p className="mt-3 text-sm">
                  Eligibility needs an individual assessment. Check all
                  requirements.
                </p>
                <a
                  href={record.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block text-sm text-primary underline"
                >
                  Official source ↗
                </a>
                <p className="mt-3 text-xs text-muted-foreground">
                  Reviewed{" "}
                  {record.verifiedAt?.toISOString() ??
                    "verification date unknown"}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
