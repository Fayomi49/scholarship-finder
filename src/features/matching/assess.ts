import type { Opportunity, Profile } from "@/features/discovery/schema";

export function assess(
  op: Opportunity,
  profile: Profile | null,
  now = new Date(),
) {
  const reasons: string[] = [];
  let unknown = 0;
  let confirmed = 0;
  let mismatch = false;
  const check = (
    label: string,
    input: string | null | undefined,
    list: string[] | null,
    unrestricted: boolean | null,
  ) => {
    if (unrestricted === true) {
      confirmed++;
      reasons.push(`${label}: explicitly unrestricted.`);
    } else if (!input || !list) {
      unknown++;
      reasons.push(`${label}: needs verification.`);
    } else if (!list.includes(input)) {
      mismatch = true;
      reasons.push(`${label}: confirmed mismatch.`);
    } else {
      confirmed++;
      reasons.push(`${label}: matches stated restrictions.`);
    }
  };
  check(
    "Nationality",
    profile?.nationality,
    op.eligibleNationalities,
    op.nationalityUnrestricted,
  );
  check(
    "Residence",
    profile?.residenceCountry,
    op.residenceCountries,
    op.residenceUnrestricted,
  );
  check(
    "Degree",
    profile?.preferredDegree,
    op.degreeRestrictions === true ? op.degreeLevels : null,
    op.degreeRestrictions === false ? true : null,
  );
  if (op.fieldRestrictions === false) confirmed++;
  else if (
    op.fieldRestrictions === null ||
    !profile?.preferredFields.length ||
    !op.fields.length
  ) {
    unknown++;
    reasons.push("Field restrictions need verification.");
  } else if (profile.preferredFields.some((f) => op.fields.includes(f))) {
    confirmed++;
    reasons.push("Field matches stated restrictions.");
  } else {
    mismatch = true;
    reasons.push("Field: confirmed mismatch.");
  }
  if (!op.allRequirementsCaptured || op.otherRequirements) {
    unknown++;
    reasons.push("Additional requirements need verification.");
  }
  let relevance = 0;
  if (profile) {
    relevance +=
      profile.preferredFields.filter((f) => op.fields.includes(f)).length * 20;
    if (op.country && profile.preferredCountries.includes(op.country))
      relevance += 15;
    if (
      profile.fundingPreference !== "unknown" &&
      profile.fundingPreference === op.fundingType
    )
      relevance += 10;
  }
  const deadline = op.deadlineInstant
    ? Date.parse(op.deadlineInstant)
    : op.deadline
      ? Date.parse(op.deadline + "T00:00:00Z")
      : null;
  // Date-only deadlines cannot be classified as expired during their calendar day without a timezone.
  const expired =
    deadline !== null &&
    (op.deadlineInstant
      ? deadline < now.getTime()
      : op.deadline! < now.toISOString().slice(0, 10));
  if (expired)
    reasons.push("The stated deadline has passed; verify the current intake.");
  else if (deadline !== null && deadline - now.getTime() < 30 * 86400000)
    relevance += 5;
  const eligibility = mismatch
    ? "ineligible"
    : unknown === 0
      ? "eligible"
      : confirmed > 0
        ? "possibly eligible"
        : "unknown";
  return { eligibility, relevance, reasons, expired };
}
