// The webhook URL guard (src/lib/ssrf.ts): https only on 443, no credentials, no internal host names, and no private,
// loopback, link-local, CGNAT, multicast or reserved address, IPv4 or IPv6, including IPv4 inside IPv6.
import { describe, expect, it } from "vitest";
import { checkResolved, checkWebhookUrl, isBlockedAddress } from "../src/lib/ssrf";

describe("addresses", () => {
  it("blocks private and reserved IPv4", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "255.255.255.255", "198.18.0.1", "192.0.2.10"]) {
      expect(isBlockedAddress(ip), ip).toBe(true);
    }
  });
  it("allows public IPv4", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "104.18.0.1"]) expect(isBlockedAddress(ip), ip).toBe(false);
  });
  it("blocks loopback, unique local, link-local, multicast, documentation and IPv4-in-IPv6", () => {
    for (const ip of ["::1", "::", "fc00::1", "fd12:3456::1", "fe80::1", "ff02::1", "2001:db8::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:169.254.169.254", "64:ff9b::a9fe:a9fe", "2002:0a00:0001::1", "[::1]"]) {
      expect(isBlockedAddress(ip), ip).toBe(true);
    }
  });
  it("allows public IPv6 and IPv4-mapped public addresses", () => {
    for (const ip of ["2606:4700:4700::1111", "2a00:1450:4001::200e", "::ffff:8.8.8.8"]) expect(isBlockedAddress(ip), ip).toBe(false);
  });
  it("blocks anything that is not an address", () => {
    expect(isBlockedAddress("example.com")).toBe(true);
    expect(isBlockedAddress("999.1.1.1")).toBe(true);
  });
  it("blocks a host when any resolved address is private", () => {
    expect(checkResolved(["8.8.8.8", "10.0.0.1"]).ok).toBe(false);
    expect(checkResolved([]).ok).toBe(false);
    expect(checkResolved(["8.8.8.8"])).toEqual({ ok: true, address: "8.8.8.8", family: 4 });
  });
});

describe("URLs", () => {
  const prod = { allowDevHttp: false };
  it("takes https on the standard port", () => {
    expect(checkWebhookUrl("https://hooks.example.com/accord?x=1", prod).ok).toBe(true);
    expect(checkWebhookUrl("https://hooks.example.com:443/a", prod).ok).toBe(true);
  });
  it("refuses http, other ports, credentials and internal names", () => {
    for (const u of ["http://hooks.example.com/a", "https://hooks.example.com:8443/a", "https://user:pw@hooks.example.com/", "https://localhost/a",
      "https://metadata.google.internal/", "https://printer.local/", "https://intranet/", "https://127.0.0.1/", "https://[::1]/", "https://169.254.169.254/latest", "ftp://x.example/", "not a url"]) {
      expect(checkWebhookUrl(u, prod).ok, u).toBe(false);
    }
  });
  it("allows http://localhost only with the dev flag", () => {
    expect(checkWebhookUrl("http://localhost:4999/hook", prod).ok).toBe(false);
    expect(checkWebhookUrl("http://localhost:4999/hook", { allowDevHttp: true })).toMatchObject({ ok: true, dev: true });
    expect(checkWebhookUrl("http://127.0.0.1:4999/hook", { allowDevHttp: true })).toMatchObject({ ok: true, dev: true });
    // the flag never opens other private addresses
    expect(checkWebhookUrl("http://10.0.0.5/hook", { allowDevHttp: true }).ok).toBe(false);
  });
});
