#!/usr/bin/env bash
# make setup-check (PROGRESS 0.1): each pinned tool, its version and `ok`, or the install command.
set -u
fail=0
check() { # name, version command, install hint
  local out
  if out=$(eval "$2" 2>/dev/null | head -1) && [ -n "$out" ]; then
    printf '%-16s %-40s ok\n' "$1" "$out"
  else
    printf '%-16s missing · install: %s\n' "$1" "$3"; fail=1
  fi
}
check rustc        "rustc --version"            "rustup toolchain install 1.97.0"
check wasm32-wasip2 "rustup target list --installed | grep wasm32-wasip2" "rustup target add wasm32-wasip2"
check wasm32-unknown "rustup target list --installed | grep wasm32-unknown-unknown" "rustup target add wasm32-unknown-unknown"
check cargo-near   "cargo near --version"        "cargo install --locked cargo-near"
check near-cli-rs  "near --version"              "cargo install --locked near-cli-rs"
check node         "node --version"              "install Node 24"
check pnpm         "pnpm --version"              "npm i -g pnpm"
check wasmtime     "wasmtime --version"          "brew install wasmtime"
check outlayer     "outlayer --version"          "cargo install --locked outlayer-cli"
check outlayer-verify "outlayer-verify --version" "cargo install --git https://github.com/out-layer/outlayer-verify outlayer-verify"
exit $fail
