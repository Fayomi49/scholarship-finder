import { fields, types, type Filters } from "./schema";

export function buildQueries(f: Filters) {
  const subjects = [
    "computer science software engineering",
    "AI machine learning",
    "data science cybersecurity",
    "cloud computing information technology",
  ];
  const locations = [
    "Europe",
    "United States Canada Mexico",
    "Central America",
    "South America",
    "online international",
  ];
  const kinds = f.opportunityType
    ? (Array(8).fill(f.opportunityType) as string[])
    : [...types];
  return kinds
    .map((kind, index) => {
      const subject =
        f.field?.replaceAll("-", " ") ?? subjects[index % subjects.length];
      const location =
        f.region?.replaceAll("-", " ") ?? locations[index % locations.length];
      const nationality = f.nationality
        ? ` applicants nationality ${f.nationality}`
        : " international applicants";
      const funding =
        f.fundingType && f.fundingType !== "unknown"
          ? ` ${f.fundingType} funding`
          : " funding benefits";
      return `${subject} ${kind.replaceAll("-", " ")} ${location}${funding}${nationality} official application eligibility`;
    })
    .filter((query, index, all) => all.indexOf(query) === index)
    .slice(0, 8);
}
export { fields };
