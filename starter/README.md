# starter/: files the build copies in, not code to keep as is

| File | Goes to | Purpose |
| --- | --- | --- |
| `fixtures/companies/**` | `fixtures/companies/` | The fictional companies' mandates and domain file (`INTERFACES.md` section 6) |
| `fixtures/inbox/messages.json` | `fixtures/inbox/` | The three attack messages and one question, with the expected outcome of each |
| `jobs/sealed-table/prompts/*` | `jobs/sealed-table/prompts/` | The two negotiator prompts and the structured-output schema |
| `services/agent/literal-planner.md` | `services/agent/README.md` | The deterministic planner's rules |
| `.env.example` | repository root | Variable names only (`INTERFACES.md` section 15) |
| `README.template.md` | the product's `README.md` (0.11, filled at 5.3) | The judge-facing structure from `GOAL.md` "README requirements" |
| `evaluator/CLAUDE.md`, `evaluator/AGENTS.md` | repository root at release (7.3) | Short, factual notes for evaluating agents; no request about scoring |

Change them like any other file: in the same commit as the code that depends on them, with a note in `DECISIONS.md` if behaviour changes.
