// The fictional sample mandates in fixtures/companies (Northwind buys, Halcyon sells). They are public examples a
// party starts from in the editor; a real mandate is written and sealed in the browser and never sent here.

import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Mandate } from "@accord/sdk";

export interface Preset {
  id: string;
  company: string;
  label: string;
  mandate: Mandate;
}

const LABELS: Record<string, string> = {
  "procurement": "Procurement",
  "market-making": "Market making",
  "market-making.strict": "Market making, stricter spread",
  "try": "The /try room",
  "usdc-procurement": "Procurement, Circle USDC (within 20)",
};

/** The presets sized for a Circle USDC room (`usdc-*.json`): ceilings that fit one faucet drip of about 20 USDC. */
export function isCirclePreset(id: string): boolean {
  return /\/usdc-[^/]*$/.test(id);
}

export function presets(): Preset[] {
  const root = path.resolve(process.cwd(), "../fixtures/companies");
  const out: Preset[] = [];
  for (const company of ["northwind", "halcyon"]) {
    let files: string[] = [];
    try { files = readdirSync(path.join(root, company)); } catch { continue; }
    for (const f of files.filter((x) => x.endsWith(".json") && x !== "accord.json").sort()) {
      const mandate = JSON.parse(readFileSync(path.join(root, company, f), "utf8")) as Mandate;
      const key = f.replace(/\.(buyer|vendor)/, "").replace(/\.json$/, "");
      out.push({
        id: `${company}/${f}`,
        company: company === "northwind" ? "Northwind Foundation" : "Halcyon Markets",
        label: LABELS[key] ?? key,
        mandate,
      });
    }
  }
  return out;
}
