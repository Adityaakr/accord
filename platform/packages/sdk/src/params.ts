// The two timing presets an agreement is created with (ARCHITECTURE.md section 4). The factory enforces the live
// minimums; demo timings exist so a whole loop fits in a few minutes on testnet or a local node.

import type { Params } from "./types.js";

/** The default agent key allowance: 0.5 NEAR in yoctoNEAR. */
export const DEFAULT_AGENT_ALLOWANCE = "500000000000000000000000";

export const DEMO_PARAMS: Params = {
  mode: "demo", timelock_secs: 120, claim_delay_secs: 120, grace_secs: 600, min_acceptance_window_secs: 60,
  max_acceptance_window_secs: 604800, require_two_sided: true, observation_grace_secs: 60, refusal_limit: 5,
  refusal_window_secs: 3600, agent_allowance: DEFAULT_AGENT_ALLOWANCE,
};

export const LIVE_PARAMS: Params = {
  ...DEMO_PARAMS, mode: "live", timelock_secs: 86400, claim_delay_secs: 259200, grace_secs: 345600,
  observation_grace_secs: 600,
};
