// The demo agent's allowances (src/server/agentlimit.ts): the agent paying on its own never uses up the buyer's own
// clicks, a tick that sends nothing counts against nothing, one payment per item whoever asks, and a refusal by one
// allowance never spends another.
import { beforeEach, describe, expect, it } from "vitest";
import { AUTO_PER_HOUR, EXPLICIT_PER_HOUR, TICKS_PER_MINUTE, allowTick, explicitLeft, spendAgentAction } from "../src/server/agentlimit";
import { resetLimits, takeAll } from "../src/server/limiter";

const A = "a40.accord-v2.testnet";
const T0 = 1_800_000_000_000;

beforeEach(() => resetLimits());

describe("agent allowances", () => {
  it("the buyer can still ask the agent to pay a new account after it auto-paid every item and was ticked often", () => {
    for (let i = 0; i < 500; i++) expect(allowTick(A, T0 + i * 1_001)).toBe(true); // a tick a second, nothing sent
    for (let item = 1; item <= 6; item++) expect(spendAgentAction({ kind: "auto", agreement: A, item }, T0)).toBeNull();
    expect(explicitLeft(A, T0)).toBe(EXPLICIT_PER_HOUR);
    expect(spendAgentAction({ kind: "attack", agreement: A }, T0)).toBeNull();
  });

  it("the buyer's pay and attack share their own allowance of 12 an hour", () => {
    for (let i = 0; i < EXPLICIT_PER_HOUR; i++) expect(spendAgentAction({ kind: "attack", agreement: A }, T0)).toBeNull();
    expect(spendAgentAction({ kind: "attack", agreement: A }, T0)).toMatchObject({ status: 429 });
    expect(spendAgentAction({ kind: "pay", agreement: A, item: 1 }, T0)).toMatchObject({ status: 429 });
    // ...which does not stop the agent's own payment of the item the refused click wanted
    expect(spendAgentAction({ kind: "auto", agreement: A, item: 1 }, T0)).toBeNull();
    // an hour later the buyer has the full allowance again
    expect(spendAgentAction({ kind: "attack", agreement: A }, T0 + 3600_001)).toBeNull();
  });

  it("each item is paid once from this server, whether the agent or the buyer asked first", () => {
    expect(spendAgentAction({ kind: "auto", agreement: A, item: 2 }, T0)).toBeNull();
    expect(spendAgentAction({ kind: "auto", agreement: A, item: 2 }, T0)).toMatchObject({ status: 409, error: expect.stringContaining("item 2") });
    expect(spendAgentAction({ kind: "pay", agreement: A, item: 2 }, T0)).toMatchObject({ status: 409 });
    expect(spendAgentAction({ kind: "pay", agreement: A, item: 3 }, T0)).toBeNull();
    expect(spendAgentAction({ kind: "auto", agreement: A, item: 3 }, T0)).toMatchObject({ status: 409 });
  });

  it("a refused pay of an already-paid item does not spend the buyer's allowance", () => {
    expect(spendAgentAction({ kind: "auto", agreement: A, item: 1 }, T0)).toBeNull();
    for (let i = 0; i < 20; i++) expect(spendAgentAction({ kind: "pay", agreement: A, item: 1 }, T0)).toMatchObject({ status: 409 });
    expect(explicitLeft(A, T0)).toBe(EXPLICIT_PER_HOUR);
  });

  it("auto-pay has its own, higher hourly allowance", () => {
    expect(AUTO_PER_HOUR).toBeGreaterThan(EXPLICIT_PER_HOUR);
    for (let item = 0; item < AUTO_PER_HOUR; item++) expect(spendAgentAction({ kind: "auto", agreement: A, item }, T0)).toBeNull();
    expect(spendAgentAction({ kind: "auto", agreement: A, item: 999 }, T0)).toMatchObject({ status: 429 });
    // the refusal did not take item 999's one payment
    expect(spendAgentAction({ kind: "pay", agreement: A, item: 999 }, T0)).toBeNull();
  });

  it("rooms are counted apart", () => {
    for (let i = 0; i < EXPLICIT_PER_HOUR; i++) spendAgentAction({ kind: "attack", agreement: A }, T0);
    expect(spendAgentAction({ kind: "attack", agreement: "a41.accord-v2.testnet" }, T0)).toBeNull();
  });

  it("ticks only have a loose per-minute read limit", () => {
    for (let i = 0; i < TICKS_PER_MINUTE; i++) expect(allowTick(A, T0)).toBe(true);
    expect(allowTick(A, T0)).toBe(false);
    expect(allowTick(A, T0 + 60_001)).toBe(true);
    expect(explicitLeft(A, T0)).toBe(EXPLICIT_PER_HOUR);
  });
});

describe("takeAll", () => {
  it("counts in every limit or in none", () => {
    const a = { key: "x", max: 1, windowMs: 1000 }, b = { key: "y", max: 2, windowMs: 1000 };
    expect(takeAll([a, b], T0)).toBeNull();
    expect(takeAll([a, b], T0)).toBe(a);
    expect(takeAll([b], T0)).toBeNull(); // b counted once above, not twice
    expect(takeAll([b], T0)).toBe(b);
  });
});
