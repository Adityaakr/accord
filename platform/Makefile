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
	@grep -E '^[a-z-]+:' Makefile | grep -v '^atlas:' | sed 's/:.*//' | tr '\n' ' '; echo

setup-check: ; @bash scripts/setup-check.sh
# sdk and store ship as built dist/ that the other packages import; `pnpm install` builds them (the root `prepare`), and
# these targets build them again so a changed sdk or store is what the typecheck and tests see.
LIBS = pnpm --silent --filter @accord/sdk --filter @accord/store build
ci: wasm ; @cargo fmt --all -- --check && cargo clippy --workspace --all-targets -- -D warnings && cargo test --workspace && $(LIBS) && pnpm -r typecheck && pnpm -r --filter './packages/*' --filter './services/*' --filter @accord/app test
test: wasm ; @cargo test --workspace && $(LIBS) && pnpm -r --filter './packages/*' --filter './services/*' --filter @accord/app test
wasm: ; @bash scripts/build-wasm.sh
# accord-core's check_pay as wasm for @accord/sdk/check; CHECK=1 fails if the committed module differs from a fresh build.
check-wasm: ; @bash scripts/build-check-wasm.sh

setup: ; @bash scripts/setup.sh
probe-ai: ; @cd scripts/probe-ai && pnpm install --ignore-workspace --frozen-lockfile --silent && pnpm exec tsx probe-ai.ts
probe-venue: ; @cargo run -q -p accord-venue --features probe --bin probe-venue
sandbox: wasm ; @cargo run -q -p accord-sandbox --bin sandbox 2>/dev/null
serve: wasm ; @cargo run -q -p accord-sandbox --bin serve 2>/dev/null
dev: wasm ; @node scripts/dev.mjs
check-deploy: wasm ; @npx tsx scripts/check-deploy.ts
deploy-testnet: wasm ; @npx tsx scripts/deploy-testnet.ts
deploy-tender: ; @npx tsx scripts/deploy-tender.ts
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
market-making: ; @$(LIVE) market-making
# hidden alias kept so recorded `make atlas` runs still reproduce (the old name, retired 8 Nov 2026)
atlas: ; @$(LIVE) market-making
# verify needs no ACCORD_FACTORY for a known factory: the CLI reads it from the a<n>.<factory> id (KNOWN_FACTORIES).
verify: ; @pnpm --silent --filter @accord/cli dev -- verify --agreement $(DEAL)
demo: ; @$(LIVE) demo
tender: ; @$(LIVE) tender
tender-sim: ; @cargo test -q -p accord-tender-board simulation -- --nocapture 2>&1 | grep -v "EVENT_JSON\|^running\|^$$\|^\.$$"
finish: ; @DEAL=$(DEAL) $(LIVE) finish
# One new agreement through a dispute, a re-delivery and an early mutual close that refunds the unspent escrow.
dispute-close: ; @$(LIVE) dispute-close
# The vendor cancels an agreement still in Sealed or Attested (what the app's stale room sweep does).
cancel: ; @DEAL=$(DEAL) $(LIVE) cancel
# Circle USDC on testnet: the same targets on the second factory, which settles in Circle's USDC (DECISIONS.md 24).
# The buyer (BUYER_ACCOUNT) needs the terms' total in Circle USDC first: https://faucet.circle.com, network NEAR Testnet.
USDC_FACTORY ?= accord-usdc.testnet
USDC_TOKEN ?= 3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af
USDC_ENV = ACCORD_FACTORY=$(USDC_FACTORY) ACCORD_TOKEN=$(USDC_TOKEN) ACCORD_FACTORY_USDC=$(USDC_FACTORY)
negotiate-usdc: ; @$(USDC_ENV) $(LIVE) negotiate
finish-usdc: ; @$(USDC_ENV) DEAL=$(DEAL) $(LIVE) finish
dispute-close-usdc: ; @$(USDC_ENV) $(LIVE) dispute-close
# Both parties mutual-close an Executing agreement (refunds the unspent escrow), then the buyer withdraws spare NEAR.
close: ; @DEAL=$(DEAL) $(LIVE) close
close-usdc: ; @$(USDC_ENV) DEAL=$(DEAL) $(LIVE) close
verify-usdc: ; @$(USDC_ENV) pnpm --silent --filter @accord/cli dev -- verify --agreement $(DEAL)
measure: ; @$(LIVE) measure
demo-reset: ; $(call todo,7.1 make demo-reset)
inbox: ; @$(LIVE) inbox
release-check: ; $(call todo,7.4 make release-check)
submission-check: ; $(call todo,8.2 make submission-check)

.PHONY: help setup-check ci test wasm check-wasm serve dev setup probe-ai probe-venue sandbox check-deploy deploy-testnet negotiate negotiate-usdc finish-usdc dispute-close dispute-close-usdc close close-usdc cancel verify-usdc approve fund payee pay attack revoke claim exception payee-change market-making atlas verify demo tender tender-sim deploy-tender measure demo-reset inbox release-check submission-check
