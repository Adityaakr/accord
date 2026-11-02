"use client";

import { useEffect, useState } from "react";

/** "testnet · block 123 · 4 s ago": every live panel says where its numbers came from and how old they are. */
export function SourceLine({ label, block, at }: { label: string; block: number; at: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const secs = Math.max(0, Math.round((now - at) / 1000));
  const age = secs < 90 ? `${secs} s ago` : secs < 5400 ? `${Math.round(secs / 60)} min ago` : `${Math.round(secs / 3600)} h ago`;
  return (
    <span className="small mono" title={`Read at block ${block}`}>
      {label} · block {block.toLocaleString("en-US")} · {age}
    </span>
  );
}
