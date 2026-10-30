// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { extract } from "./extract";
describe("conservative page extraction", () => {
  it("retains unknown money and eligibility despite promotional keywords", () => {
    const { data } = extract(
      "<h1>Technology fellowship</h1><p>We discuss fully funded programmes, USD stipends and international applicants.</p>",
      "https://provider.example/",
      "Fallback",
    );
    expect(data.fundingType).toBe("unknown");
    expect(data.stipendAmount).toBeNull();
    expect(data.nationalityUnrestricted).toBeNull();
    expect(data.allRequirementsCaptured).toBe(false);
  });
  it("extracts exact labelled facts with evidence", () => {
    const { data, evidence } = extract(
      "<h1>Example fellowship</h1><dl><dt>Provider</dt><dd>Example Foundation</dd><dt>Stipend</dt><dd>USD 1200 per month</dd><dt>Eligible nationalities</dt><dd>NG, GH</dd></dl><p>Application deadline: 2027-05-01</p>",
      "https://provider.example/",
      "Fallback",
    );
    expect(data.provider).toBe("Example Foundation");
    expect(data.stipendAmount).toBe(1200);
    expect(data.stipendPeriod).toBe("month");
    expect(data.eligibleNationalities).toEqual(["NG", "GH"]);
    expect(data.deadline).toBe("2027-05-01");
    expect(evidence.deadline).toBeDefined();
  });
  it("leaves conflicting dates unknown and rejects script application links", () => {
    const { data } = extract(
      '<h1>Example fellowship</h1><p>Apply by 2027-01-01. Closing date 2028-01-01.</p><a href="javascript:alert(1)">Apply now</a>',
      "https://provider.example/",
      "Fallback",
    );
    expect(data.deadline).toBeNull();
    expect(data.applicationUrl).toBeNull();
  });
  it("does not execute malformed structured data", () => {
    expect(
      extract(
        '<h1>Example fellowship</h1><script type="application/ld+json">invalid</script>',
        "https://provider.example/",
        "Fallback",
      ).data.provider,
    ).toBeNull();
  });
});
