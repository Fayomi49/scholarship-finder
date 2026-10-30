import Link from "next/link";
import { pageOwner } from "@/server/page-owner";
import { db } from "@/server/db";
import { profileSchema } from "@/features/discovery/schema";
import { ProfileForm } from "@/features/profile/profile-form";
export const dynamic = "force-dynamic";
export default async function ProfilePage() {
  const owner = await pageOwner();
  const row = await db().userProfile.findUnique({
    where: { userId: owner.id },
  });
  const initial = profileSchema.parse(
    row
      ? {
          nationality: row.nationality,
          residenceCountry: row.residenceCountry,
          preferredDegree: row.preferredDegree,
          preferredFields: row.preferredFields,
          preferredCountries: row.preferredCountries,
          fundingPreference: row.fundingPreference,
        }
      : {
          nationality: null,
          residenceCountry: null,
          preferredDegree: null,
          preferredFields: [],
          preferredCountries: [],
          fundingPreference: "unknown",
        },
  );
  return (
    <div className="mx-auto max-w-6xl px-6 py-12 sm:px-8">
      <Link href="/dashboard" className="text-primary underline">
        ← Dashboard
      </Link>
      <h1 className="mt-6 font-serif text-4xl">Your matching preferences</h1>
      <ProfileForm initial={initial} />
    </div>
  );
}
