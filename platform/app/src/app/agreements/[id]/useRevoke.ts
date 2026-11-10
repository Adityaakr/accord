"use client";

// The buyer's revoke, shared by the room header and the incident panel: the key is read back from chain first (so a
// stale page never revokes a key that is no longer there), then `revoke_agent` is signed in the buyer's own wallet.

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useRefreshSoon } from "@/components/refreshSoon";
import { useWallet } from "@/components/wallet/WalletProvider";
import { useAppConfig } from "@/components/AppConfig";
import { agreementClient, errorText, readBack } from "@/components/me/client";

export function useRevoke(room: string, agentKey: string | null) {
  const w = useWallet();
  const cfg = useAppConfig();
  const router = useRouter();
  const refreshSoon = useRefreshSoon();
  const [revoked, setRevoked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const revoke = useCallback(async () => {
    if (!w.signer) return;
    setError(null);
    try {
      const rb = await readBack(cfg, room, { kind: "revoke", key: agentKey });
      if (rb.stale) { setError(`${rb.stale} Nothing was signed.`); router.refresh(); return; }
      const tx = await agreementClient(w.signer, cfg, room).revokeAgent();
      setRevoked(tx.txHash);
      refreshSoon();
    } catch (e) {
      setError(errorText(e));
    }
  }, [w.signer, cfg, room, agentKey, router, refreshSoon]);
  return { revoke, revoked, error, setError };
}
