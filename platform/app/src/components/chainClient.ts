// The browser's Accord client: it reads through the app's own server (/api/chain, a short cache in front of the
// server's RPC endpoints) and never calls a public NEAR RPC for reads. Signing is unchanged: the wallet or Accord's
// relayer sends, and the throwaway key submits its own transactions over the public endpoints (./wallet/throwaway).
// During a server render there is no window, so a client built then reads the configured RPC directly.
import { Accord, type Signer } from "@accord/sdk";
import { withBase } from "@/lib/basePath";
import type { PublicConfig } from "./AppConfig";

/** The read proxy's absolute URL in a browser; null on the server. */
export function readProxyUrl(): string | null {
  if (typeof window === "undefined") return null;
  return `${window.location.origin}${withBase("/api/chain")}`;
}

/** An Accord client for this browser: reads through /api/chain, calls through `signer` when given. */
export function browserAccord(cfg: PublicConfig, opts: { factory?: string; signer?: Signer } = {}): Accord {
  const proxy = readProxyUrl();
  return new Accord({
    network: cfg.network === "sandbox" ? "sandbox" : "testnet",
    factory: opts.factory ?? cfg.factory,
    rpc: proxy ?? cfg.rpc,
    rpcFallbacks: proxy ? false : undefined,
    signer: opts.signer,
  });
}
