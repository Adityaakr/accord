"use client";

// One line on Try it, before the visitor starts: how OutLayer's enclave queue looks right now, read live from its
// contract. It says what was measured (whether the newest requests are being answered), never an
// estimate it cannot back, and "could not be read" when the read failed.

import { useEffect, useState } from "react";
import { YIELD_SECS, type TableQueue } from "@accord/sdk";
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
  if (q.slow) {
    return (
      <aside className={styles.notice} role="status">
        <p>
          <strong>OutLayer&apos;s enclave worker is behind right now.</strong>{" "}
          None of its newest <span className="mono">{q.unanswered}</span> requests is answered, and the oldest of them was made{" "}
          <span className="mono">{q.sinceSecs} s</span> ago; a negotiation has about <span className="mono">{YIELD_SECS} s</span> in all. You can still open a
          room and seal your limits. The negotiation is then held, not started, until the queue clears, for <span className="mono">15</span> minutes at
          most, so an attempt is not wasted; while the worker stays behind it can still end as <span className="mono">No deal</span>. Read {age} ago.
        </p>
      </aside>
    );
  }
  return (
    <p className="small" role="status">
      Sealed Table queue on OutLayer now: {q.unanswered === 0 ? "nothing is waiting" : <>its newest <span className="mono">{q.unanswered}</span> {q.unanswered === 1 ? "request has" : "requests have"} waited at most <span className="mono">{q.sinceSecs} s</span></>}.
      A negotiation should start straight away and usually takes about a minute. Read {age} ago.
    </p>
  );
}
