// @vitest-environment node
import { beforeEach, describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  configured: vi.fn(),
  account: vi.fn(),
}));
vi.mock("./auth", () => ({ auth: mocks.auth }));
vi.mock("./env", () => ({ authConfigured: mocks.configured }));
vi.mock("./db", () => ({
  db: () => ({ account: { findFirst: mocks.account } }),
}));
import { requireOwner } from "./owner";
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("OWNER_GITHUB_ID", "132573008");
  mocks.configured.mockReturnValue(true);
});
describe("server owner authorization", () => {
  it("denies unconfigured access", async () => {
    mocks.configured.mockReturnValue(false);
    await expect(requireOwner()).rejects.toMatchObject({ status: 503 });
  });
  it("denies unauthenticated requests", async () => {
    mocks.auth.mockResolvedValue(null);
    await expect(requireOwner()).rejects.toMatchObject({ status: 401 });
  });
  it("denies a work account and rechecks the database", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user" } });
    mocks.account.mockResolvedValue({
      provider: "github",
      providerAccountId: "999",
    });
    await expect(requireOwner()).rejects.toMatchObject({ status: 403 });
    expect(mocks.account).toHaveBeenCalled();
  });
  it("permits the configured personal account", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "owner" } });
    mocks.account.mockResolvedValue({
      provider: "github",
      providerAccountId: "132573008",
    });
    await expect(requireOwner()).resolves.toMatchObject({ id: "owner" });
  });
});
