// A deterministic 5x5 pixel mark for an account id, mirrored left to right, in the teal palette. Same id, same mark,
// everywhere it appears. It is a recognition aid only and proves nothing about who holds the account.

function hash(s: string): number[] {
  // FNV-1a, stretched to 32 bytes by re-hashing with a counter. Fast, stable, no dependency.
  const out: number[] = [];
  for (let k = 0; out.length < 32; k++) {
    let h = 0x811c9dc5 ^ k;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    out.push(h & 0xff, (h >>> 8) & 0xff, (h >>> 16) & 0xff, (h >>> 24) & 0xff);
  }
  return out;
}

const SHADES = [0.95, 0.7, 0.45];

export function Identicon({ id, size = 24, radius }: { id: string; size?: number; radius?: number }) {
  const b = hash(id);
  const cells: { x: number; y: number; o: number }[] = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      const v = b[y * 3 + x] ?? 0;
      if (v % 2 === 0) continue;
      const o = SHADES[(b[16 + y * 3 + x] ?? 0) % SHADES.length] ?? 0.95;
      cells.push({ x, y, o });
      if (x < 2) cells.push({ x: 4 - x, y, o });
    }
  }
  if (cells.length < 4) cells.push({ x: 2, y: 2, o: 0.95 }, { x: 1, y: 1, o: 0.7 }, { x: 3, y: 1, o: 0.7 });
  const r = radius ?? Math.round(size / 4);
  return (
    <svg width={size} height={size} viewBox="-1 -1 7 7" aria-hidden="true" style={{ flex: "none", borderRadius: r, background: "var(--teal-wash)", display: "block" }}>
      {cells.map((c, i) => <rect key={i} x={c.x} y={c.y} width={1} height={1} fill="var(--teal)" fillOpacity={c.o} />)}
    </svg>
  );
}
