import type { ImageId } from "./types"

/* Docs screenshots in public/docs/<id>.webp: intrinsic size (so the layout never jumps) and the theme each was
   captured in. Dark captures come from the running app and site; the four signed-in room captures are from a
   light-theme session (the wallet sign-in cannot run headless), cropped so no personal account id shows. */
export const DOC_IMAGES: Record<ImageId, { w: number; h: number; theme: "dark" | "light" }> = {
  "tryit-signed-out": { w: 1600, h: 1203, theme: "dark" },
  "tryit-signed-in": { w: 880, h: 570, theme: "light" },
  room: { w: 1224, h: 250, theme: "light" },
  "room-demo-panel": { w: 360, h: 507, theme: "light" },
  "agent-paid": { w: 360, h: 640, theme: "light" },
  "agent-refused": { w: 360, h: 715, theme: "light" },
  verify: { w: 1600, h: 1944, theme: "dark" },
  record: { w: 1600, h: 1156, theme: "dark" },
}
