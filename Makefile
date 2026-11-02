# Accord make targets (GOAL.md "Make targets"). Unimplemented targets print `not implemented: <item>` and exit 1.
SHELL := /bin/bash
.DEFAULT_GOAL := help

define todo
	@echo "not implemented: $(1)"; exit 1
endef

help:
	@grep -E '^[a-z-]+:' Makefile | sed 's/:.*//' | tr '\n' ' '; echo

setup-check: ; @bash scripts/setup-check.sh
ci: wasm ; @cargo fmt --all -- --check && cargo clippy --workspace --all-targets -- -D warnings && cargo test --workspace
test: wasm ; @cargo test --workspace
wasm: ; @bash scripts/build-wasm.sh

setup: ; @bash scripts/setup.sh
probe-ai: ; $(call todo,0.2 make probe-ai)
probe-venue: ; @cargo run -q -p accord-venue --features probe --bin probe-venue
sandbox: wasm ; @cargo run -q -p accord-sandbox --bin sandbox 2>/dev/null
check-deploy: ; $(call todo,2.7 make check-deploy)
deploy-testnet: ; $(call todo,2.7 make deploy-testnet)
negotiate: ; $(call todo,2.8 make negotiate)
approve: ; $(call todo,3.4 make approve)
fund: ; $(call todo,3.4 make fund)
payee: ; $(call todo,3.4 make payee)
pay: ; $(call todo,3.4 make pay)
attack: ; $(call todo,3.5 make attack)
revoke: ; $(call todo,3.6 make revoke)
claim: ; $(call todo,3.4 make claim)
exception: ; $(call todo,3.4 make exception)
payee-change: ; $(call todo,3.4 make payee-change)
atlas: ; $(call todo,3.7 make atlas)
verify: ; $(call todo,5.1 make verify)
demo: ; $(call todo,5.2 make demo)
demo-reset: ; $(call todo,7.1 make demo-reset)
inbox: ; $(call todo,4.4 make inbox)
release-check: ; $(call todo,7.4 make release-check)
submission-check: ; $(call todo,8.2 make submission-check)

.PHONY: help setup-check ci test wasm setup probe-ai probe-venue sandbox check-deploy deploy-testnet negotiate approve fund payee pay attack revoke claim exception payee-change atlas verify demo demo-reset inbox release-check submission-check
