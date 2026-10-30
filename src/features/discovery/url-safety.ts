import ipaddr from "ipaddr.js";

export function publicAddress(address: string) {
  try {
    const ip = ipaddr.process(address);
    return ip.range() === "unicast";
  } catch {
    return false;
  }
}
export function safeUrl(raw: string) {
  const u = new URL(raw);
  if (
    !["http:", "https:"].includes(u.protocol) ||
    u.username ||
    u.password ||
    (u.port && !["80", "443"].includes(u.port))
  )
    throw new Error("unsafe-url");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (
    ["localhost", "metadata.google.internal"].includes(host) ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  )
    throw new Error("unsafe-host");
  if (ipaddr.isValid(host) && !publicAddress(host))
    throw new Error("unsafe-address");
  return u;
}
