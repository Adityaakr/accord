"use client";

// One line on Try it, before the visitor starts: how OutLayer's enclave queue looks right now, read live from its
// contract. It says what was measured (requests unanswered for longer than the Sealed Table can spare), never an
// estimate it cannot back, and "could not be read" when the read failed.

import { useEffect, useState } from "react";
import { SLOW_AFTER_SECS, type TableQueue } from "@accord/sdk";
import { onVisibleInterval } from "./visible";
import styles from "./TableNotice.module.css";

export interface QueueReading { queue: TableQueue; at: number }

const POLL_MS = 30_000;

export function TableQueueLine({ initial }: { initial: QueueReading | null }) {
  const [reading, setReading] = useState(initial);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const load = () => fetch("/api/table-queue").then((r) => r.json()).then((j: { reading: QueueReading | null }) => setReading(j.reading)).catch(() => setReading(null));
    const stop = onVisibleInterval(load, POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { stop(); clearInterval(tick); };
  }, []);

  if (!reading) {
    return <p className="small" role="status">OutLayer&apos;s queue could not be read just now, so there is no reading to show. The negotiation usually takes about a minute, and it is held, not started, while the queue is slow.</p>;
  }
  const q = reading.queue;
  const age = <span className="mono" suppressHydrationWarning>{Math.max(0, Math.round((now - reading.at) / 1000))} s</span>;
  const over = <span className="mono">{SLOW_AFTER_SECS} s</span>;
  if (q.slow) {
    return (
      <aside className={styles.notice} role="status">
        <p>
          <strong>OutLayer&apos;s enclave worker is behind right now.</strong>{" "}
          <span className="mono">{q.waiting}</span> of its <span className="mono">{q.pending}</span> unanswered requests have waited over {over}
          {q.oldestSecs !== null ? <> (oldest <span className="mono">{q.oldestSecs} s</span>)</> : null}. You can still open a room and seal your limits. The
          negotiation is then held, not started, until the queue clears, for <span className="mono">15</span> minutes at most, so an attempt is not
          wasted; while the worker stays behind it can still end as <span className="mono">No deal</span>. Read {age} ago.
        </p>
      </aside>
    );
  }
  return (
    <p className="small" role="status">
      Sealed Table queue on OutLayer now: <span className="mono">{q.pending}</span> unanswered {q.pending === 1 ? "request" : "requests"},{" "}
      <span className="mono">{q.waiting}</span> waiting over {over}. A negotiation should start straight away and usually takes about a minute. Read {age} ago.
    </p>
  );
}
