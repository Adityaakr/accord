// The working brief a buyer fills in while opening a deal room. None of it is sent to the factory: `create_agreement`
// takes only the type, title, vendor, settlement authority, canaries and timings. The brief stays in this browser
// (localStorage, `accord-brief:<room>`) and is shown back to the buyer on the room's invite card and when they seal
// their limits; the figures under "Sealed limits" are the ones the buyer then enters as sealed limits.

import type { Kind } from "@accord/sdk";

export interface Milestone { name: string; deliverable: string }

export interface Intake {
  reference: string;
  buyerCompany: string;
  vendorCompany: string;
  // procurement
  milestones: Milestone[];
  ceiling: string;
  target: string;
  termWeeks: string;
  reviewDays: string;
  // market making
  pair: string;
  retainer: string;
  periods: string;
  spreadBps: string;
  depth: string;
  bandBps: string;
  slots: string;
  threshold: string;
}

/** What the browser keeps for a room, read back by the invite card and the seal page. `brief` and `domain` predate `intake`. */
export interface StoredBrief { brief: string; domain: string; kind?: Kind; symbol?: string; intake?: Intake }

export const MAX_MILESTONES = 6;

export const EMPTY_INTAKE: Intake = {
  reference: "", buyerCompany: "", vendorCompany: "",
  milestones: [{ name: "", deliverable: "" }], ceiling: "", target: "", termWeeks: "", reviewDays: "",
  pair: "", retainer: "", periods: "", spreadBps: "", depth: "", bandBps: "", slots: "", threshold: "",
};

/** The fictional sample companies' brief (fixtures/companies/northwind), sized for the faucet's test funds. */
export function sampleBrief(kind: Kind, circle: boolean): { title: string; brief: string; intake: Partial<Intake> } {
  if (kind === "market-making") {
    return {
      title: "NEAR/USDC liquidity retainer, Q1",
      brief: "Retain a desk to keep NEAR/USDC liquid on the Rhea pool: quotes on both sides, spread within 200 bps, depth within 2% of mid. Pay a period only when the readings met the terms. Never pay an account the desk has not proven.",
      intake: {
        pair: "NEAR/USDC", retainer: circle ? "4" : "8", periods: "4", spreadBps: "200",
        depth: "20", slots: "6", threshold: "4",
      },
    };
  }
  return {
    title: "Treasury reporting integration, phase one",
    brief: "Integrate liquidity reporting into our treasury dashboard: a data pipeline from the venue, a reporting dashboard, and a handover with documentation. Delivery dates matter more than the last few dollars; walk away rather than exceed the ceiling.",
    intake: {
      milestones: [
        { name: "Data pipeline", deliverable: "Hourly pool snapshots written to the treasury database, with tests" },
        { name: "Dashboard", deliverable: "Spread, depth and volume panels for NEAR/USDC, refreshed hourly" },
        { name: "Handover", deliverable: "Runbook, access transfer and a one-hour walkthrough" },
      ],
      ceiling: circle ? "18" : "40", target: circle ? "15" : "32", termWeeks: "4", reviewDays: "2",
    },
  };
}

const AMOUNT = /^\d{1,12}(\.\d{1,6})?$/;
const WHOLE = /^\d{1,9}$/;

function amount(v: string): number | null { return AMOUNT.test(v.trim()) ? Number(v.trim()) : null; }
function whole(v: string): number | null { return WHOLE.test(v.trim()) ? Number(v.trim()) : null; }

/** Field errors for the brief step, keyed by field. Only the title is required; a figure, once typed, must make sense. */
export function briefErrors(kind: Kind, title: string, i: Intake): Record<string, string> {
  const e: Record<string, string> = {};
  if (title.trim().length < 3) e.title = "Use at least 3 characters.";
  const money = (k: keyof Intake, label: string) => {
    const v = String(i[k]).trim();
    if (!v) return null;
    const n = amount(v);
    if (n === null || n <= 0) { e[k] = "An amount above 0, up to 6 decimals."; return null; }
    return n;
  };
  const count = (k: keyof Intake, label: string, min: number, max: number) => {
    const v = String(i[k]).trim();
    if (!v) return null;
    const n = whole(v);
    if (n === null || n < min || n > max) { e[k] = `A whole number from ${min} to ${max}.`; return null; }
    return n;
  };
  if (kind === "procurement") {
    const ceiling = money("ceiling", "The budget ceiling");
    const target = money("target", "The target price");
    if (ceiling !== null && target !== null && target > ceiling) e.target = "The target cannot be above the ceiling.";
    count("termWeeks", "The term", 1, 104);
    count("reviewDays", "The review window", 1, 7);
    i.milestones.forEach((m, n) => {
      if (!m.name.trim() && m.deliverable.trim()) e[`milestone${n}`] = "Name this milestone.";
    });
  } else {
    money("retainer", "The retainer");
    money("depth", "The depth");
    count("periods", "The number of periods", 1, 52);
    count("spreadBps", "The spread", 1, 10_000);
    count("bandBps", "The depth band", 1, 10_000);
    const slots = count("slots", "Readings per period", 1, 48);
    const threshold = count("threshold", "Readings that must pass", 1, 48);
    if (slots !== null && threshold !== null && threshold > slots) e.threshold = "No more than the readings per period.";
    if (i.pair.trim() && !/^[A-Za-z0-9.]{1,12}\/[A-Za-z0-9.]{1,12}$/.test(i.pair.trim())) e.pair = "Write it as TOKEN/QUOTE, such as NEAR/USDC.";
  }
  return e;
}

/** The filled milestones only. */
export function milestones(i: Intake): Milestone[] {
  return i.milestones.filter((m) => m.name.trim()).map((m) => ({ name: m.name.trim(), deliverable: m.deliverable.trim() }));
}

/** The brief as one line per figure, for the summary, the invite card and the seal page. Empty figures are left out. */
export function briefFacts(kind: Kind, i: Intake, symbol: string): { label: string; value: string; sealAs?: string }[] {
  const out: { label: string; value: string; sealAs?: string }[] = [];
  const add = (label: string, v: string, value: string, sealAs?: string) => { if (v.trim()) out.push({ label, value, sealAs }); };
  if (kind === "procurement") {
    const ms = milestones(i);
    if (ms.length) out.push({ label: "Milestones", value: ms.map((m) => m.name).join(" · "), sealAs: "max_items" });
    add("Budget ceiling", i.ceiling, `${i.ceiling.trim()} ${symbol}`, "max_total");
    add("Target price", i.target, `${i.target.trim()} ${symbol}`, "target_total");
    add("Term", i.termWeeks, `${i.termWeeks.trim()} ${i.termWeeks.trim() === "1" ? "week" : "weeks"}`, "max_duration_secs");
    add("Review window", i.reviewDays, `${i.reviewDays.trim()} ${i.reviewDays.trim() === "1" ? "day" : "days"} per delivery`, "min_acceptance_window_secs");
  } else {
    add("Pair", i.pair, i.pair.trim().toUpperCase());
    add("Retainer", i.retainer, `${i.retainer.trim()} ${symbol} per period`, "max_retainer_per_period");
    add("Periods", i.periods, i.periods.trim(), "periods");
    add("Widest spread", i.spreadBps, `${i.spreadBps.trim()} bps`, "max_spread_bps");
    add("Depth each side", i.depth, `${i.depth.trim()} ${symbol}${i.bandBps.trim() ? ` within ${i.bandBps.trim()} bps` : ""}`, "min_depth_quote");
    if (i.threshold.trim() || i.slots.trim()) {
      out.push({ label: "Uptime", value: `${i.threshold.trim() || "?"} of ${i.slots.trim() || "?"} readings pass`, sealAs: "min_threshold" });
    }
  }
  return out;
}

/** Reads what this browser kept for a room; null when nothing was kept or storage is unavailable. */
export function readStoredBrief(room: string): StoredBrief | null {
  try {
    const v = JSON.parse(localStorage.getItem(`accord-brief:${room}`) ?? "null") as StoredBrief | null;
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;
  }
}
