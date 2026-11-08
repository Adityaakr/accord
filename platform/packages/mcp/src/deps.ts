// The real dependencies: the SDK over RPC; the agent and principal signers only when their variables are set.

import { Accord, KeySigner, preflight, verify, type Network } from "@accord/sdk";
import type { McpDeps } from "./tools.js";
import type { Env } from "./env.js";

function signer(accountId: string, secret: string, accord: Accord, what: string): KeySigner {
  try {
    return new KeySigner(accountId, secret, accord.chain);
  } catch {
    throw new Error(`${what} could not be read as an ed25519 key`);
  }
}

export function realDeps(env: Env): McpDeps {
  const network = (env.NEAR_NETWORK || "testnet") as Network;
  const factory = env.ACCORD_FACTORY;
  if (!factory) throw new Error("ACCORD_FACTORY is not set");
  const accord = new Accord({ network, factory, rpc: env.NEAR_RPC_URL || undefined });
  // An optional second factory that settles in Circle USDC; its agreements are listed and verified too.
  const second = env.ACCORD_FACTORY_USDC && env.ACCORD_FACTORY_USDC !== factory ? env.ACCORD_FACTORY_USDC : "";
  const deps: McpDeps = {
    listAgreements: async (party) => [
      ...(await accord.listAgreements({ party })),
      ...(second ? await accord.onFactory(second).listAgreements({ party }) : []),
    ],
    agreement: (id) => accord.agreement(id),
    preflight: (agreement, recipient) => preflight(accord, agreement, recipient, {
      archivalRpc: env.NEAR_ARCHIVAL_RPC_URL || undefined,
      approvalsUrl: env.ACCORD_APPROVALS_URL || undefined,
    }),
    verify: (agreement) => verify(accord, agreement, { nearAiKey: env.NEARAI_API_KEY || undefined, factories: [second] }),
  };
  if (env.ACCORD_AGENT_KEY && env.AGENT_AGREEMENT) {
    if (network === "mainnet") throw new Error("the agent signs on testnet only");
    const agreement = env.AGENT_AGREEMENT;
    const s = signer(agreement, env.ACCORD_AGENT_KEY, accord, "ACCORD_AGENT_KEY");
    const deal = accord.withSigner(s).agreement(agreement);
    deps.agent = {
      agreement,
      publicKey: s.publicKey,
      pay: (p) => deal.pay(p),
      requestException: (e) => deal.agentRequestException(e),
    };
  }
  if (env.ACCORD_PRINCIPAL_KEY && env.ACCORD_PRINCIPAL_ACCOUNT) {
    if (network === "mainnet") throw new Error("principal tools sign on testnet only");
    const s = signer(env.ACCORD_PRINCIPAL_ACCOUNT, env.ACCORD_PRINCIPAL_KEY, accord, "ACCORD_PRINCIPAL_KEY");
    const p = accord.withSigner(s);
    deps.principal = {
      account: s.accountId,
      sealMandate: (agreement, mandate, role) => p.agreement(agreement).sealMandate(mandate, { role }),
      approveTerms: (agreement, hash) => p.agreement(agreement).approveTerms(hash),
      submitDelivery: (agreement, item, evidence, uri) => p.agreement(agreement).submitDelivery(item, evidence, uri),
      proposeRecipient: (agreement, account, domain) => p.agreement(agreement).proposeRecipient(account, domain),
    };
  }
  return deps;
}
