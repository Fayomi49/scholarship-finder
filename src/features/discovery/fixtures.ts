import { unknownOpportunity, type Opportunity } from "./schema";

export const mockCandidates: Opportunity[] = [
  {
    ...unknownOpportunity(
      "[DEMO] Example technology fellowship",
      "https://fellowship.example/programme",
    ),
    provider: "Example Foundation (synthetic fixture)",
    region: "remote",
    deliveryMode: "remote",
    fields: ["computer-science"],
    opportunityType: "fellowship",
  },
  {
    ...unknownOpportunity(
      "[DEMO] Example funded masters",
      "https://university.example/masters",
    ),
    provider: "Example University (synthetic fixture)",
    region: "europe",
    country: "DE",
    fields: ["data-science"],
    opportunityType: "masters-scholarship",
    degreeLevels: ["masters"],
    degreeRestrictions: true,
  },
];
