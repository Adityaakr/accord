//! `gates::check_pay`: the six payment gates in their fixed order (ARCHITECTURE.md section 6). The first failure
//! is the refusal; the contract records it and returns normally. Nothing here panics.

use crate::types::*;

/// Who is asking to pay. The agent's key is checked against the revoked list by the contract before this runs
/// (`ERR_UNAUTHORIZED` panics there); `key_revoked` covers the block between a revoke and its `DeleteKey`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Caller {
    Agent { key_revoked: bool },
    VendorClaim,
    Close,
}

/// The item's state as the gates need it.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ItemCtx {
    pub id: u32,
    pub amount: Amount,
    pub status: ItemStatus,
    /// Procurement: when the open acceptance window lapses (a delivery with no dispute is accepted by the window).
    pub window_end: Option<u64>,
    /// Market-making: the outcome of the item's period.
    pub period: Option<PeriodOutcome>,
    /// An approved exception: its amount, and whether it waives the evidence.
    pub exception: Option<(Amount, bool)>,
}

impl ItemCtx {
    /// The amount the item pays: its approved exception amount, else its terms amount.
    pub fn due_amount(&self) -> Amount {
        self.exception.map(|(a, _)| a).unwrap_or(self.amount)
    }
}

/// Everything the gates read, borrowed from the contract's state for one call.
#[derive(Clone, Debug)]
pub struct PayCtx<'a> {
    pub state: State,
    pub kind: Kind,
    pub canaries: &'a [AccountId],
    /// The current, active, authorised recipient.
    pub recipient: Option<&'a str>,
    pub item: Option<ItemCtx>,
    pub total: Amount,
    pub paid: Amount,
    pub funded: Amount,
    pub in_flight: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PayPlan {
    pub item: u32,
    pub amount: Amount,
    pub recipient: AccountId,
}

/// The request being checked. Claims and `close` always pay the current recipient, so they pass it in.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PayRequest<'a> {
    pub item: u32,
    pub amount: Amount,
    pub recipient: &'a str,
}

pub fn check_pay(
    ctx: &PayCtx,
    req: &PayRequest,
    now: u64,
    caller: Caller,
) -> Result<PayPlan, RefusalCode> {
    gate_key_and_state(ctx, caller)?;
    gate_recipient(ctx, req)?;
    let item = gate_item(ctx, req, caller)?;
    gate_evidence(ctx, item, now)?;
    gate_amount(ctx, item, req)?;
    gate_lock(ctx)?;
    Ok(PayPlan {
        item: req.item,
        amount: req.amount,
        recipient: req.recipient.to_string(),
    })
}

/// Gates 1 to 3 only: what an agent's `RequestException` must pass. It can never change a recipient.
pub fn check_exception_request(ctx: &PayCtx, item: u32, caller: Caller) -> Result<(), RefusalCode> {
    gate_key_and_state(ctx, caller)?;
    // Gate 2 for an exception: there must be an authorised recipient to pay later; the request names no recipient.
    if ctx.recipient.is_none() {
        return Err(RefusalCode::NoRecipient);
    }
    let req = PayRequest {
        item,
        amount: 0,
        recipient: "",
    };
    gate_item(ctx, &req, caller).map(|_| ())
}

fn gate_key_and_state(ctx: &PayCtx, caller: Caller) -> Result<(), RefusalCode> {
    match caller {
        Caller::Agent { key_revoked: true } => Err(RefusalCode::Revoked),
        Caller::Agent { .. } if ctx.state != State::Executing => Err(RefusalCode::NotExecuting),
        // A claim runs in Executing, or after Settled for a Reserved item (gate 3 enforces the second).
        Caller::VendorClaim if !matches!(ctx.state, State::Executing | State::Settled) => {
            Err(RefusalCode::NotExecuting)
        }
        Caller::Close if ctx.state != State::Executing => Err(RefusalCode::NotExecuting),
        _ => Ok(()),
    }
}

fn gate_recipient(ctx: &PayCtx, req: &PayRequest) -> Result<(), RefusalCode> {
    if ctx.canaries.iter().any(|c| c == req.recipient) {
        return Err(RefusalCode::Canary);
    }
    match ctx.recipient {
        None => Err(RefusalCode::NoRecipient),
        Some(r) if r != req.recipient => Err(RefusalCode::PayeeMismatch),
        Some(_) => Ok(()),
    }
}

fn gate_item<'c>(
    ctx: &'c PayCtx,
    req: &PayRequest,
    caller: Caller,
) -> Result<&'c ItemCtx, RefusalCode> {
    let item = ctx
        .item
        .as_ref()
        .filter(|i| i.id == req.item)
        .ok_or(RefusalCode::UnknownItem)?;
    match item.status {
        ItemStatus::Paid | ItemStatus::AssumedPaid | ItemStatus::Unfunded => {
            Err(RefusalCode::AlreadyPaid)
        }
        // A Reserved item is set aside for the vendor's claim; only the claim may pay it.
        ItemStatus::Reserved if caller != Caller::VendorClaim => Err(RefusalCode::AlreadyPaid),
        _ if ctx.state == State::Settled && item.status != ItemStatus::Reserved => {
            Err(RefusalCode::NotExecuting)
        }
        _ => Ok(item),
    }
}

fn gate_evidence(ctx: &PayCtx, item: &ItemCtx, now: u64) -> Result<(), RefusalCode> {
    if matches!(item.exception, Some((_, true)))
        || matches!(item.status, ItemStatus::Eligible | ItemStatus::Reserved)
    {
        return Ok(());
    }
    match ctx.kind {
        Kind::Procurement => match (item.status, item.window_end) {
            (ItemStatus::Delivered, Some(end)) if now >= end => Ok(()),
            _ => Err(RefusalCode::NotDue),
        },
        Kind::MarketMaking => match item.period {
            Some(p) if p.pays() => Ok(()),
            Some(
                PeriodOutcome::Withheld | PeriodOutcome::Review | PeriodOutcome::ResolvedClosed,
            ) => Err(RefusalCode::PeriodWithheld),
            _ => Err(RefusalCode::NotDue),
        },
    }
}

fn gate_amount(ctx: &PayCtx, item: &ItemCtx, req: &PayRequest) -> Result<(), RefusalCode> {
    if req.amount != item.due_amount() {
        return Err(RefusalCode::AmountMismatch);
    }
    match ctx.paid.checked_add(req.amount) {
        Some(after) if after <= ctx.total => {}
        _ => return Err(RefusalCode::CapExceeded),
    }
    if req.amount > ctx.funded.saturating_sub(ctx.paid) {
        return Err(RefusalCode::InsufficientFunds);
    }
    Ok(())
}

fn gate_lock(ctx: &PayCtx) -> Result<(), RefusalCode> {
    if ctx.in_flight {
        Err(RefusalCode::InFlight)
    } else {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const R: &str = "halcyon-mm.testnet";
    const CANARIES: [&str; 2] = ["halcyon-mm-payments.testnet", "halcyon-treasury.testnet"];

    fn canaries() -> Vec<AccountId> {
        CANARIES.iter().map(|s| s.to_string()).collect()
    }

    fn item(status: ItemStatus) -> ItemCtx {
        ItemCtx {
            id: 1,
            amount: 12_000_000,
            status,
            window_end: None,
            period: None,
            exception: None,
        }
    }

    fn ctx(c: &[AccountId]) -> PayCtx<'_> {
        PayCtx {
            state: State::Executing,
            kind: Kind::Procurement,
            canaries: c,
            recipient: Some(R),
            item: Some(item(ItemStatus::Eligible)),
            total: 36_000_000,
            paid: 0,
            funded: 36_000_000,
            in_flight: false,
        }
    }

    fn req(amount: Amount, recipient: &str) -> PayRequest<'_> {
        PayRequest {
            item: 1,
            amount,
            recipient,
        }
    }

    const AGENT: Caller = Caller::Agent { key_revoked: false };

    #[test]
    fn happy_path_pays() {
        let c = canaries();
        assert_eq!(
            check_pay(&ctx(&c), &req(12_000_000, R), 0, AGENT),
            Ok(PayPlan {
                item: 1,
                amount: 12_000_000,
                recipient: R.into()
            })
        );
    }

    /// One test per refusal code, each set up so every earlier gate passes.
    #[test]
    fn every_refusal_code_in_gate_order() {
        let c = canaries();
        let base = || ctx(&c);
        let ok = req(12_000_000, R);
        let mut x;

        assert_eq!(
            check_pay(&base(), &ok, 0, Caller::Agent { key_revoked: true }),
            Err(RefusalCode::Revoked)
        );
        x = base();
        x.state = State::Attested;
        assert_eq!(check_pay(&x, &ok, 0, AGENT), Err(RefusalCode::NotExecuting));
        assert_eq!(
            check_pay(&base(), &req(12_000_000, CANARIES[0]), 0, AGENT),
            Err(RefusalCode::Canary)
        );
        x = base();
        x.recipient = None;
        assert_eq!(check_pay(&x, &ok, 0, AGENT), Err(RefusalCode::NoRecipient));
        assert_eq!(
            check_pay(
                &base(),
                &req(12_000_000, "halcyon-markets.testnet"),
                0,
                AGENT
            ),
            Err(RefusalCode::PayeeMismatch)
        );
        assert_eq!(
            check_pay(
                &base(),
                &PayRequest {
                    item: 9,
                    amount: 12_000_000,
                    recipient: R
                },
                0,
                AGENT
            ),
            Err(RefusalCode::UnknownItem)
        );
        x = base();
        x.item = Some(item(ItemStatus::Paid));
        assert_eq!(check_pay(&x, &ok, 0, AGENT), Err(RefusalCode::AlreadyPaid));
        x = base();
        x.item = Some(item(ItemStatus::Open));
        assert_eq!(check_pay(&x, &ok, 0, AGENT), Err(RefusalCode::NotDue));
        x = base();
        x.kind = Kind::MarketMaking;
        x.item = Some(ItemCtx {
            period: Some(PeriodOutcome::Withheld),
            ..item(ItemStatus::Open)
        });
        assert_eq!(
            check_pay(&x, &ok, 0, AGENT),
            Err(RefusalCode::PeriodWithheld)
        );
        assert_eq!(
            check_pay(&base(), &req(12_000_001, R), 0, AGENT),
            Err(RefusalCode::AmountMismatch)
        );
        x = base();
        x.paid = 30_000_000;
        assert_eq!(check_pay(&x, &ok, 0, AGENT), Err(RefusalCode::CapExceeded));
        x = base();
        x.funded = 11_999_999;
        assert_eq!(
            check_pay(&x, &ok, 0, AGENT),
            Err(RefusalCode::InsufficientFunds)
        );
        x = base();
        x.in_flight = true;
        assert_eq!(check_pay(&x, &ok, 0, AGENT), Err(RefusalCode::InFlight));
    }

    #[test]
    fn earlier_gates_win() {
        let c = canaries();
        let mut x = ctx(&c);
        x.in_flight = true;
        x.funded = 0;
        // Wrong recipient, wrong amount, no funds and a lock: the recipient gate reports first.
        assert_eq!(
            check_pay(&x, &req(1, "halcyon-markets.testnet"), 0, AGENT),
            Err(RefusalCode::PayeeMismatch)
        );
    }

    #[test]
    fn procurement_window_lapse_counts_as_acceptance() {
        let c = canaries();
        let mut x = ctx(&c);
        x.item = Some(ItemCtx {
            window_end: Some(500),
            ..item(ItemStatus::Delivered)
        });
        assert_eq!(
            check_pay(&x, &req(12_000_000, R), 499, AGENT),
            Err(RefusalCode::NotDue)
        );
        assert!(check_pay(&x, &req(12_000_000, R), 500, AGENT).is_ok());
        x.item = Some(ItemCtx {
            window_end: Some(500),
            ..item(ItemStatus::Disputed)
        });
        assert_eq!(
            check_pay(&x, &req(12_000_000, R), 900, AGENT),
            Err(RefusalCode::NotDue)
        );
    }

    #[test]
    fn approved_exception_changes_amount_and_can_waive_evidence() {
        let c = canaries();
        let mut x = ctx(&c);
        x.kind = Kind::MarketMaking;
        x.item = Some(ItemCtx {
            period: Some(PeriodOutcome::Withheld),
            exception: Some((5_000_000, true)),
            ..item(ItemStatus::Open)
        });
        assert_eq!(
            check_pay(&x, &req(12_000_000, R), 0, AGENT),
            Err(RefusalCode::AmountMismatch)
        );
        assert!(check_pay(&x, &req(5_000_000, R), 0, AGENT).is_ok());
        x.item = Some(ItemCtx {
            period: Some(PeriodOutcome::Withheld),
            exception: Some((5_000_000, false)),
            ..item(ItemStatus::Open)
        });
        assert_eq!(
            check_pay(&x, &req(5_000_000, R), 0, AGENT),
            Err(RefusalCode::PeriodWithheld)
        );
    }

    #[test]
    fn claim_and_close_skip_the_key_gate_and_reserved_items_are_claim_only() {
        let c = canaries();
        let mut x = ctx(&c);
        x.state = State::Settled;
        x.item = Some(item(ItemStatus::Reserved));
        assert!(check_pay(&x, &req(12_000_000, R), 0, Caller::VendorClaim).is_ok());
        assert_eq!(
            check_pay(&x, &req(12_000_000, R), 0, Caller::Close),
            Err(RefusalCode::NotExecuting)
        );
        x.item = Some(item(ItemStatus::Eligible));
        assert_eq!(
            check_pay(&x, &req(12_000_000, R), 0, Caller::VendorClaim),
            Err(RefusalCode::NotExecuting)
        );
        let mut y = ctx(&c);
        y.item = Some(item(ItemStatus::Reserved));
        assert_eq!(
            check_pay(&y, &req(12_000_000, R), 0, AGENT),
            Err(RefusalCode::AlreadyPaid)
        );
        assert!(check_pay(&ctx(&c), &req(12_000_000, R), 0, Caller::Close).is_ok());
    }

    #[test]
    fn exception_request_passes_gates_one_to_three_only() {
        let c = canaries();
        let mut x = ctx(&c);
        x.item = Some(item(ItemStatus::Open));
        x.funded = 0;
        x.in_flight = true;
        assert_eq!(check_exception_request(&x, 1, AGENT), Ok(()));
        assert_eq!(
            check_exception_request(&x, 2, AGENT),
            Err(RefusalCode::UnknownItem)
        );
        assert_eq!(
            check_exception_request(&x, 1, Caller::Agent { key_revoked: true }),
            Err(RefusalCode::Revoked)
        );
    }
}
