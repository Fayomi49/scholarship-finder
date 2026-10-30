// @vitest-environment node
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  lookup: vi.fn(),
  request: vi.fn(),
  policy: vi.fn(),
  policyUpdate: vi.fn(),
  agents: [] as {
    connect: {
      lookup: (
        host: string,
        options: { all: boolean },
        callback: (...args: unknown[]) => void,
      ) => void;
    };
  }[],
}));
vi.mock("node:dns/promises", () => ({ lookup: mocks.lookup }));
vi.mock("undici", () => ({
  request: mocks.request,
  Agent: class {
    constructor(options: {
      connect: {
        lookup: (
          host: string,
          options: { all: boolean },
          callback: (...args: unknown[]) => void,
        ) => void;
      };
    }) {
      mocks.agents.push(options);
    }
    async close() {}
  },
}));
vi.mock("@/server/db", () => ({
  db: () => ({
    sourcePolicy: { findUnique: mocks.policy, update: mocks.policyUpdate },
  }),
}));
import { fetchPage } from "./fetch";
function response(text: string, status = 200, location?: string) {
  return {
    statusCode: status,
    headers: { "content-type": "text/html", location },
    body: {
      async dump() {},
      destroy() {},
      async *[Symbol.asyncIterator]() {
        yield Buffer.from(text);
      },
    },
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.agents.length = 0;
  let now = Date.now();
  vi.spyOn(Date, "now").mockImplementation(() => (now += 10000));
  vi.stubEnv(
    "DISCOVERY_USER_AGENT",
    "ScholarshipFinder/1.0 (contact: test fixture)",
  );
  mocks.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  mocks.policy.mockResolvedValue({
    allowed: true,
    official: true,
    checkedAt: new Date(),
  });
});
afterEach(() => {
  vi.restoreAllMocks();
});
describe("permission and network protections", () => {
  it("does not fetch a domain without reviewed permission", async () => {
    mocks.policy.mockResolvedValue(null);
    await expect(
      fetchPage("https://unreviewed.example/programme"),
    ).rejects.toThrow("source-permission-required");
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("obeys a robots disallow", async () => {
    mocks.request.mockResolvedValue(response("User-agent: *\nDisallow: /"));
    await expect(
      fetchPage("https://robots-deny.example/programme"),
    ).rejects.toThrow("robots-disallowed");
    expect(mocks.request).toHaveBeenCalledTimes(1);
  });
  it("rejects private DNS answers before connecting", async () => {
    mocks.lookup.mockResolvedValue([{ address: "10.0.0.1", family: 4 }]);
    await expect(
      fetchPage("https://private-dns.example/programme"),
    ).rejects.toThrow("unsafe-address");
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("revalidates redirect destinations and pins resolved addresses", async () => {
    mocks.request.mockResolvedValueOnce(response("User-agent: *\nAllow: /"));
    mocks.request.mockResolvedValueOnce(
      response("", 302, "http://169.254.169.254/latest/meta-data"),
    );
    await expect(
      fetchPage("https://redirect.example/programme"),
    ).rejects.toThrow("unsafe-address");
    expect(mocks.request).toHaveBeenCalledTimes(2);
    const callback = vi.fn();
    mocks.agents[0].connect.lookup("changed-host", { all: false }, callback);
    expect(callback).toHaveBeenCalledWith(null, "93.184.216.34", 4);
  });
  it("does not bypass CAPTCHA pages", async () => {
    mocks.request.mockResolvedValueOnce(response("User-agent: *\nAllow: /"));
    mocks.request.mockResolvedValueOnce(
      response("<h1>Verify you are human</h1>"),
    );
    await expect(
      fetchPage("https://captcha.example/programme"),
    ).rejects.toThrow("access-restricted");
  });
  it("persists a host cooldown on HTTP 429", async () => {
    mocks.request.mockResolvedValueOnce(response("User-agent: *\nAllow: /"));
    mocks.request.mockResolvedValueOnce({
      ...response("", 429),
      headers: { "retry-after": "120" },
    });
    await expect(
      fetchPage("https://rate-limited.example/programme"),
    ).rejects.toThrow("host-rate-limited");
    expect(mocks.policyUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { nextFetchAt: expect.any(Date) } }),
    );
  });
});
