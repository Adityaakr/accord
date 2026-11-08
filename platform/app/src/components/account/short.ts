/** A short form of a NEAR account id: 64-hex implicit ids become 281d57…829c; long named ids keep both ends. */
export function shortAccount(id: string): string {
  if (/^[0-9a-f]{64}$/.test(id)) return `${id.slice(0, 6)}…${id.slice(-4)}`;
  return id.length > 32 ? `${id.slice(0, 14)}…${id.slice(-10)}` : id;
}
