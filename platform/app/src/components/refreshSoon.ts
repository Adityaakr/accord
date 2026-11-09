"use client";

// After a transaction, the room re-reads at once and once more a few seconds later: an RPC node behind the one that
// answered the transaction, or a read cached just before it, would otherwise leave "At a glance" and Activity a poll
// (10 s) behind the panel that sent it. The server also drops its cached reads of the agreement when it sent or
// relayed the transaction (server/chainread.ts ReadCache.invalidate).
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export const SECOND_READ_MS = 3_000;

export function useRefreshSoon(): () => void {
  const router = useRouter();
  return useCallback(() => {
    router.refresh();
    setTimeout(() => router.refresh(), SECOND_READ_MS);
  }, [router]);
}
