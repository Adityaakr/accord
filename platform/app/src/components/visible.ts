// Polling that rests while the tab is hidden: `fn` runs every `ms` while the page is visible, and once straight
// away when a hidden tab comes back (if a turn was missed), so a background tab makes no requests at all.

export function onVisibleInterval(fn: () => void, ms: number, doc: Pick<Document, "visibilityState" | "addEventListener" | "removeEventListener"> = document): () => void {
  let missed = false;
  const t = setInterval(() => {
    if (doc.visibilityState === "visible") fn();
    else missed = true;
  }, ms);
  const back = () => {
    if (doc.visibilityState === "visible" && missed) { missed = false; fn(); }
  };
  doc.addEventListener("visibilitychange", back);
  return () => { clearInterval(t); doc.removeEventListener("visibilitychange", back); };
}

/** Whether the page is visible now (true outside a browser, so server code paths are unaffected). */
export const pageVisible = (): boolean => typeof document === "undefined" || document.visibilityState === "visible";
