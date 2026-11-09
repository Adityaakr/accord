// The demo panel's poll timing: every POLL_MS while the server answers, doubling up to MAX_MS while it says the
// network is busy (503 with Retry-After, 429, or no answer), never sooner than the server's Retry-After.
export const POLL_MS = 8_000;
export const MAX_MS = 30_000;

export function nextPollDelay(prev: number, busy: boolean, retryAfterS?: number | null): number {
  if (!busy) return POLL_MS;
  const doubled = Math.min(MAX_MS, Math.max(POLL_MS, prev) * 2);
  const floor = retryAfterS && retryAfterS > 0 ? Math.min(MAX_MS, retryAfterS * 1000) : 0;
  return Math.max(doubled, floor);
}

/** Whether a response means "busy, try again shortly" rather than a real failure. */
export function isBusyStatus(status: number): boolean {
  return status === 503 || status === 429 || status === 502 || status === 504;
}
