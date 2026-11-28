// The demo counterparty's step limits (src/server/steplimit.ts): one room open at the panel's own poll rate is never
// refused, a refusal says when to ask again, and a refusal by one limit spends nothing from the other.
import { beforeEach, describe, expect, it } from "vitest";
import { POLL_MS } from "../src/components/pollbackoff";
import { STEP_PER_IP_PER_HOUR, STEP_PER_ROOM_PER_MINUTE, takeStep } from "../src/server/steplimit";
import { resetLimits, waitMs } from "../src/server/limiter";

const IP = "40.86.12.41";
const A = "a122.accord-v2.testnet";
const B = "a123.accord-v2.testnet";
const T0 = 1_800_000_000_000;
const HOUR = 3600_000;

beforeEach(() => resetLimits());

describe("demo counterparty step limits", () => {
  it("lets one visitor keep a room open for an hour at the panel's poll, then open a second room", () => {
    // the Demo health run of 28 Nov 2026: a 30-minute attempt in one room, then its retry in another, same runner IP
    let t = T0;
    for (; t < T0 + HOUR; t += POLL_MS) expect(takeStep(IP, A, t)).toBeNull();
    for (let n = 0; n < 225; n++, t += POLL_MS) expect(takeStep(IP, B, t)).toBeNull();
  });

  it("still stops a loop, and says in Retry-After when the window has room again", () => {
    for (let i = 0; i < STEP_PER_ROOM_PER_MINUTE; i++) expect(takeStep(IP, A, T0 + i)).toBeNull();
    const r = takeStep(IP, A, T0 + 1_000);
    expect(r).not.toBeNull();
    // the first call of the minute ages out at T0 + 60 s
    expect(r!.retryAfterS).toBe(59);
    expect(takeStep(IP, A, T0 + 60_000)).toBeNull();
  });

  it("refuses an IP past its hourly budget across rooms, with the wait until its oldest call ages out", () => {
    let t = T0;
    for (let i = 0; i < STEP_PER_IP_PER_HOUR; i++, t += 2_100) expect(takeStep(IP, `a${1000 + (i % 40)}.accord-v2.testnet`, t)).toBeNull();
    const r = takeStep(IP, A, t);
    expect(r).not.toBeNull();
    expect(r!.retryAfterS).toBe(Math.ceil((T0 + HOUR - t) / 1000));
  });

  it("a call the room limit refuses spends nothing from the IP's budget", () => {
    for (let i = 0; i < STEP_PER_ROOM_PER_MINUTE; i++) takeStep(IP, A, T0);
    for (let i = 0; i < 1_000; i++) expect(takeStep(IP, A, T0)).not.toBeNull();
    expect(waitMs({ key: `cp:ip:${IP}`, max: STEP_PER_IP_PER_HOUR, windowMs: HOUR }, T0)).toBe(0);
    expect(takeStep(IP, B, T0)).toBeNull();
  });
});
