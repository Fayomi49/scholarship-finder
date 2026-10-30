import "server-only";
import { load } from "cheerio";
import {
  opportunitySchema,
  unknownOpportunity,
  dateSchema,
  publicUrlSchema,
  fields,
  types,
  regions,
  countrySchema,
} from "@/features/discovery/schema";

export function extract(html: string, url: string, fallbackTitle: string) {
  const $ = load(html);
  $(
    "script:not([type='application/ld+json']),style,nav,footer,header,noscript",
  ).remove();
  const title =
    $("h1").first().text().trim() ||
    $("meta[property='og:title']").attr("content") ||
    fallbackTitle;
  const result = unknownOpportunity(title.slice(0, 300), url);
  const text = $("main").text().trim() || $("body").text().trim();
  result.description = text.replace(/\s+/g, " ").slice(0, 12000) || null;
  result.provider =
    $("meta[property='og:site_name']").attr("content")?.slice(0, 200) || null;
  const evidence: Record<string, { value: unknown; excerpt: string }> = {
    title: { value: result.title, excerpt: title.slice(0, 500) },
  };
  // Only exact, labelled dates are extracted. Conflicting dates stay unknown.
  const dates = [
    ...text.matchAll(
      /(?:application deadline|closing date|apply by)\s*:?\s*(\d{4}-\d{2}-\d{2})/gi,
    ),
  ]
    .map((m) => ({ date: m[1], raw: m[0] }))
    .filter((v) => dateSchema.safeParse(v.date).success);
  if (dates.length && new Set(dates.map((d) => d.date)).size === 1) {
    result.deadline = dates[0].date;
    result.deadlineType = "fixed";
    result.deadlineRaw = dates[0].raw;
    evidence.deadline = { value: result.deadline, excerpt: dates[0].raw };
  }
  const applicationLinks = $("a[href]")
    .toArray()
    .filter((a) =>
      /^(apply now|apply online|application portal)$/i.test($(a).text().trim()),
    )
    .map((a) => {
      try {
        return new URL($(a).attr("href")!, url).href;
      } catch {
        return "";
      }
    })
    .filter((u) => publicUrlSchema.safeParse(u).success);
  if (new Set(applicationLinks).size === 1) {
    result.applicationUrl = applicationLinks[0];
    evidence.applicationUrl = {
      value: result.applicationUrl,
      excerpt:
        "Apply link on source page; destination authority requires review.",
    };
  }
  // JSON-LD has the same trust level as the source and does not override restrictions.
  for (const element of $("script[type='application/ld+json']").toArray()) {
    try {
      const raw = JSON.parse($(element).text());
      const nodes = Array.isArray(raw) ? raw : (raw["@graph"] ?? [raw]);
      for (const node of nodes.slice(0, 50)) {
        if (
          ![
            "EducationalOccupationalProgram",
            "Scholarship",
            "JobPosting",
          ].includes(node["@type"])
        )
          continue;
        const provider = node.provider?.name ?? node.hiringOrganization?.name;
        if (typeof provider === "string") {
          result.provider = provider.slice(0, 200);
          evidence.provider = {
            value: result.provider,
            excerpt: JSON.stringify({
              provider: node.provider,
              hiringOrganization: node.hiringOrganization,
            }).slice(0, 1000),
          };
        }
      }
    } catch {
      /* Invalid metadata leaves fields unknown. */
    }
  }
  // Explicit definition-list/table labels are supported; unlabelled promotional text stays unknown.
  const labelled = new Map<string, string[]>();
  const put = (label: string, value: string) => {
    const key = label.toLowerCase().trim().replace(/:$/, "");
    const values = labelled.get(key) ?? [];
    if (value.trim()) labelled.set(key, [...values, value.trim()]);
  };
  $("dt").each((_, element) =>
    put($(element).text(), $(element).next("dd").text()),
  );
  $("tr").each((_, element) => {
    const cells = $(element).children("th,td");
    if (cells.length === 2) put(cells.eq(0).text(), cells.eq(1).text());
  });
  const get = (label: string) => {
    const values = [...new Set(labelled.get(label) ?? [])];
    return values.length === 1 ? values[0] : null;
  };
  const record = (key: string, value: unknown, excerpt: string) => {
    evidence[key] = { value, excerpt: excerpt.slice(0, 1000) };
  };
  const provider = get("provider");
  if (provider && provider.length <= 200) {
    result.provider = provider;
    record("provider", provider, provider);
  }
  result.intake = (get("intake") ?? get("cohort"))?.slice(0, 100) ?? null;
  if (result.intake) record("intake", result.intake, result.intake);
  const country = get("country");
  if (countrySchema.safeParse(country).success) {
    result.country = countrySchema.parse(country);
    record("country", result.country, country!);
  }
  const region = get("region")?.toLowerCase().replaceAll(" ", "-");
  if (regions.some((r) => r === region)) {
    result.region = regions.find((r) => r === region)!;
    record("region", result.region, region!);
  }
  const funding = get("funding type")?.toLowerCase();
  if (funding === "full" || funding === "partial" || funding === "other") {
    result.fundingType = funding;
    record("fundingType", funding, get("funding type")!);
  }
  result.fundingDetails = get("funding details")?.slice(0, 8000) ?? null;
  const type = get("opportunity type")?.toLowerCase().replaceAll(" ", "-");
  result.opportunityType = types.find((t) => t === type) ?? null;
  const fieldText = get("fields of study");
  if (fieldText) {
    const tokens = fieldText
      .toLowerCase()
      .split(/[,;]/)
      .map((f) => f.trim().replaceAll(" ", "-"));
    result.fields = fields.filter((f) => tokens.includes(f));
    record("fields", result.fields, fieldText);
  }
  const level = get("degree level")?.toLowerCase();
  if (
    level === "masters" ||
    level === "phd" ||
    level === "bachelors" ||
    level === "training"
  ) {
    result.degreeLevels = [level];
    record("degreeLevels", result.degreeLevels, level);
  }
  const stipend = get("stipend");
  const amount = stipend?.match(
    /^(USD|EUR|GBP|CAD|BRL|MXN)\s+(\d+(?:\.\d{1,2})?)(?:\s+per\s+(month|year)|\s+(total))?$/i,
  );
  if (amount) {
    result.stipendCurrency = amount[1].toUpperCase();
    result.stipendAmount = Number(amount[2]);
    result.stipendPeriod =
      amount[3]?.toLowerCase() === "month"
        ? "month"
        : amount[3]?.toLowerCase() === "year"
          ? "year"
          : amount[4]
            ? "total"
            : "unknown";
    record(
      "stipend",
      {
        amount: result.stipendAmount,
        currency: result.stipendCurrency,
        period: result.stipendPeriod,
      },
      stipend!,
    );
  }
  const eligibility = get("eligible nationalities");
  if (eligibility) {
    const countries = eligibility.split(/[,;]/).map((c) => c.trim());
    if (
      countries.length &&
      countries.every((c) => countrySchema.safeParse(c).success)
    ) {
      result.eligibleNationalities = countries.map((c) =>
        countrySchema.parse(c),
      );
      result.nationalityUnrestricted = false;
      record(
        "eligibleNationalities",
        result.eligibleNationalities,
        eligibility,
      );
    } else if (/^all nationalities$/i.test(eligibility)) {
      result.nationalityUnrestricted = true;
      record("nationalityUnrestricted", true, eligibility);
    }
  }
  const residence = get("residence restrictions");
  if (residence && /^none$/i.test(residence)) {
    result.residenceUnrestricted = true;
    record("residenceUnrestricted", true, residence);
  }
  const delivery = get("delivery mode")?.toLowerCase();
  if (
    delivery === "remote" ||
    delivery === "in-person" ||
    delivery === "hybrid"
  ) {
    result.deliveryMode = delivery;
    record("deliveryMode", delivery, delivery);
  }
  result.otherRequirements = get("other requirements")?.slice(0, 8000) ?? null;
  // Funding and eligibility text needs explicit review: keywords alone are not evidence of a benefit or restriction.
  return { data: opportunitySchema.parse(result), evidence };
}
