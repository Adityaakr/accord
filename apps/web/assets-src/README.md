Source images kept out of `public/` so they never ship. The site serves WebP made from them with cwebp:

- `dots.png` → `public/assets/dots.webp`: `cwebp -q 60 -alpha_q 50 -m 6 -resize 2000 0`
- `research/<id>.jpg` → `public/research/<id>-1200.webp` (`-q 78 -resize 1200 0`) and `<id>-640.webp` (`-q 75 -resize 640 0`)
