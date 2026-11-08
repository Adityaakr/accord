// A pixel icon centred in a square tile with equal padding on every side. One component, so every tile in the app
// has the same proportions: the glyph is about half the tile.
import { PixelIcon, type PixelName } from "./PixelIcon";
import styles from "./IconTile.module.css";

export function IconTile({ name, size = 32, tone, className = "" }: { name: PixelName; size?: number; tone?: "metal" | "teal"; className?: string }) {
  // the 16-cell glyph at whole pixels per cell stays crisp: 16 px in small tiles, 32 px in large ones
  const glyph = size >= 60 ? 32 : 16;
  return (
    <span className={`${styles.tile} ${tone === "teal" ? styles.teal : ""} ${className}`} style={{ width: size, height: size, borderRadius: Math.round(size * 0.28) }} aria-hidden="true">
      <PixelIcon name={name} size={glyph} tone={tone} />
    </span>
  );
}
