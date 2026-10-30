import { describe, it, expect } from "vitest";
import {
  opportunitySchema,
  unknownOpportunity,
  filtersSchema,
  profileSchema,
} from "./schema";
import { canonicalUrl, identityKey, possibleDuplicate } from "./identity";
import { assess } from "../matching/assess";
const op = unknownOpportunity(
  "Example programme",
  "https://provider.example/apply",
);
const profile = profileSchema.parse({
  nationality: "NG",
  residenceCountry: "NG",
  preferredDegree: "masters",
  preferredFields: ["computer-science"],
  preferredCountries: ["DE"],
  fundingPreference: "full",
});
describe("boundaries", () => {
  it("rejects invented or contradictory funding and dates", () => {
    expect(
      opportunitySchema.safeParse({
        ...op,
        deadline: "2027-02-30",
        deadlineType: "fixed",
      }).success,
    ).toBe(false);
    expect(
      opportunitySchema.safeParse({
        ...op,
        deadline: "2027-01-01",
        deadlineType: "rolling",
      }).success,
    ).toBe(false);
    expect(
      opportunitySchema.safeParse({
        ...op,
        stipendAmount: 2000,
        stipendCurrency: null,
      }).success,
    ).toBe(false);
    expect(
      opportunitySchema.safeParse({
        ...op,
        stipendAmount: -1,
        stipendCurrency: "USD",
      }).success,
    ).toBe(false);
  });
  it("normalizes nationality but rejects unsupported filters and unsafe schemes", () => {
    expect(filtersSchema.parse({ nationality: " ng " }).nationality).toBe("NG");
    expect(filtersSchema.safeParse({ nationality: "ZZ" }).success).toBe(false);
    expect(
      opportunitySchema.safeParse({ ...op, sourceUrl: "file:///etc/passwd" })
        .success,
    ).toBe(false);
    expect(filtersSchema.safeParse({ scrapeEverything: true }).success).toBe(
      false,
    );
  });
});
describe("duplicates", () => {
  it("normalizes tracking, fragments, ports and query order without deleting intake parameters", () => {
    expect(
      canonicalUrl(
        "https://Provider.example:443/apply/?utm_source=x&year=2027#top",
      ),
    ).toBe("https://provider.example/apply?year=2027");
    expect(canonicalUrl("https://provider.example/?b=2&a=1")).toBe(
      "https://provider.example/?a=1&b=2",
    );
  });
  it("separates programme intakes and treats fuzzy names as suggestions", () => {
    const a = { ...op, provider: "Example Foundation", intake: "2027" };
    expect(identityKey(a)).not.toBe(identityKey({ ...a, intake: "2028" }));
    expect(
      possibleDuplicate(a, { ...a, title: "Example programme fellowship" }),
    ).toBe(false);
    expect(possibleDuplicate(a, { ...a, intake: "2028" })).toBe(false);
  });
});
describe("matching", () => {
  it("does not turn missing eligibility into confirmed eligibility", () => {
    expect(assess(op, profile).eligibility).toBe("unknown");
  });
  it("keeps a nationality mismatch despite high relevance", () => {
    const value = {
      ...op,
      eligibleNationalities: ["US"],
      nationalityUnrestricted: false,
      fields: ["computer-science" as const],
      country: "DE",
      fundingType: "full" as const,
    };
    const result = assess(value, profile);
    expect(result.eligibility).toBe("ineligible");
    expect(result.relevance).toBeGreaterThan(0);
  });
  it("requires positive evidence for every represented hard rule", () => {
    const value = {
      ...op,
      nationalityUnrestricted: true,
      residenceUnrestricted: true,
      fieldRestrictions: false,
      degreeRestrictions: false,
      allRequirementsCaptured: true,
    };
    expect(assess(value, profile).eligibility).toBe("eligible");
    expect(
      assess({ ...value, allRequirementsCaptured: false }, profile).eligibility,
    ).toBe("possibly eligible");
  });
  it("handles degree mismatch, unknown residence and deadline-day boundaries", () => {
    expect(
      assess(
        { ...op, degreeRestrictions: true, degreeLevels: ["phd"] },
        profile,
      ).eligibility,
    ).toBe("ineligible");
    expect(
      assess(
        { ...op, deadlineType: "fixed", deadline: "2027-01-01" },
        profile,
        new Date("2027-01-01T23:59:59Z"),
      ).expired,
    ).toBe(false);
    expect(
      assess(
        { ...op, deadlineType: "fixed", deadline: "2027-01-01" },
        profile,
        new Date("2027-01-02T00:00:00Z"),
      ).expired,
    ).toBe(true);
    expect(
      assess(
        {
          ...op,
          deadlineType: "fixed",
          deadlineInstant: "2027-01-01T12:00:00+01:00",
        },
        profile,
        new Date("2027-01-01T11:00:01Z"),
      ).expired,
    ).toBe(true);
  });
});
