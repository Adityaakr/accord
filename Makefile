# Accord make targets (GOAL.md "Make targets"). Unimplemented targets print `not implemented: <item>` and exit 1.
SHELL := /bin/bash
.DEFAULT_GOAL := help

# Live targets: NET=local runs them against the node `make serve` keeps up; testnet otherwise.
NET ?= testnet
LIVE = NET=$(NET) pnpm --silent --filter @accord/live start

define todo
	@echo "not implemented: $(1)"; exit 1
endef

help:
	@grep -E '^[a-z-]+:' Makefile | sed 's/:.*//' | tr '\n' ' '; echo

setup-check: ; @bash scripts/setup-check.sh
ci: wasm ; @cargo fmt --all -- --check && cargo clippy --workspace --all-targets -- -D warnings && cargo test --workspace && pnpm -r typecheck && pnpm -r --filter './packages/*' --filter './services/*' --filter @accord/app test
test: wasm ; @cargo test --workspace && pnpm -r --filter './packages/*' --filter './services/*' --filter @accord/app test
wasm: ; @bash scripts/build-wasm.sh

setup: ; @bash scripts/setup.sh
probe-ai: ; @cd scripts/probe-ai && pnpm install --ignore-workspace --frozen-lockfile --silent && pnpm exec tsx probe-ai.ts
probe-venue: ; @cargo run -q -p accord-venue --features probe --bin probe-venue
sandbox: wasm ; @cargo run -q -p accord-sandbox --bin sandbox 2>/dev/null
serve: wasm ; @cargo run -q -p accord-sandbox --bin serve 2>/dev/null
dev: wasm ; @node scripts/dev.mjs
check-deploy: wasm ; @npx tsx scripts/check-deploy.ts
deploy-testnet: wasm ; @npx tsx scripts/deploy-testnet.ts
negotiate: ; @$(LIVE) negotiate
approve: ; @$(LIVE) approve
fund: ; @$(LIVE) fund
payee: ; @$(LIVE) payee
pay: ; @$(LIVE) pay
attack: ; @$(LIVE) attack
revoke: ; @$(LIVE) revoke
claim: ; @$(LIVE) claim
exception: ; @$(LIVE) exception
payee-change: ; @$(LIVE) payee-change
atlas: ; @$(LIVE) atlas
verify: ; @pnpm --silent --filter @accord/cli dev -- verify --agreement $(DEAL)
demo: ; @$(LIVE) demo
measure: ; @$(LIVE) measure
demo-reset: ; $(call todo,7.1 make demo-reset)
inbox: ; @$(LIVE) inbox
release-check: ; $(call todo,7.4 make release-check)
submission-check: ; $(call todo,8.2 make submission-check)

.PHONY: help setup-check ci test wasm serve dev setup probe-ai probe-venue sandbox check-deploy deploy-testnet negotiate approve fund payee pay attack revoke claim exception payee-change atlas verify demo measure demo-reset inbox release-check submission-check
