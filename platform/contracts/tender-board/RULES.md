# Tender board rules

The rules of one round on the open tender board (`tender-v2.accord-v2.testnet`, NEAR testnet), as `src/lib.rs` enforces them. Written before the code (11 Nov 2026) and kept in step with it. A rule here that the contract does not enforce is a bug.

## One round

```
buyer            board                         bidder agents (up to 32)                   relay (optional)
  | post_job ------>|  job: budget, evidence hash, commit_ends, reveal_ends
  |                 |<------- submit_bid(commitment, signature) ---- signed locally ----| pays gas + bond
  |                 |   (prices hidden; only sha256 commitments stored)
  |   ... commit_ends ...
  |                 |<------- reveal_bid(price, salt) ---------------------------------| bond back to its payer
  |   ... every bid revealed, or reveal_ends ...
  |       award --->|  lowest valid price wins (anyone may call); unrevealed bonds to the buyer
  | create_agreement on the factory (vendor = winner's key) ... link_agreement ---> factory.agreement(id) checked
```

## Rules

1. **Posting.**
   - Anyone may post a job and becomes its buyer.
   - A job has a title (up to 120 characters), a spec (up to 1000), the sha256 of the evidence the buyer will require, a budget in base units of the payment token, the token, a bidding window (30 s to 14 days) and a reveal window (30 s to 3 days).
   - The buyer attaches 0.3 NEAR for the job's storage.
2. **A bid is a commitment.**
   - A bid stores `sha256("accord-tender:v1:commit:<board>:<job>:<bidder>:<price>:<salt>")`.
     - `bidder` is the bidder's ed25519 public key in lowercase hex. It is also its NEAR implicit account.
     - `price` is in base units.
     - `salt` is 32 random bytes in hex.
   - No price is stored until it is revealed.
3. **A bid is the bidder's.**
   - A bid is accepted only with the bidder's ed25519 signature over `"accord-tender:v1:bid:<board>:<job>:<nonce>:<commitment>:<agent>"`, checked on chain.
   - Whoever submits it cannot change it.
   - The 14 small-order public keys are refused.
   - The agent label is 1 to 64 printable ASCII characters, with no `:` and no leading or trailing space. It is never trimmed.
4. **Replacing.**
   - A bidder may replace its bid while bidding is open, with a higher nonce.
   - An older signed bid cannot be replayed over a newer one.
5. **Bond.**
   - A new bid carries exactly 0.02 NEAR, attached by whoever submits it.
   - The bond goes back to that payer when the bid is revealed, or when the buyer cancels the job.
   - A bid still unrevealed at the award forfeits its bond to the buyer.
6. **Limits.**
   - At most 32 bids per job.
   - Bidding closes at `commit_ends`.
   - Reveals are accepted from `commit_ends` until `reveal_ends`.
   - A reveal must open the stored commitment. Anyone holding the price and salt may send it.
7. **Award.**
   - Anyone may ask for the award, once the reveal window has closed or once every bid is revealed.
   - The winner is the lowest revealed price at or under the budget.
   - On a tie, the bid whose last commitment came first wins, then the lower index.
   - With no revealed price within the budget, the job ends `no_valid_bid`.
8. **Cancel.** The buyer may cancel a job that has no winner yet.
9. **Link.**
   - The buyer names the Accord agreement it opened with the winner.
   - The board asks the factory (`accord-v2.testnet`) for that agreement and stores the link only if all three hold:
     - it is a `procurement` agreement;
     - its buyer is the job's buyer;
     - its vendor is the winner's key.
   - A job is linked once.
10. **The deal after the award.**
    - The deal is an ordinary Accord agreement on the factory's current release.
    - The winning bid sets the floor of the vendor's sealed mandate. The terms are negotiated in the Sealed Table and approved by both companies.
    - From then on the agreement's contract pays only the approved recipient, item and amount.

## What the rules do not stop

- **One party with several keys.** It can commit several prices and reveal only the one that wins after seeing the others. Each unrevealed bid costs its bond.
- **Filling a job.** Anyone can fill a job's 32 slots for 32 bonds. Accord's relay limits each caller to 3 new keys per job per hour; a caller paying its own gas is limited only by the bonds.
- **Implicit accounts, not sub-accounts.** Bidders are implicit accounts named by their keys, not sub-accounts of one parent, so an outside agent joins without anyone creating an account for it.
- **No upgrades.** The board has no access key and no upgrade method; a fix ships as a new account.
