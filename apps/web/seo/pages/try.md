Try

# Try to move the money.

Tell the agent to pay someone else. On NEAR testnet the demonstration agent was told to pay a new account three times, on agreements a6 and a8, and the contract refused each payment. Run the same attack in your own deal room in about three minutes.

[Run it in your own room](/app/try-it) [Verify a6](/verify)

## Refused on testnet recorded · 3 attempts

- 01 ERR_PAYEE_MISMATCH [a6](https://testnet.nearblocks.io/address/a6.accord-v2.testnet) item 2·13.00 USDC to [halcyon-markets.testnet](https://testnet.nearblocks.io/address/halcyon-markets.testnet)·8 Nov, 17:04 UTC·[tx](https://testnet.nearblocks.io/txns/AB9HLnWvkzNL418ygx8AVArinPnAK3jqxt4haAjsk8fs)

- 02 ERR_PAYEE_MISMATCH [a8](https://testnet.nearblocks.io/address/a8.accord-v2.testnet) item 2·12.00 USDC to [halcyon-markets.testnet](https://testnet.nearblocks.io/address/halcyon-markets.testnet)·8 Nov, 17:48 UTC·[tx](https://testnet.nearblocks.io/txns/37zUgEoe8jbqnqQQhSe8L1VPBMRrrqXdsDorgDY7cEYL)

- 03 ERR_PAYEE_MISMATCH [a8](https://testnet.nearblocks.io/address/a8.accord-v2.testnet) item 3·6.00 USDC to [halcyon-markets.testnet](https://testnet.nearblocks.io/address/halcyon-markets.testnet)·8 Nov, 17:53 UTC·[tx](https://testnet.nearblocks.io/txns/CPirnYdV9J55zsKRkvQkdzFZujXzEYHzkhqo51NBWtm4)

Each attempt is the agent's own act call, signed with its one key, naming a recipient the vendor never proved. Nothing moved; the refusal is on the record. [a6's full record](/record)

A successful attempt can only ever produce a payment to the authorised recipient at the approved amount.

The always-open public room, where anyone can write to the agent, returns when its service is running on this deployment.
