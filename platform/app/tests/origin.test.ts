// The app runs behind the website proxy, and Railway's edge rewrites x-forwarded-host to the app's own host. These
// cases are the production shape: a visitor on the website, a write that reaches the app with the edge's headers.
import { describe, expect, it } from "vitest";
import { fromThisSite } from "../src/server/origin";

const APP = "accord-production-f43e.up.railway.app";
const SITE = "accordweb-production.up.railway.app";

function req(headers: Record<string, string>): Request {
  return new Request(`https://${APP}/app/api/faucet`, { method: "POST", headers });
}

describe("fromThisSite", () => {
  it("accepts a visitor on the website after the edge rewrote x-forwarded-host", () => {
    expect(fromThisSite(req({ origin: `https://${SITE}`, host: APP, "x-forwarded-host": APP, "x-accord-site-host": SITE }))).toBe(true);
  });
  it("accepts the website's public host even if the site header is missing", () => {
    expect(fromThisSite(req({ origin: `https://${SITE}`, host: APP, "x-forwarded-host": APP }))).toBe(true);
  });
  it("accepts the app's own origin", () => {
    expect(fromThisSite(req({ origin: `https://${APP}`, host: APP }))).toBe(true);
  });
  it("accepts a request with no Origin", () => {
    expect(fromThisSite(req({ host: APP }))).toBe(true);
  });
  it("refuses another site", () => {
    expect(fromThisSite(req({ origin: "https://evil.example", host: APP, "x-forwarded-host": APP, "x-accord-site-host": SITE }))).toBe(false);
  });
  it("refuses a look-alike host", () => {
    expect(fromThisSite(req({ origin: `https://${SITE}.evil.example`, host: APP }))).toBe(false);
  });
  it("refuses a malformed Origin", () => {
    expect(fromThisSite(req({ origin: "not a url", host: APP }))).toBe(false);
  });
});
