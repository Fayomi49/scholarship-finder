import Link from "next/link";
import { pageOwner } from "@/server/page-owner";
import { db } from "@/server/db";
import { opportunitySchema, profileSchema } from "@/features/discovery/schema";
import { assess } from "@/features/matching/assess";
import { ReviewList } from "@/features/discovery/review-list";

export const dynamic = "force-dynamic";
export const metadata = { title: "Review discoveries" };
export default async function DiscoveriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const owner = await pageOwner();
  const params = await searchParams;
  const status = ["PENDING", "APPROVED", "REJECTED", "IGNORED"].includes(
    params.status ?? "",
  )
    ? (params.status as "PENDING" | "APPROVED" | "REJECTED" | "IGNORED")
    : "PENDING";
  const page = Math.min(10000, Math.max(1, Number(params.page) || 1));
  const [rows, profileRow] = await Promise.all([
    db().discoveredCandidate.findMany({
      where: { ownerId: owner.id, status },
      include: { sources: true },
      orderBy: { createdAt: "desc" },
      take: 26,
      skip: (Math.floor(page) - 1) * 25,
    }),
    db().userProfile.findUnique({ where: { userId: owner.id } }),
  ]);
  const profile = profileRow
    ? profileSchema.parse({
        nationality: profileRow.nationality,
        residenceCountry: profileRow.residenceCountry,
        preferredDegree: profileRow.preferredDegree,
        preferredFields: profileRow.preferredFields,
        preferredCountries: profileRow.preferredCountries,
        fundingPreference: profileRow.fundingPreference,
      })
    : null;
  const candidates = rows
    .slice(0, 25)
    .map((row) => {
      const data = opportunitySchema.parse(row.data);
      return {
        id: row.id,
        data,
        status: row.status,
        isMock: row.isMock,
        possibleDuplicateId: row.possibleDuplicateId,
        version: row.updatedAt.toISOString(),
        assessment: assess(data, profile),
        sources: row.sources.map((s) => ({
          url: s.url,
          status: s.status,
          checkedAt: s.checkedAt.toISOString(),
          evidence: s.evidence,
        })),
      };
    })
    .sort((a, b) => b.assessment.relevance - a.assessment.relevance);
  return (
    <div className="mx-auto max-w-6xl px-6 py-12 sm:px-8">
      <Link href="/dashboard" className="text-primary underline">
        ← Dashboard
      </Link>
      <h1 className="mt-6 font-serif text-4xl">Review new opportunities</h1>
      <p className="mt-4 leading-7 text-muted-foreground">
        Discovery finds leads. Your review determines what enters the
        scholarship directory. Eligibility and relevance are assessed
        separately.
      </p>
      <nav
        aria-label="Review status"
        className="mt-5 flex flex-wrap gap-5 text-sm"
      >
        {["PENDING", "APPROVED", "REJECTED", "IGNORED"].map((s) => (
          <Link
            key={s}
            href={`?status=${s}`}
            aria-current={s === status ? "page" : undefined}
            className="min-h-11 py-3 text-primary underline"
          >
            {s.toLowerCase()}
          </Link>
        ))}
      </nav>
      <ReviewList candidates={candidates} />
      <div className="mt-8 flex gap-6">
        {page > 1 && (
          <Link
            href={`?status=${status}&page=${page - 1}`}
            className="text-primary underline"
          >
            Previous page
          </Link>
        )}
        {rows.length > 25 && (
          <Link
            href={`?status=${status}&page=${page + 1}`}
            className="text-primary underline"
          >
            Next page
          </Link>
        )}
      </div>
    </div>
  );
}
