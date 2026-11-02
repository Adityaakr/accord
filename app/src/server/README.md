# What the app's server keeps

The deal-room app never sees a mandate in plaintext and has no route that accepts one. Mandates are sealed in the
party's browser (`@accord/sdk` `seal`) and sent with the party's own wallet transaction; the chain stores the
ciphertext and its commitment hash. `app/tests/no-mandate-routes.test.ts` fails if any API route reads a field named
or shaped like a mandate.

What the server stores (Postgres, `src/server/store.ts`):

| Table | What | Why |
| --- | --- | --- |
| `inbox_messages` | Messages typed into `/try`, a salted daily hash of the visitor (never the address), the agent's outcome | The demo agent reads its inbox from here |
| `preflight_approvals` | A buyer's NEP-413 signature approving a warned recipient for its agent | The MCP server checks it before `warn` becomes `allow` |
| `demo_vendors` | Recipient and authority pairs registered on the demo domain, for 24 hours | `/.well-known/accord.json` for `make demo` |
| `try_rooms` | The `/try` room's agreements and their status | The re-arm process |
| `heartbeats` | Keeper, agent and re-arm liveness | `/status` |

Everything else on every page is read from the chain when the page is requested, with its source and age shown.
The routes under `/api/dev` exist only for the local sandbox (`make serve`) and answer 404 on any other network.
