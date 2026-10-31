#!/usr/bin/env bash
# make setup (PROGRESS 0.12): creates the demo accounts through the testnet faucet, idempotently. Keys go to the
# legacy keychain (~/.near-credentials/testnet) and into .env; nothing secret is printed. A taken name gets a suffix
# and the real name is written to .env.
set -euo pipefail
cd "$(dirname "$0")/.."
touch .env
NET=testnet
CREDS="$HOME/.near-credentials/$NET"

# variable prefix : base name
ROLES=(
  "ACCORD_FACTORY:accord-v1"
  "BUYER:northwind-demo" "VENDOR:halcyon-demo" "AUTHORITY:halcyon-auth" "RECIPIENT:halcyon-mm"
  "KEEPER:accord-keeper" "CANARY1:halcyon-mm-payments" "CANARY2:halcyon-treasury" "ATTACKER:halcyon-markets"
  "TRY_BUYER:northwind-try" "TRY_VENDOR:halcyon-try" "TRY_AUTHORITY:halcyon-try-auth" "TRY_RECIPIENT:halcyon-try-mm"
)

env_get() { grep -E "^$1=" .env | tail -1 | cut -d= -f2- || true; }
env_set() { # name, value (replaces an existing line)
  local tmp; tmp=$(mktemp)
  grep -vE "^$1=" .env > "$tmp" || true
  printf '%s=%s\n' "$1" "$2" >> "$tmp"
  mv "$tmp" .env; chmod 600 .env
}
exists() { near account view-account-summary "$1" network-config $NET now >/dev/null 2>&1; }
ours() { [ -f "$CREDS/$1.json" ]; }

for entry in "${ROLES[@]}"; do
  var=${entry%%:*}; base=${entry#*:}
  acct_var="${var}_ACCOUNT"; [ "$var" = ACCORD_FACTORY ] && acct_var=ACCORD_FACTORY
  name=$(env_get "$acct_var")
  if [ -z "$name" ]; then
    name="$base.$NET"; n=1
    while exists "$name" && ! ours "$name"; do name="$base-$n.$NET"; n=$((n + 1)); done
  fi
  if ! exists "$name"; then
    near account create-account sponsor-by-faucet-service "$name" autogenerate-new-keypair \
      save-to-legacy-keychain network-config $NET create >/dev/null 2>&1 || { echo "$name: faucet refused (rate limit?), run make setup again later"; continue; }
    sleep 2
  fi
  env_set "$acct_var" "$name"
  if ours "$name"; then
    key=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["private_key"])' "$CREDS/$name.json")
    key_var="${var}_KEY"; [ "$var" = ACCORD_FACTORY ] && key_var=FACTORY_KEY
    case "$var" in CANARY*|ATTACKER) ;; *) env_set "$key_var" "$key" ;; esac
  fi
done
env_set CANARY_ACCOUNTS "$(env_get CANARY1_ACCOUNT),$(env_get CANARY2_ACCOUNT)"
env_set NEAR_NETWORK testnet

echo "account                              NEAR"
for entry in "${ROLES[@]}"; do
  var=${entry%%:*}; acct_var="${var}_ACCOUNT"; [ "$var" = ACCORD_FACTORY ] && acct_var=ACCORD_FACTORY
  name=$(env_get "$acct_var"); [ -z "$name" ] && continue
  bal=$(near account view-account-summary "$name" network-config $NET now 2>&1 | grep -iE "native|balance" | head -1 | sed -E 's/.*\| *//; s/ +$//')
  printf '%-36s %s\n' "$name" "${bal:-?}"
done
echo "shortfalls: the factory needs about 12 NEAR, the buyer about 15, the /try buyer about 10 (SETUP_FROM_YOU 3)"
