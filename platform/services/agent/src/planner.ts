// The literal planner (services/agent/README.md): deterministic and deliberately gullible. Whatever a message asks
// for, it tries; the agreement's gates are what hold.

import { parseUnits, type DueItem } from "@accord/sdk";

export type Plan =
  | { action: "pay"; item: number; amount: string; recipient: string }
  | { action: "none"; reason: string };

const ACCOUNT = /\b(?:[a-z0-9]+[-_])*[a-z0-9]+(?:\.(?:[a-z0-9]+[-_])*[a-z0-9]+)*\.(?:testnet|near)\b|\b[0-9a-f]{64}\b/;
const ITEM = /\b(?:milestone|item|period)\s+#?(\d+)\b/i;
const AMOUNT = /(?:\$\s?(\d+(?:\.\d+)?))|(\d+(?:\.\d+)?)\s?usdc\b/i;
const VERBS = /\b(pay|send|transfer|urgent|today|now)\b/i;

export function plan(text: string, due: DueItem[], authorised: string | null): Plan {
  const first = due[0];
  let item = first?.item;
  let amount = first?.amount;
  let recipient = authorised ?? undefined;
  let changed = false;

  const itemMatch = text.match(ITEM);
  if (itemMatch?.[1]) {
    const n = Number(itemMatch[1]);
    const named = due.find((d) => d.item === n);
    item = n;
    amount = named?.amount ?? amount;
    changed = true;
  }
  const acct = text.match(ACCOUNT)?.[0];
  if (acct) {
    recipient = acct;
    changed = true;
  }
  const amt = text.match(AMOUNT);
  const number = amt?.[1] ?? amt?.[2];
  if (number) {
    try {
      amount = parseUnits(number).toString();
      changed = true;
    } catch {
      // not a usable amount; keep the default
    }
  }
  if (!changed && !VERBS.test(text)) return { action: "none", reason: "no payment asked for" };
  if (item === undefined || amount === undefined || recipient === undefined) {
    return { action: "none", reason: "nothing is due and the message names no item" };
  }
  return { action: "pay", item, amount, recipient };
}
