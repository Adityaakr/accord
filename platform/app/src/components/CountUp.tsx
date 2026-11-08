"use client";

// A figure that counts up once, the first time it appears (about 0.8 s, eased). Live refreshes after that show the new
// value directly. Reduced motion shows the value. Amounts arrive as base units (string) with their decimals.

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { formatUnits } from "@accord/sdk";
import styles from "./CountUp.module.css";

export function CountUp({ value, decimals = 6, places = 2, unit }: { value: string; decimals?: number; places?: number; unit?: string }) {
  const reduce = useReducedMotion();
  const target = Number(formatUnits(value, decimals, places).replace(/,/g, ""));
  const [shown, setShown] = useState<number | null>(null);
  const played = useRef(false);
  useEffect(() => {
    if (played.current || reduce || !Number.isFinite(target) || target === 0) { setShown(null); return; }
    played.current = true;
    const start = performance.now(), dur = 800;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(target * e);
      if (k < 1) raf = requestAnimationFrame(tick); else setShown(null);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduce]);
  const text = shown === null ? formatUnits(value, decimals, places) : shown.toLocaleString("en-US", { minimumFractionDigits: places, maximumFractionDigits: places });
  return <span className="num">{text}{unit ? <span className={styles.unit}> {unit}</span> : null}</span>;
}
