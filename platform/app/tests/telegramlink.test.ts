// The Telegram connect link (src/lib/telegramlink.ts): it round-trips the organisation, fits Telegram's start-param
// rules, and refuses a forged, altered, other-key or expired param.
import { describe, expect, it } from "vitest";
import { LINK_TTL_SECS, makeStart, readStart, startParam } from "../src/lib/telegramlink";

const org = "3f2b8c1e-9a4d-4e7f-8b21-0c5d6e7f8a9b";
const key = "k".repeat(64);
const now = 1_794_000_000;

describe("telegram connect link", () => {
  it("round-trips and fits Telegram's limits", () => {
    const p = makeStart(org, key, now);
    expect(p).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
    expect(readStart(p, key, now + 60)).toBe(org);
  });
  it("expires", () => {
    const p = makeStart(org, key, now);
    expect(readStart(p, key, now + LINK_TTL_SECS)).toBe(org);
    expect(readStart(p, key, now + LINK_TTL_SECS + 1)).toBeNull();
  });
  it("refuses another key, an altered organisation or expiry, and junk", () => {
    const p = makeStart(org, key, now);
    expect(readStart(p, "other", now)).toBeNull();
    const flip = (i: number) => p.slice(0, i) + (p[i] === "A" ? "B" : "A") + p.slice(i + 1);
    expect(readStart(flip(3), key, now)).toBeNull();
    expect(readStart(flip(23), key, now)).toBeNull();
    expect(readStart("hello", key, now)).toBeNull();
    expect(() => makeStart("not-a-uuid", key, now)).toThrow();
  });
  it("reads /start messages", () => {
    expect(startParam("/start abc_DEF-1")).toBe("abc_DEF-1");
    expect(startParam("/start@accordguard_bot abc")).toBe("abc");
    expect(startParam("/start")).toBe("");
    expect(startParam("hello")).toBeNull();
    expect(startParam(undefined)).toBeNull();
  });
});
