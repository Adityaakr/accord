"use client";

// The active tab's underline. One shared layoutId, so it slides from the old tab to the new one.

import { motion, useReducedMotion } from "motion/react";
import styles from "./room.module.css";

export function Underline() {
  const reduce = useReducedMotion();
  return <motion.span layoutId="room-tab-underline" className={styles.underline}
    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 40, mass: 0.8 }} />;
}
