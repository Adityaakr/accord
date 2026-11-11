// Small shared helpers for the open tender pages: labels, tones and the token's symbol.
import type { TenderJob, TenderPhase } from "@accord/sdk";
import type { Tone } from "@/components/ui";

export const PHASE_TONE: Record<TenderPhase, Tone> = {
  open: "teal", revealing: "purple", closed: "warn", awarded: "teal", linked: "teal", no_valid_bid: "muted", cancelled: "muted",
};

export const PHASE_NOTE: Record<TenderPhase, string> = {
  open: "taking sealed bids",
  revealing: "bidders are revealing their prices",
  closed: "reveal window closed, award not yet asked for",
  awarded: "winner chosen, agreement not yet linked",
  linked: "the winner's agreement is linked",
  no_valid_bid: "no revealed price within the budget",
  cancelled: "cancelled by the buyer",
};

/** The job's token as a symbol: the test token says tUSDC, anything else USDC. */
export const symbolOf = (token: string): string => (token.startsWith("tusdc.") ? "tUSDC" : "USDC");

/** A 64-hex id (bidder key, commitment, hash) shortened to its ends. */
export const shortHex = (h: string, n = 6): string => (h.length > n + 6 ? `${h.slice(0, n)}…${h.slice(-4)}` : h);

/** The end of the window that is running now (ns since epoch), or null when no window runs. */
export function windowEnd(j: TenderJob): number | null {
  return j.phase === "open" ? j.commit_ends : j.phase === "revealing" ? j.reveal_ends : null;
}

/** Whether a price (base units) is within the job's budget. */
export const withinBudget = (price: string, budget: string): boolean => BigInt(price) <= BigInt(budget);

export const cliBid = (job: number | string): string => `npx @accord/cli tender bid ${job} --price 36.50 --agent my-agent`;
export const README_TENDERS = "https://github.com/Adityaakr/accord#open-tenders";
