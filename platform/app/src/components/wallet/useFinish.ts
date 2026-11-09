"use client";

// One click to end a wallet-free visit: close the room, return its NEAR, delete the throwaway account into the faucet,
// then sign out of the throwaway key. Used by try-it's Finish step and by Reset.
import { useCallback, useState } from "react";
import { useAppConfig } from "../AppConfig";
import { errorText } from "../me/client";
import { finishVisit } from "./finishClient";
import { isThrowawaySigner } from "./throwaway";
import { useWallet } from "./WalletProvider";

export interface FinishState {
  running: boolean;
  progress: string | null;
  error: string | null;
  /** The DeleteAccount transaction that returned the NEAR to the faucet, once done. */
  deleteTx: string | null;
  /** True when this server can take the NEAR back (a throwaway key and a faucet to return it to). */
  available: boolean;
  run(): Promise<boolean>;
}

export function useFinish(onDone?: () => void): FinishState {
  const w = useWallet();
  const cfg = useAppConfig();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteTx, setDeleteTx] = useState<string | null>(null);
  const signer = w.method === "throwaway" && isThrowawaySigner(w.signer) ? w.signer : null;
  const available = !!signer && !!cfg.faucetAccount;

  const run = useCallback(async () => {
    if (!signer) return false;
    setRunning(true); setError(null); setProgress(null);
    try {
      const r = await finishVisit(cfg, signer, setProgress);
      if (r) setDeleteTx(r.deleteTx);
      try { localStorage.removeItem(`accord-try-it-room:${signer.accountId}`); } catch { /* no storage */ }
      setProgress(!r ? "Done. This key was never funded, so there was nothing to return."
        : r.rooms.length ? "Done. The room is closed and its test NEAR is back with the faucet."
        : "Done. The test NEAR is back with the faucet.");
      await w.disconnect();
      onDone?.();
      return true;
    } catch (e) {
      setError(errorText(e));
      return false;
    } finally {
      setRunning(false);
    }
  }, [signer, cfg, w, onDone]);

  return { running, progress, error, deleteTx, available, run };
}
