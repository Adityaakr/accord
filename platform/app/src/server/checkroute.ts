// /api/check's answers, pure of server-only so they are testable. Validates the query before any RPC call (400 with
// a plain message), then runs the SDK's check (`@accord/sdk/check`: the agreement's views at one block through
// accord-core's check_pay, built to wasm). 404 for an account that is not an agreement of a known factory, 422 for an
// agreement whose code this check does not know, 410 for a past block the RPC no longer serves, 503 when the RPC is
// busy. Without `item` it answers the form data instead: the items with their approved amounts and the recipient.
import { isAccountId, NotAnAgreementError } from "@accord/sdk";
import { BadCheckInputError, BlockUnavailableError, UnsupportedCodeError, type CheckForm, type CheckInput, type PaymentCheck } from "@accord/sdk/check";
import { chainErrorResponse } from "./rpcerror";

export interface CheckQuery {
  agreement: string;
  input: CheckInput | null;
  block?: number;
}

const bad = (error: string) => Response.json({ error }, { status: 400 });

/** The query as typed, or the 400 that explains what is wrong with it. */
export function parseCheckQuery(params: URLSearchParams): CheckQuery | Response {
  const agreement = (params.get("agreement") ?? "").trim().toLowerCase();
  if (!agreement) return bad("agreement is required, e.g. ?agreement=a48.accord-v2.testnet&item=1");
  if (!isAccountId(agreement)) {
    return bad(`${JSON.stringify(agreement.slice(0, 80))} is not a NEAR account id: 2 to 64 characters, lowercase letters, digits, and single - _ or . between them`);
  }
  let block: number | undefined;
  const b = params.get("block");
  if (b !== null && b !== "") {
    if (!/^\d{1,12}$/.test(b) || Number(b) < 1) return bad("block must be a positive block height");
    block = Number(b);
  }
  const item = params.get("item");
  if (item === null || item === "") return { agreement, input: null, block };
  if (!/^\d{1,10}$/.test(item) || Number(item) > 0xffffffff) return bad("item must be an integer item id (0 to 4294967295)");
  const amount = params.get("amount")?.trim() ?? undefined;
  if (amount !== undefined && amount.length > 50) return bad("amount is too long");
  const recipient = params.get("recipient")?.trim() ?? undefined;
  // The contract judges the recipient itself (release 4 code panics on a malformed one); only its size is checked here.
  if (recipient !== undefined && recipient !== "" && !/^[\x21-\x7e]{1,64}$/.test(recipient)) {
    return bad("recipient must be 1 to 64 printable characters (a NEAR account id)");
  }
  return { agreement, input: { item: Number(item), amount: amount || undefined, recipient: recipient || undefined }, block };
}

export interface CheckRunners {
  check: (agreement: string, input: CheckInput, block?: number) => Promise<PaymentCheck>;
  form: (agreement: string) => Promise<CheckForm>;
}

export async function checkResponse(params: URLSearchParams, run: CheckRunners): Promise<Response> {
  const q = parseCheckQuery(params);
  if (q instanceof Response) return q;
  try {
    if (!q.input) {
      if (q.block !== undefined) return bad("block needs an item: the form data is read at the latest block");
      return Response.json(await run.form(q.agreement));
    }
    return Response.json(await run.check(q.agreement, q.input, q.block));
  } catch (e) {
    if (e instanceof NotAnAgreementError) {
      return Response.json({ error: `${q.agreement} is not an agreement of a known Accord factory on this network` }, { status: 404 });
    }
    if (e instanceof BadCheckInputError) return bad(e.message);
    if (e instanceof UnsupportedCodeError) return Response.json({ error: e.message }, { status: 422 });
    if (e instanceof BlockUnavailableError) return Response.json({ error: e.message }, { status: 410 });
    return chainErrorResponse(e);
  }
}
