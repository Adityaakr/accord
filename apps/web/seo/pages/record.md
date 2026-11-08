Execution record

# Inspect an agreement.

Follow approvals, recipient changes, exceptions and refused requests.

Live on testnet: [a6.accord-v2.testnet](https://testnet.nearblocks.io/address/a6.accord-v2.testnet)

release 3 · test USDC

- [01 Buyer seals its limits Only a commitment and ciphertext go on chain tx](https://testnet.nearblocks.io/txns/Ek9Zr1wjD6nrWaKHFak8UDv5Jwbaacqrdh1huNp6qwAk)

- [02 Vendor seals its limits The other side never sees the numbers tx](https://testnet.nearblocks.io/txns/2Zq8pfNoa1dFzMLAy79aGyek72q3LGcrvRqAjYABisKZ)

- [03 Negotiated in the enclave 35.50 test USDC in 3 items, signed by the Sealed Table tx](https://testnet.nearblocks.io/txns/GfX5qKq35rvtUVkp9nBPgw3kkzDSXx6hfY2H5cb3wfHW)

- [04 Buyer approves the terms Approval recorded on the agreement tx](https://testnet.nearblocks.io/txns/H6cMyE6kzs9SdrC4yaP7CvnDxJqH4NSx7ivKeu2rBHSg)

- [05 Vendor approves the terms The agreement starts executing tx](https://testnet.nearblocks.io/txns/2uv8tTfeYhe2aZ5cMrVNfFzr88kPL4HeSxwYzNhtmveT)

- [06 Buyer funds the escrow 35.50 test USDC into the agreement's own account tx](https://testnet.nearblocks.io/txns/2CeFB18jenw2iggWE8mQZy9DehwZ2f97TYXwi3RVeXPy)

- [07 Recipient proven in the enclave Payee checks the vendor's domain tx](https://testnet.nearblocks.io/txns/6koRbw5QDYTgVU52Fe1vH755QGLPwZabQhF1kTk5rup6)

- [08 Vendor's authority approves A separate account signs off the recipient tx](https://testnet.nearblocks.io/txns/FBQnqtKXs5B5zn1A4F1yCDUmACYMqsi2zM2uez6YxDis)

- [09 Buyer accepts the recipient halcyon-mm.testnet is now the only destination tx](https://testnet.nearblocks.io/txns/3d3LSZvz3yPX5LM1Bk6t9bxiX2x1JDMEt9mfa2fbw11p)

- [10 Agent pays inside the terms 16.50 test USDC to halcyon-mm.testnet tx](https://testnet.nearblocks.io/txns/2k57zg7iE44muCGRbcc2JTVmy5uGHHyCePXNPmcWCKEQ)

- [11 A redirected payment is refused ERR_PAYEE_MISMATCH, nothing sent tx](https://testnet.nearblocks.io/txns/AB9HLnWvkzNL418ygx8AVArinPnAK3jqxt4haAjsk8fs)

- [12 Buyer revokes the agent Its next call fails: AccessKeyDoesNotExist tx](https://testnet.nearblocks.io/txns/4ervNQdjrd7MA1n7vWSY7cRUtCpwiQwSK7xDSK2Bmn9P)

## Agreement

`a6.accord-v2.testnet`

From testnet agreement a6

- `Sealed`

- `Attested`

- `Executing`

- `Settled`

Approved terms

- `milestone 1` `16.50 USDC` `due 2026-11-12`

- `milestone 2` `13.00 USDC` `due 2026-11-13`

- `milestone 3` `6.00 USDC` `due 2026-11-15`

Authorised recipient

`halcyon-mm.testnet · v1` `proven on accordweb-production.up.railway.app`

Last transfer on NEAR

`16.50 USDC → halcyon-mm.testnet` `8 Nov, 17:04 UTC · [tx](https://testnet.nearblocks.io/txns/2k57zg7iE44muCGRbcc2JTVmy5uGHHyCePXNPmcWCKEQ)`

## Refusal log

newest first

- 17:04:30 UTC `ERR_PAYEE_MISMATCH` 13.00 USDC to halcyon-markets.testnet [tx](https://testnet.nearblocks.io/txns/AB9HLnWvkzNL418ygx8AVArinPnAK3jqxt4haAjsk8fs)
