// A small argument parser: positionals, `--flag value`, `--flag=value` and boolean flags. No dependency.

export interface ParsedArgs {
  positionals: string[];
  flags: Map<string, string | true>;
}

/** Flags that never take a value. Every other `--flag` takes the next word. */
export const BOOLEAN_FLAGS = new Set([
  "json", "raw", "help", "pay", "close", "waive-evidence", "acknowledge-warnings", "mutual",
]);

export function parseArgv(argv: readonly string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags = new Map<string, string | true>();
  for (let i = 0; i < argv.length; i++) {
    const word = argv[i]!;
    if (word === "--") {
      positionals.push(...argv.slice(i + 1));
      break;
    }
    if (word === "-h") {
      flags.set("help", true);
      continue;
    }
    if (!word.startsWith("--") || word.length === 2) {
      positionals.push(word);
      continue;
    }
    const body = word.slice(2);
    const eq = body.indexOf("=");
    if (eq >= 0) {
      flags.set(body.slice(0, eq), body.slice(eq + 1));
      continue;
    }
    if (BOOLEAN_FLAGS.has(body)) {
      flags.set(body, true);
      continue;
    }
    const next = argv[i + 1];
    if (next === undefined || (next.startsWith("--") && next.length > 2)) {
      throw new Error(`--${body} needs a value`);
    }
    flags.set(body, next);
    i++;
  }
  return { positionals, flags };
}

export function flagString(args: ParsedArgs, name: string): string | undefined {
  const v = args.flags.get(name);
  if (v === undefined) return undefined;
  if (v === true) throw new Error(`--${name} needs a value`);
  return v;
}

export function flagBool(args: ParsedArgs, name: string): boolean {
  const v = args.flags.get(name);
  if (v === undefined) return false;
  if (v === true) return true;
  if (v === "true" || v === "1" || v === "yes") return true;
  if (v === "false" || v === "0" || v === "no") return false;
  throw new Error(`--${name} takes no value`);
}

export function requireFlag(args: ParsedArgs, name: string): string {
  const v = flagString(args, name);
  if (v === undefined || v === "") throw new Error(`missing --${name}`);
  return v;
}

export function flagInt(args: ParsedArgs, name: string): number | undefined {
  const v = flagString(args, name);
  return v === undefined ? undefined : toInt(v, `--${name}`);
}

export function toInt(text: string, what: string): number {
  if (!/^\d+$/.test(text)) throw new Error(`${what} must be a whole number, got ${text}`);
  const n = Number(text);
  if (!Number.isSafeInteger(n)) throw new Error(`${what} is too large`);
  return n;
}
