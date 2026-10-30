import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { opportunitySchema } from "@/features/discovery/schema";

export const dynamic = "force-dynamic";
export default async function ScholarshipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!process.env.DATABASE_URL) notFound();
  const record = await db().scholarship.findFirst({
    where: { id, status: "PUBLISHED" },
  });
  if (!record) notFound();
  const data = opportunitySchema.parse(record.data);
  const facts = {
    Provider: data.provider,
    Country: data.country,
    Region: data.region,
    "Delivery mode": data.deliveryMode,
    "Opportunity type": data.opportunityType,
    "Fields of study": data.fields.join(", "),
    "Degree levels": data.degreeLevels.join(", "),
    Funding: data.fundingType,
    "Funding details": data.fundingDetails,
    Stipend:
      data.stipendAmount === null
        ? null
        : `${data.stipendCurrency} ${data.stipendAmount} (${data.stipendPeriod})`,
    Deadline:
      data.deadlineInstant ??
      (data.deadline
        ? `${data.deadline} (timezone not stated)`
        : data.deadlineType),
    "Eligible nationalities": data.nationalityUnrestricted
      ? "Explicitly unrestricted"
      : data.eligibleNationalities?.join(", "),
    "Residence requirements": data.residenceUnrestricted
      ? "Explicitly unrestricted"
      : data.residenceCountries?.join(", "),
    "Other requirements": data.otherRequirements,
  };
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/scholarships" className="text-primary underline">
        ← Explore scholarships
      </Link>
      <h1 className="mt-6 font-serif text-4xl">{data.title}</h1>
      <p className="mt-6 whitespace-pre-line leading-7 text-muted-foreground">
        {data.description}
      </p>
      <dl className="mt-8 grid gap-6 sm:grid-cols-2">
        {Object.entries(facts).map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm font-semibold">{label}</dt>
            <dd className="mt-2 whitespace-pre-line text-sm leading-6">
              {value || "Unknown — needs verification"}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-8 rounded-xl bg-accent p-5 text-sm leading-6">
        Reviewing this record does not confirm your eligibility. Missing details
        need verification, and the provider remains the authority on funding,
        deadlines and requirements.
      </p>
      <div className="mt-6 flex flex-wrap gap-5">
        <a
          href={data.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline"
        >
          Official source ↗
        </a>
        {data.applicationUrl && (
          <a
            href={data.applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            Official application ↗
          </a>
        )}
      </div>
      <p className="mt-5 text-sm text-muted-foreground">
        Owner reviewed: {record.verifiedAt?.toISOString() ?? "unknown"}
      </p>
    </div>
  );
}
