"use client";

// Same-origin requests to the app's own routes ("/api/…") must carry the base path when the app is served under
// one. Patching fetch once, at module load in the root layout, covers every call site (helpers included) before
// any component effect runs. Full URLs and other origins are untouched.
import { withBase } from "@/lib/basePath";

const KEY = "__accordBaseFetch";
if (typeof window !== "undefined" && !(window as unknown as Record<string, unknown>)[KEY]) {
  const original = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string" && input.startsWith("/api/")) return original(withBase(input), init);
    return original(input, init);
  }) as typeof window.fetch;
  (window as unknown as Record<string, unknown>)[KEY] = true;
}

export function BasePathFetch() {
  return null;
}
