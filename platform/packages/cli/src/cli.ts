// Wiring: global flags, `--as` identity, dispatch, and output in text or JSON. `run` takes its dependencies so the
// whole path from argv to output is testable offline.

import { flagBool, flagString, parseArgv } from "./args.js";
import { COMMANDS, READ_ONLY, USAGE, type Deps, type Output } from "./commands.js";
import { parseRole, redact, secretValues, selectIdentity, type Env, type Identity, type Role } from "./env.js";
import { toJson } from "./format.js";
import type { Network } from "@accord/sdk";

export interface GlobalOptions {
  network: Network;
  factory: string;
  rpc?: string;
  json: boolean;
  role?: Role;
}

export function globalOptions(flags: ReturnType<typeof parseArgv>, env: Env): GlobalOptions {
  const network = (flagString(flags, "network") ?? env.NEAR_NETWORK ?? "testnet") as Network;
  if (network !== "testnet" && network !== "mainnet" && network !== "sandbox") {
    throw new Error("--network is testnet, mainnet or sandbox");
  }
  const factory = flagString(flags, "factory") ?? env.ACCORD_FACTORY ?? "";
  const asFlag = flagString(flags, "as");
  return {
    network,
    factory,
    rpc: flagString(flags, "rpc") ?? (env.NEAR_RPC_URL || undefined),
    json: flagBool(flags, "json"),
    role: asFlag === undefined ? undefined : parseRole(asFlag),
  };
}

export interface Io {
  stdout(text: string): void;
  stderr(text: string): void;
}

export type DepsFactory = (o: GlobalOptions & { identity?: Identity; env: Env }) => Deps;

/** Command words: `recipient propose`, `agent install` and the like take a subcommand as their first positional. */
export async function run(argv: readonly string[], env: Env, io: Io, makeDeps: DepsFactory): Promise<number> {
  const secrets = secretValues(env);
  const say = (t: string) => io.stdout(redact(t, secrets));
  let json = argv.includes("--json");
  try {
    const args = parseArgv(argv);
    const [command, ...rest] = args.positionals;
    if (!command || flagBool(args, "help")) {
      say(USAGE);
      return command ? 0 : 1;
    }
    const handler = COMMANDS[command];
    if (!handler) throw new Error(`unknown command ${command}; run accord --help`);
    const g = globalOptions(args, env);
    json = g.json;
    if (g.network === "mainnet" && !READ_ONLY.has(command)) {
      throw new Error("the CLI signs on testnet only; mainnet is read-only here");
    }
    if (!g.factory && command !== "recycle") throw new Error("missing --factory (or ACCORD_FACTORY)");
    const identity = command === "recycle" ? selectIdentity("recipient", env)
      : g.role ? selectIdentity(g.role, env) : undefined;
    const deps = makeDeps({ ...g, identity, env });
    const out: Output = {
      block: (lines, value) => (g.json ? say(toJson(value)) : say(lines.join("\n"))),
      warn: (t) => { if (!g.json) io.stderr(redact(t, secrets)); },
      fail: (t, value) => (g.json ? say(toJson(value)) : io.stderr(redact(t, secrets))),
    };
    const code = await handler({ deps, args, rest, env, out, role: g.role });
    return code ?? 0;
  } catch (e) {
    const msg = redact(e instanceof Error ? e.message : String(e), secrets);
    if (json) io.stdout(toJson({ error: msg }));
    else io.stderr(`error: ${msg}`);
    return 1;
  }
}
