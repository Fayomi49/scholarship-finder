import { createHash } from "node:crypto";
import type { Opportunity } from "./schema";

export function canonicalUrl(raw: string): string {
  const u = new URL(raw);
  u.hash = "";
  for (const key of [...u.searchParams.keys()])
    if (/^(utm_.+|fbclid|gclid|msclkid)$/i.test(key))
      u.searchParams.delete(key);
  u.searchParams.sort();
  if (
    (u.protocol === "https:" && u.port === "443") ||
    (u.protocol === "http:" && u.port === "80")
  )
    u.port = "";
  u.pathname = u.pathname.replace(/\/+$/, "") || "/";
  return u.toString();
}
export function normalizeIdentity(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
export function intakeKey(value: Opportunity) {
  return value.intake?.trim().toLowerCase() || "unspecified-intake";
}
export function identityKey(value: Opportunity) {
  const parts = value.provider
    ? [
        value.provider,
        value.title,
        value.country ?? value.deliveryMode,
        intakeKey(value),
      ].map(normalizeIdentity)
    : [canonicalUrl(value.sourceUrl), intakeKey(value)];
  return createHash("sha256").update(parts.join("|")).digest("hex");
}
export function possibleDuplicate(a: Opportunity, b: Opportunity) {
  if (
    !a.provider ||
    !b.provider ||
    normalizeIdentity(a.provider) !== normalizeIdentity(b.provider)
  )
    return false;
  if (a.intake && b.intake && a.intake !== b.intake) return false;
  const tokens = new Set(normalizeIdentity(a.title).split(" "));
  const other = new Set(normalizeIdentity(b.title).split(" "));
  const overlap = [...tokens].filter((t) => other.has(t)).length;
  return overlap / Math.max(tokens.size, other.size) >= 0.7;
}
