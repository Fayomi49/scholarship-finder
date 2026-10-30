import "server-only";
import { lookup } from "node:dns/promises";
import { Agent, request } from "undici";
import robotsParser from "robots-parser";
import { RateLimitError, retryAt } from "./rate-limit";
import { db } from "@/server/db";
import { safeUrl, publicAddress } from "@/features/discovery/url-safety";

const robotsCache = new Map<string, { body: string; at: number }>();
const lastRequest = new Map<string, number>();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export const crawlerToken = "ScholarshipFinder";

async function rawFetch(url: URL, maxBytes: number, userAgent: string) {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  let dnsTimer: ReturnType<typeof setTimeout> | undefined;
  const addresses = await Promise.race([
    lookup(host, { all: true }),
    new Promise<never>((_, reject) => {
      dnsTimer = setTimeout(() => reject(new Error("transient-http")), 10000);
    }),
  ]).finally(() => {
    if (dnsTimer) clearTimeout(dnsTimer);
  });
  if (
    !addresses.length ||
    addresses.some(({ address }) => !publicAddress(address))
  )
    throw new Error("unsafe-address");
  const selected = addresses[0];
  const agent = new Agent({
    connect: {
      timeout: 10000,
      lookup: (_host, options, callback) => {
        if (options.all) callback(null, [selected]);
        else callback(null, selected.address, selected.family);
      },
    },
  });
  try {
    const response = await request(url, {
      dispatcher: agent,
      signal: AbortSignal.timeout(10000),
      headersTimeout: 10000,
      bodyTimeout: 10000,
      headers: {
        "user-agent": userAgent,
        accept: "text/html,text/plain,application/xhtml+xml",
      },
    });
    if (response.statusCode >= 300 && response.statusCode < 400) {
      await response.body.dump();
      return {
        status: response.statusCode,
        location: response.headers.location,
        contentType: "",
        text: "",
      };
    }
    if (response.statusCode === 429) {
      await response.body.dump();
      const until = retryAt(response.headers["retry-after"]);
      await db().sourcePolicy.update({
        where: { hostname: url.hostname },
        data: { nextFetchAt: until },
      });
      throw new RateLimitError("host-rate-limited", until);
    }
    if (response.statusCode >= 500) {
      await response.body.dump();
      throw new Error("transient-http");
    }
    if (response.statusCode !== 200 && response.statusCode !== 404) {
      await response.body.dump();
      throw new Error("access-restricted");
    }
    const contentType = String(response.headers["content-type"] ?? "");
    if (
      !/text\/(html|plain)|application\/xhtml\+xml/i.test(contentType) &&
      response.statusCode === 200
    ) {
      await response.body.dump();
      throw new Error("unsupported-content");
    }
    let bytes = 0;
    const chunks: Buffer[] = [];
    for await (const chunk of response.body) {
      const buffer = Buffer.from(chunk);
      bytes += buffer.length;
      if (bytes > maxBytes) {
        response.body.destroy();
        throw new Error("page-too-large");
      }
      chunks.push(buffer);
    }
    return {
      status: response.statusCode,
      location: undefined,
      contentType,
      text: Buffer.concat(chunks).toString("utf8"),
    };
  } finally {
    await agent.close();
  }
}
async function allowedPolicy(url: URL) {
  const policy = await db().sourcePolicy.findUnique({
    where: { hostname: url.hostname },
  });
  if (
    !policy?.allowed ||
    Date.now() - policy.checkedAt.getTime() > 90 * 86400000
  )
    throw new Error("source-permission-required");
  if (policy.nextFetchAt && policy.nextFetchAt.getTime() > Date.now())
    throw new RateLimitError("host-rate-limited", policy.nextFetchAt);
  return policy;
}
async function pacedFetch(
  url: URL,
  maxBytes: number,
  userAgent: string,
  delay = 1500,
) {
  const elapsed = Date.now() - (lastRequest.get(url.origin) ?? 0);
  if (elapsed < delay) await sleep(delay - elapsed);
  lastRequest.set(url.origin, Date.now());
  return rawFetch(url, maxBytes, userAgent);
}
async function robots(url: URL, userAgent: string) {
  const robotsUrl = new URL("/robots.txt", url);
  let cached = robotsCache.get(url.origin);
  if (!cached || Date.now() - cached.at > 600000) {
    const res = await pacedFetch(robotsUrl, 262144, userAgent);
    // A missing robots file imposes no robots rules; terms permission is checked separately.
    if (res.status !== 200 && res.status !== 404)
      throw new Error("robots-unavailable");
    if (res.location) throw new Error("robots-redirect-needs-review");
    cached = { body: res.status === 404 ? "" : res.text, at: Date.now() };
    if (robotsCache.size > 200) robotsCache.clear();
    robotsCache.set(url.origin, cached);
  }
  const rules = robotsParser(robotsUrl.href, cached.body);
  if (rules.isAllowed(url.href, crawlerToken) === false)
    throw new Error("robots-disallowed");
  return Math.max(1500, (rules.getCrawlDelay(crawlerToken) ?? 0) * 1000);
}
export async function fetchPage(
  raw: string,
  reserveContentRequest: () => Promise<void> = async () => {},
) {
  const contact = process.env.DISCOVERY_USER_AGENT;
  if (!contact || !contact.startsWith(crawlerToken) || contact.length < 30)
    throw new Error("crawler-identity-required");
  let url = safeUrl(raw);
  for (let redirect = 0; redirect <= 3; redirect++) {
    const policy = await allowedPolicy(url);
    const delay = await robots(url, contact);
    if (delay > 30000) throw new Error("crawl-delay-exceeds-run-limit");
    await reserveContentRequest();
    const response = await pacedFetch(url, 1500000, contact, delay);
    if (response.location) {
      url = safeUrl(
        new URL(
          Array.isArray(response.location)
            ? response.location[0]
            : response.location,
          url,
        ).href,
      );
      continue;
    }
    if (response.status !== 200) throw new Error("page-unavailable");
    if (
      /captcha|cf-chl-|verify you are human|access denied/i.test(
        response.text.slice(0, 50000),
      )
    )
      throw new Error("access-restricted");
    return {
      html: response.text,
      url: url.href,
      official: policy.official,
      fetchedAt: new Date(),
    };
  }
  throw new Error("too-many-redirects");
}
