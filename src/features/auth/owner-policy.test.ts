import { describe, it, expect } from "vitest";
import { isOwnerAccount } from "./owner-policy";
describe("personal GitHub owner", () => {
  it("requires the stable personal GitHub ID", () => {
    expect(isOwnerAccount("github", "132573008", "132573008")).toBe(true);
  });
  it("rejects work accounts, other providers, usernames and missing configuration", () => {
    for (const args of [
      ["github", "98765", "132573008"],
      ["google", "132573008", "132573008"],
      ["github", "Fayomi49", "132573008"],
      ["github", "", undefined],
    ])
      expect(isOwnerAccount(...(args as [unknown, unknown, unknown]))).toBe(
        false,
      );
  });
});
