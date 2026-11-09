"use client";

// A transaction hash as a link to the explorer, everywhere the app shows one. Mono, short, the full hash on hover,
// opens in a new tab; plain text only when no explorer is configured (the local sandbox).

import { useAppConfig } from "@/components/AppConfig";

export function TxLink({ hash, chars = 10, prefix = "tx ", className }: { hash: string; chars?: number; prefix?: string; className?: string }) {
  const { explorer } = useAppConfig();
  const short = `${prefix}${hash.slice(0, chars)}…`;
  if (!explorer) return <span className={className} title={hash}>{short}</span>;
  return (
    <a className={`txlink ${className ?? ""}`} href={`${explorer}/txns/${hash}`} target="_blank" rel="noreferrer" title={hash} aria-label={`Transaction ${hash} on the explorer`}>
      {short} ↗
    </a>
  );
}
