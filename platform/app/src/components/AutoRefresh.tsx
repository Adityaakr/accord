"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-reads the page's server data on an interval while the tab is visible, so live panels stay current. */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
