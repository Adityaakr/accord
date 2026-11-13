#!/bin/sh
# Rebuilds app/public/tender-tlock.mjs (drand tlock for the install-free tender-bid.mjs) and pins its sha256 in the script.
set -e
cd "$(dirname "$0")/../.."
pnpm --filter @accord/sdk build >/dev/null
ESBUILD="$(ls -d node_modules/.pnpm/esbuild@*/node_modules/esbuild | head -1)/bin/esbuild"
"$ESBUILD" scripts/tlock-bundle/entry.mjs --bundle --platform=node --format=esm --target=node22 --minify --legal-comments=inline \
  --banner:js="import { createRequire as __accordRequire } from 'node:module'; const require = __accordRequire(import.meta.url);" \
  --outfile=app/public/tender-tlock.mjs --log-level=warning
sha=$(shasum -a 256 app/public/tender-tlock.mjs | cut -d' ' -f1)
perl -pi -e "s/^const TLOCK_SHA256 = \".*\";/const TLOCK_SHA256 = \"$sha\";/" app/public/tender-bid.mjs
echo "tender-tlock.mjs $sha"
