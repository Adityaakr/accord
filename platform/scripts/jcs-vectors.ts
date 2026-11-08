// Writes crates/accord-core/tests/jcs_vectors.json from the TypeScript `canonicalize` (RFC 8785). The Rust test
// `jcs_vectors` and the SDK test both reproduce every vector byte for byte.
import { writeFileSync } from "node:fs";
import { jcs, jcsSha256 } from "../packages/sdk/src/hash.ts";

const inputs: Record<string, unknown> = {
  empty_object: {},
  key_order: { b: 1, a: [true, null, "x"], c: { z: 1, y: 2 } },
  escapes: { s: "quote \" backslash \\ newline \n tab \t control \u0001 \u001f slash /" },
  unicode: { "é": "café", "z": "€ 1", "a": "日本", "\u0080": "x", "ẞ": "emoji 🙂" },
  utf16_key_order: { "\u{1F600}": 1, "�": 2, "a": 3 },
  integers: { zero: 0, small: 7, neg: -42, u32: 4294967295, safe: 9007199254740991 },
  amounts_as_strings: { amount: "12000000", big: "340282366920938463463374607431768211455" },
  nested_arrays: [[], [[]], [{ "b": 2, "a": 1 }], "x"],
  params: {
    mode: "demo", timelock_secs: 120, claim_delay_secs: 120, grace_secs: 600, min_acceptance_window_secs: 60,
    max_acceptance_window_secs: 604800, require_two_sided: true, observation_grace_secs: 60, refusal_limit: 5,
    refusal_window_secs: 3600, agent_allowance: "500000000000000000000000",
  },
  terms: {
    v: 1, kind: "market-making", token: "usdc.testnet", decimals: 6, total: "12000000",
    items: [
      { id: 1, amount: "6000000", due_offset_secs: 360, evidence: { PeriodEligible: { period: 0 } } },
      { id: 2, amount: "6000000", due_offset_secs: 720, evidence: { PeriodEligible: { period: 1 } } },
    ],
    acceptance_window_secs: 120, duration_secs: 720,
    params_hash: "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
    doc_hash: "0505050505050505050505050505050505050505050505050505050505050505",
    atlas: {
      retainer_per_period: "6000000", periods: 2, period_secs: 360, slots_per_period: 6, pass_threshold: 4,
      venue: { RheaDcl: { network: "mainnet", contract: "dclv2.ref-labs.near", pool_id: "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1|wrap.near|2000" } },
      max_spread_bps: 60, min_depth_quote: "150000000", depth_band_bps: 200,
    },
  },
  procurement_terms: {
    v: 1, kind: "procurement", token: "usdc.testnet", decimals: 6, total: "36000000",
    items: [1, 2, 3].map((id) => ({ id, amount: "12000000", due_offset_secs: 600 * id, evidence: "DeliveryAccepted" })),
    acceptance_window_secs: 120, duration_secs: 3600,
    params_hash: "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
    doc_hash: "0505050505050505050505050505050505050505050505050505050505050505", atlas: null,
  },
};

const vectors = Object.entries(inputs).map(([name, input]) => ({ name, input, jcs: jcs(input), sha256: jcsSha256(input) }));
writeFileSync(new URL("../crates/accord-core/tests/jcs_vectors.json", import.meta.url), JSON.stringify(vectors, null, 2) + "\n");
console.log(`jcs vectors: ${vectors.length} written`);
