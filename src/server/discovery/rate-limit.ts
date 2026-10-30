import "server-only";

export function retryAt(value: unknown, now = Date.now()) {
  const raw = Array.isArray(value) ? value[0] : value;
  const text = typeof raw === "string" ? raw.trim() : "";
  const milliseconds = /^\d+$/.test(text)
    ? Number(text) * 1000
    : Date.parse(text) - now;
  const delay =
    Number.isFinite(milliseconds) && milliseconds > 0 ? milliseconds : 60000;
  return new Date(now + Math.min(delay, 365 * 86400000));
}
export class RateLimitError extends Error {
  constructor(
    code: "search-rate-limited" | "host-rate-limited",
    public readonly retryAfter: Date,
  ) {
    super(code);
  }
}
