// @vitest-environment node
import { it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { retryAt } from "./rate-limit";
it("honors Retry-After seconds and HTTP dates, with a conservative fallback", () => {
  const now = Date.parse("2026-10-30T12:00:00Z");
  expect(retryAt("120", now).getTime()).toBe(now + 120000);
  expect(retryAt("Fri, 30 Oct 2026 12:05:00 GMT", now).getTime()).toBe(
    now + 300000,
  );
  expect(retryAt(undefined, now).getTime()).toBe(now + 60000);
});
