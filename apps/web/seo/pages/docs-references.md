References

# References

The official documentation behind each part of Accord, the NEAR standards it uses, and the primary sources for the problem it addresses.

## Official references

- 01 NEAR access keys A function-call key is limited to one receiver and a list of methods, cannot attach a deposit, and spends gas from a fixed allowance. [docs.near.org](https://docs.near.org/protocol/accounts-contracts/access-keys)

- 02 NEAR asynchronous cross-contract calls [docs.near.org](https://docs.near.org/smart-contracts/anatomy/crosscontract)

- 03 NEAR AI Cloud private inference [docs.near.ai](https://docs.near.ai/cloud/private-inference)

- 04 OutLayer trust and verification How a run's attestation is checked with outlayer-verify. [app.outlayer.ai](https://app.outlayer.ai/docs/trust-verification)

- 05 Kraken public order book [docs.kraken.com](https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/book)

- 06 Kraken account-specific execution data [docs.kraken.com](https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/executions)

The exchange references illustrate the difference between aggregate and account-specific evidence; they do not assert that Accord has integrated Kraken.

## NEAR standards used

- 01 NEP-591 global contracts A contract referenced by its code hash cannot change; the basis for pinning each agreement's code. [github.com/near/NEPs](https://github.com/near/NEPs/blob/master/neps/nep-0591.md)

- 02 NEP-141 fungible tokens `ft_transfer` and `ft_transfer_call`, including refunds of unused amounts. [github.com/near/NEPs](https://github.com/near/NEPs/blob/master/neps/nep-0141.md)

- 03 NEP-145 storage management [github.com/near/NEPs](https://github.com/near/NEPs/blob/master/neps/nep-0145.md)

- 04 NEP-297 events [github.com/near/NEPs](https://github.com/near/NEPs/blob/master/neps/nep-0297.md)

- 05 NEP-366 meta transactions [docs.near.org](https://docs.near.org/web3-apps/tutorials/meta-transactions)

- 06 NEP-413 message signing [github.com/near/NEPs](https://github.com/near/NEPs/blob/master/neps/nep-0413.md)

- 07 Gas and storage [docs.near.org](https://docs.near.org/protocol/transactions/gas)

- 08 RPC providers [docs.near.org](https://docs.near.org/api/rpc/providers)

## OutLayer and NEAR AI Cloud

OutLayer

- 01 NEAR integration [app.outlayer.ai](https://app.outlayer.ai/docs/near-integration)

- 02 Secrets [app.outlayer.ai](https://app.outlayer.ai/docs/secrets)

- 03 Signing keys [app.outlayer.ai](https://app.outlayer.ai/docs/signing-keys)

- 04 TEE attestation [app.outlayer.ai](https://app.outlayer.ai/docs/tee-attestation)

- 05 outlayer-verify [github.com/out-layer](https://github.com/out-layer/outlayer-verify)

NEAR AI Cloud

- 01 Verification Attestation reports fetched with a fresh nonce, and per-response signatures bound to the attested model key. [docs.near.ai](https://docs.near.ai/cloud/verification)

- 02 Gateway attestation [docs.near.ai](https://docs.near.ai/cloud/verification/cloud-api/gateway-attestation)

- 03 Model attestations [docs.near.ai](https://docs.near.ai/cloud/verification/cloud-api/model-attestations)

- 04 Response signatures [docs.near.ai](https://docs.near.ai/cloud/verification/cloud-api/response-signatures)

- 05 End-to-end encryption [docs.near.ai](https://docs.near.ai/cloud/guides/e2ee-chat-completions)

## Primary sources

- 01 FBI IC3, Internet Crime Report 2025 Business email compromise: `$3,046,598,558` across `24,768` complaints. [ic3.gov](https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf)

- 02 OWASP Top 10 for LLM Applications, LLM01:2025 Prompt injection is the first risk, including indirect injection from external sources. [genai.owasp.org](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)

- 03 UK NCSC, Prompt injection is not SQL injection Design protections should focus on deterministic (non-LLM) safeguards that constrain the system's actions. [ncsc.gov.uk](https://www.ncsc.gov.uk/blog-post/prompt-injection-is-not-sql-injection)

- 04 NEAR Intents confidential execution It does not hide data an application publishes or an ordinary transfer on the destination chain; the reason Accord makes no claim of private settlement. [intents.near.org](https://intents.near.org/confidential)

On this page

- Official references

- NEAR standards used

- OutLayer and NEAR AI Cloud

- Primary sources
