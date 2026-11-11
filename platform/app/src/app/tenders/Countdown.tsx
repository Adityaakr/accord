"use client";

// Time left in a tender window, ticking each second. The server's clock at render time anchors it, so a visitor
// whose clock is off still sees the board's time; the first render matches the server's HTML.
import { useEffect, useState } from "react";

function fmt(s: number): string {
  if (s <= 0) return "0 s";
  const d = Math.floor(s / 86_400), h = Math.floor((s % 86_400) / 3_600), m = Math.floor((s % 3_600) / 60), r = s % 60;
  if (d > 0) return `${d} d ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return `${m} min ${String(r).padStart(2, "0")} s`;
  return `${r} s`;
}

export function Countdown({ endNs, serverNow, className, ended = "window closed" }: {
  /** the window's end, ns since epoch */
  endNs: number;
  /** Date.now() on the server when the page was read */
  serverNow: number;
  className?: string;
  ended?: string;
}) {
  const left = (now: number) => Math.max(0, Math.ceil((endNs / 1e6 - now) / 1000));
  const [secs, setSecs] = useState(() => left(serverNow));
  useEffect(() => {
    const skew = serverNow - Date.now();
    const tick = () => setSecs(Math.max(0, Math.ceil((endNs / 1e6 - (Date.now() + skew)) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endNs, serverNow]);
  return (
    <span className={`num ${className ?? ""}`} role="timer" aria-atomic="true">
      {secs > 0 ? `${fmt(secs)} left` : ended}
    </span>
  );
}
