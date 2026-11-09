"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onVisibleInterval } from "./visible";

/**
 * Re-reads the page's server data on an interval while the tab is visible, so live panels stay current. A hidden tab
 * makes no requests; it reads once when it comes back.
 */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => onVisibleInterval(() => router.refresh(), seconds * 1000), [router, seconds]);
  return null;
}
