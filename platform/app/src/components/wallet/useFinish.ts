"use client";

// One click to end a wallet-free visit: close the room, return its NEAR, delete the throwaway account into the faucet,
// then sign out of the throwaway key. Used by try-it's Finish step and by Reset.
import { useCallback, useEffect, useState } from "react";
import { useAppConfig } from "../AppConfig";
import { errorText } from "../me/client";
import { finishVisit } from "./finishClient";
import { isThrowawaySigner } from "./throwaway";
import { useWallet } from "./WalletProvider";

/** The last room a Finish in this tab closed, kept for the tab (sessionStorage) so it outlives the reset. */
export const LAST_ROOM_KEY = "accord-try-it-last-room";

export interface FinishState {
  running: boolean;
  progress: string | null;
  error: string | null;
  /** The DeleteAccount transaction that returned the NEAR to the faucet, once done. */
  deleteTx: string | null;
  /** The ft_transfer that returned the test USDC, when there was any. */
  tokenTx: string | null;
  /** The last room Finish closed in this tab, so its id stays at hand for Verify after the reset. */
  lastRoom: string | null;
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
  const [tokenTx, setTokenTx] = useState<string | null>(null);
  const [lastRoom, setLastRoom] = useState<string | null>(null);
  useEffect(() => { try { setLastRoom(sessionStorage.getItem(LAST_ROOM_KEY)); } catch { /* no storage */ } }, []);
  const signer = w.method === "throwaway" && isThrowawaySigner(w.signer) ? w.signer : null;
  const available = !!signer && !!cfg.faucetAccount;

  const run = useCallback(async () => {
    if (!signer) return false;
    setRunning(true); setError(null); setProgress(null);
    try {
      const r = await finishVisit(cfg, signer, setProgress);
      if (r) { setDeleteTx(r.deleteTx); setTokenTx(r.tokenTx); }
      const closed = r?.rooms.at(-1);
      if (closed) {
        setLastRoom(closed);
        try { sessionStorage.setItem(LAST_ROOM_KEY, closed); } catch { /* no storage */ }
      }
      try { localStorage.removeItem(`accord-try-it-room:${signer.accountId}`); } catch { /* no storage */ }
      setProgress(!r ? "Done. This key was never funded, so there was nothing to return."
        : r.rooms.length ? (r.tokenTx ? "Done. The room is closed and its test NEAR and test USDC are back with the faucet." : "Done. The room is closed and its test NEAR is back with the faucet.")
        : r.tokenTx ? "Done. The test NEAR and test USDC are back with the faucet." : "Done. The test NEAR is back with the faucet.");
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

  return { running, progress, error, deleteTx, tokenTx, lastRoom, available, run };
}
