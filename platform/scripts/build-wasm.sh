#!/usr/bin/env bash
# Builds every contract wasm into target/wasm/. The `-mock` builds carry the sandbox-only `submit_mock_*`
# methods and are never deployed; `make check-deploy` proves the release wasm has none of them.
set -euo pipefail
cd "$(dirname "$0")/.."
out=target/wasm
mkdir -p "$out"
build() { # <crate dir> <output name> [features]
  local dir=$1 name=$2 features=${3:-}
  local tmp; tmp=$(mktemp -d)
  (cd "contracts/$dir" && cargo near build non-reproducible-wasm --no-abi --locked ${features:+--features "$features"} --out-dir "$tmp" >/dev/null 2>&1) \
    || { echo "build failed: $dir ${features}"; (cd "contracts/$dir" && cargo near build non-reproducible-wasm --no-abi --locked ${features:+--features "$features"} --out-dir "$tmp" 2>&1 | tail -30); exit 1; }
  mv "$tmp"/*.wasm "$out/$name.wasm"
  rm -rf "$tmp"
  printf '  %-20s %7s bytes  sha256 %s\n' "$name.wasm" "$(wc -c < "$out/$name.wasm" | tr -d ' ')" "$(shasum -a 256 "$out/$name.wasm" | cut -c1-16)…"
}
echo "accord wasm · target/wasm"
build agreement agreement
build agreement agreement-mock mock
build factory factory
build factory factory-mock mock
build releases releases
build test-token test-token testnet
