import { describe, it, expect } from "vitest";
import { safeUrl, publicAddress } from "./url-safety";
describe("SSRF boundary", () => {
  it.each([
    "http://127.0.0.1",
    "http://[::1]",
    "http://[::ffff:127.0.0.1]",
    "http://169.254.169.254",
    "http://10.1.1.1",
    "http://localhost",
    "http://2130706433",
    "http://0x7f000001",
    "http://172.16.0.1",
    "http://192.168.0.1",
    "https://user:password@public.example",
    "ftp://public.example",
    "https://public.example:8443",
  ])("blocks %s", (url) => {
    expect(() => safeUrl(url)).toThrow();
  });
  it("accepts only public DNS addresses", () => {
    expect(publicAddress("93.184.216.34")).toBe(true);
    expect(publicAddress("192.168.1.1")).toBe(false);
    expect(publicAddress("::1")).toBe(false);
  });
});
