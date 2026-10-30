import { z } from "zod";

export const fields = [
  "software-engineering",
  "computer-science",
  "ai",
  "machine-learning",
  "data-science",
  "cybersecurity",
  "cloud-computing",
  "it",
  "other-technology",
] as const;
export const types = [
  "masters-scholarship",
  "fellowship",
  "funded-research",
  "graduate-assistantship",
  "stipend-training",
  "sponsored-bootcamp",
  "professional-training",
  "international-programme",
] as const;
export const regions = [
  "europe",
  "north-america",
  "central-america",
  "south-america",
  "remote",
  "unknown",
] as const;
export const fundingTypes = ["full", "partial", "other", "unknown"] as const;
const countryCodes = new Set(
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(
    " ",
  ),
);
export const countrySchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine(
    (s) => countryCodes.has(s),
    "Use an ISO 3166-1 country code, such as NG.",
  );
export const publicUrlSchema = z
  .url()
  .max(2048)
  .refine((raw) => {
    const u = new URL(raw);
    return (
      ["http:", "https:"].includes(u.protocol) && !u.username && !u.password
    );
  }, "Use a public HTTP(S) URL without credentials.");
export const filtersSchema = z
  .object({
    field: z.enum(fields).optional(),
    opportunityType: z.enum(types).optional(),
    region: z.enum(regions).exclude(["unknown"]).optional(),
    fundingType: z.enum(fundingTypes).optional(),
    nationality: countrySchema.optional(),
  })
  .strict();
export type Filters = z.infer<typeof filtersSchema>;
export const profileSchema = z
  .object({
    nationality: countrySchema.nullable(),
    residenceCountry: countrySchema.nullable(),
    preferredDegree: z
      .enum(["masters", "phd", "bachelors", "training"])
      .nullable(),
    preferredFields: z.array(z.enum(fields)).max(9),
    preferredCountries: z.array(countrySchema).max(30),
    fundingPreference: z.enum(fundingTypes),
  })
  .strict();
export type Profile = z.infer<typeof profileSchema>;

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) =>
      !Number.isNaN(Date.parse(s)) &&
      new Date(s).toISOString().slice(0, 10) === s,
    "Use a valid calendar date.",
  );
export const opportunitySchema = z
  .object({
    title: z.string().trim().min(3).max(300),
    provider: z.string().trim().min(2).max(200).nullable(),
    country: countrySchema.nullable(),
    region: z.enum(regions),
    deliveryMode: z.enum(["in-person", "remote", "hybrid", "unknown"]),
    fields: z.array(z.enum(fields)).max(9),
    degreeLevels: z
      .array(z.enum(["masters", "phd", "bachelors", "training"]))
      .max(4),
    opportunityType: z.enum(types).nullable(),
    fundingType: z.enum(fundingTypes),
    fundingDetails: z.string().max(8000).nullable(),
    stipendAmount: z.number().finite().nonnegative().nullable(),
    stipendCurrency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .nullable(),
    stipendPeriod: z.enum(["month", "year", "total", "unknown"]),
    eligibleNationalities: z.array(countrySchema).nullable(),
    nationalityUnrestricted: z.boolean().nullable(),
    residenceCountries: z.array(countrySchema).nullable(),
    residenceUnrestricted: z.boolean().nullable(),
    fieldRestrictions: z.boolean().nullable(),
    degreeRestrictions: z.boolean().nullable(),
    otherRequirements: z.string().max(8000).nullable(),
    allRequirementsCaptured: z.boolean(),
    deadline: dateSchema.nullable(),
    deadlineInstant: z.iso.datetime({ offset: true }).nullable(),
    deadlineType: z.enum(["fixed", "rolling", "unknown"]),
    deadlineRaw: z.string().max(300).nullable(),
    intake: z.string().max(100).nullable(),
    sourceUrl: publicUrlSchema,
    applicationUrl: publicUrlSchema.nullable(),
    description: z.string().max(12000).nullable(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.nationalityUnrestricted === true &&
      value.eligibleNationalities?.length
    )
      ctx.addIssue({
        code: "custom",
        path: ["eligibleNationalities"],
        message:
          "An unrestricted nationality rule cannot also restrict nationality.",
      });
    if (
      value.residenceUnrestricted === true &&
      value.residenceCountries?.length
    )
      ctx.addIssue({
        code: "custom",
        path: ["residenceCountries"],
        message:
          "An unrestricted residence rule cannot also restrict residence.",
      });
    if (
      value.deadline &&
      value.deadlineInstant &&
      value.deadline !== value.deadlineInstant.slice(0, 10)
    )
      ctx.addIssue({
        code: "custom",
        path: ["deadlineInstant"],
        message: "The deadline date and timestamp disagree.",
      });
    if (
      value.deadlineType === "rolling" &&
      (value.deadline || value.deadlineInstant)
    )
      ctx.addIssue({
        code: "custom",
        path: ["deadline"],
        message: "A rolling deadline cannot also be a fixed deadline.",
      });
    if (
      value.deadlineType === "fixed" &&
      !value.deadline &&
      !value.deadlineInstant
    )
      ctx.addIssue({
        code: "custom",
        path: ["deadline"],
        message: "A fixed deadline needs a date.",
      });
    if ((value.stipendAmount === null) !== (value.stipendCurrency === null))
      ctx.addIssue({
        code: "custom",
        path: ["stipendAmount"],
        message:
          "Stipend amount and currency must both be stated, or both unknown.",
      });
  });
export type Opportunity = z.infer<typeof opportunitySchema>;
export function unknownOpportunity(
  title: string,
  sourceUrl: string,
): Opportunity {
  return {
    title,
    provider: null,
    country: null,
    region: "unknown",
    deliveryMode: "unknown",
    fields: [],
    degreeLevels: [],
    opportunityType: null,
    fundingType: "unknown",
    fundingDetails: null,
    stipendAmount: null,
    stipendCurrency: null,
    stipendPeriod: "unknown",
    eligibleNationalities: null,
    nationalityUnrestricted: null,
    residenceCountries: null,
    residenceUnrestricted: null,
    fieldRestrictions: null,
    degreeRestrictions: null,
    otherRequirements: null,
    allRequirementsCaptured: false,
    deadline: null,
    deadlineInstant: null,
    deadlineType: "unknown",
    deadlineRaw: null,
    intake: null,
    sourceUrl,
    applicationUrl: null,
    description: null,
  };
}
export const approvalSchema = z
  .object({
    id: z.string().min(1),
    action: z.enum(["approve", "reject", "ignore"]),
    data: opportunitySchema.optional(),
    officialSourceConfirmed: z.boolean().default(false),
    importantClaimsChecked: z.boolean().default(false),
    version: z.iso.datetime().optional(),
  })
  .strict();
