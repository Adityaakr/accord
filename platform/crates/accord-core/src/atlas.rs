//! Market making: hidden slot times, the pass rule and the period decision (ARCHITECTURE.md section 9).

use crate::types::*;
use hmac::{Hmac, Mac};
use sha2::Sha256;

/// Seconds at the end of every slot window that a slot time never falls into, so the first final block after it
/// still lands inside the window.
pub const SLOT_MARGIN_SECS: u64 = 10;

/// Start and end (exclusive) of slot `slot`'s window in the period that starts at `period_start`.
pub fn slot_window(period_start: u64, period_secs: u64, slots: u8, slot: u8) -> (u64, u64) {
    let window = period_secs / u64::from(slots.max(1));
    let start = period_start + u64::from(slot) * window;
    (start, start + window)
}

/// `window_start + (HMAC-SHA256(seed, agreement ‖ period ‖ slot) mod (window − 10))`. The message is the agreement
/// id's UTF-8 bytes, the period as 4 big-endian bytes and the slot as 1 byte; the HMAC's first 8 bytes, big-endian,
/// are the number reduced. Only the observer job, which holds the seed, can compute it.
pub fn slot_time(
    seed: &[u8],
    agreement: &str,
    period: u32,
    slot: u8,
    period_start: u64,
    period_secs: u64,
    slots: u8,
) -> u64 {
    let (start, end) = slot_window(period_start, period_secs, slots, slot);
    let span = (end - start).saturating_sub(SLOT_MARGIN_SECS).max(1);
    let mut mac = Hmac::<Sha256>::new_from_slice(seed).expect("HMAC takes any key length");
    mac.update(agreement.as_bytes());
    mac.update(&period.to_be_bytes());
    mac.update(&[slot]);
    let out = mac.finalize().into_bytes();
    let mut first = [0u8; 8];
    first.copy_from_slice(&out[..8]);
    start + u64::from_be_bytes(first) % span
}

/// One observation meets every condition of the terms.
pub fn passes(terms: &AtlasTerms, o: &Observation, require_two_sided: bool) -> bool {
    o.spread_bps <= terms.max_spread_bps
        && o.depth_bid >= terms.min_depth_quote
        && o.depth_ask >= terms.min_depth_quote
        && (!require_two_sided || o.two_sided)
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct PeriodSummary {
    pub outcome: PeriodOutcome,
    pub passed: u8,
    pub observed: u8,
    /// Two-sided slots over observed slots, in basis points. Reported beside the result, never the pay rule.
    pub uptime_bps: u32,
}

/// The period decision. `observations` holds what was recorded for the period's slots (at most one per slot);
/// `conflict` is set when a different signed observation was offered for a recorded slot.
pub fn evaluate(
    terms: &AtlasTerms,
    observations: &[Observation],
    require_two_sided: bool,
    conflict: bool,
) -> PeriodSummary {
    let slots = terms.slots_per_period;
    let observed = observations.len().min(usize::from(slots)) as u8;
    let passed = observations
        .iter()
        .filter(|o| passes(terms, o, require_two_sided))
        .count()
        .min(usize::from(slots)) as u8;
    let two_sided = observations.iter().filter(|o| o.two_sided).count() as u32;
    let uptime_bps = if observed == 0 {
        0
    } else {
        two_sided * 10_000 / u32::from(observed)
    };
    let unobserved = slots - observed;
    let outcome = if conflict {
        PeriodOutcome::Review
    } else if passed >= terms.pass_threshold {
        PeriodOutcome::Eligible
    } else if passed + unobserved >= terms.pass_threshold {
        PeriodOutcome::Review
    } else {
        PeriodOutcome::Withheld
    };
    PeriodSummary {
        outcome,
        passed,
        observed,
        uptime_bps,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::terms::fixtures;

    fn obs(slot: u8, spread: u32, depth: Amount, two: bool) -> Observation {
        Observation {
            agreement: "a7.accord-v1.testnet".into(),
            period: 0,
            slot,
            slot_time: 100,
            venue: fixtures::venue(),
            band_bps: 200,
            venue_block: BlockRef {
                height: 1,
                hash: "h".into(),
                time: 101,
            },
            mid: "1.234".into(),
            spread_bps: spread,
            depth_bid: depth,
            depth_ask: depth,
            two_sided: two,
        }
    }

    fn atlas() -> AtlasTerms {
        fixtures::market_making().atlas.unwrap()
    }

    #[test]
    fn slot_times_stay_inside_their_windows_and_differ() {
        let seed = [9u8; 32];
        let mut seen = Vec::new();
        for slot in 0..6 {
            let t = slot_time(&seed, "a7.accord-v1.testnet", 0, slot, 1_000, 360, 6);
            let (s, e) = slot_window(1_000, 360, 6, slot);
            assert!(
                t >= s && t < e - SLOT_MARGIN_SECS,
                "slot {slot}: {t} not in [{s}, {})",
                e - SLOT_MARGIN_SECS
            );
            seen.push(t - s);
        }
        seen.dedup();
        assert!(seen.len() > 1, "offsets should differ across slots");
        assert_ne!(
            slot_time(&seed, "a7.accord-v1.testnet", 1, 0, 0, 360, 6),
            slot_time(&seed, "a8.accord-v1.testnet", 1, 0, 0, 360, 6)
        );
        assert_ne!(
            slot_time(&seed, "a7", 0, 0, 0, 360, 6),
            slot_time(&[1u8; 32], "a7", 0, 0, 0, 360, 6)
        );
    }

    #[test]
    fn pass_rule_checks_spread_both_depths_and_two_sided() {
        let a = atlas();
        assert!(passes(&a, &obs(0, 60, 2_000_000_000, true), true));
        assert!(!passes(&a, &obs(0, 61, 2_000_000_000, true), true));
        assert!(!passes(&a, &obs(0, 50, 1_999_999_999, true), true));
        assert!(!passes(&a, &obs(0, 50, 2_000_000_000, false), true));
        assert!(passes(&a, &obs(0, 50, 2_000_000_000, false), false));
        let mut one_sided = obs(0, 50, 2_000_000_000, true);
        one_sided.depth_ask = 0;
        assert!(!passes(&a, &one_sided, true));
    }

    #[test]
    fn evaluate_eligible_review_withheld() {
        let a = atlas();
        let good = |s| obs(s, 49, 3_000_000_000, true);
        let bad = |s| obs(s, 49, 100, true);
        let five_of_six: Vec<_> = (0..6)
            .map(|s| if s == 2 { bad(s) } else { good(s) })
            .collect();
        let r = evaluate(&a, &five_of_six, true, false);
        assert_eq!(
            (r.outcome, r.passed, r.observed, r.uptime_bps),
            (PeriodOutcome::Eligible, 5, 6, 10_000)
        );
        // 2 passed, 2 unobserved: the threshold of 4 could still have been met.
        let partial = vec![good(0), good(1), bad(2), bad(3)];
        assert_eq!(
            evaluate(&a, &partial, true, false).outcome,
            PeriodOutcome::Review
        );
        // 3 passed, 3 failed, none unobserved.
        let short: Vec<_> = (0..6)
            .map(|s| if s < 3 { good(s) } else { bad(s) })
            .collect();
        assert_eq!(
            evaluate(&a, &short, true, false).outcome,
            PeriodOutcome::Withheld
        );
        // A logged conflict always means Review.
        assert_eq!(
            evaluate(&a, &five_of_six, true, true).outcome,
            PeriodOutcome::Review
        );
        assert_eq!(
            evaluate(&a, &[], true, false).outcome,
            PeriodOutcome::Review
        );
    }

    #[test]
    fn uptime_is_reported_not_the_rule() {
        let a = atlas();
        let mut v: Vec<_> = (0..6).map(|s| obs(s, 49, 3_000_000_000, true)).collect();
        v[0].two_sided = false;
        let r = evaluate(&a, &v, true, false);
        assert_eq!(
            (r.passed, r.uptime_bps, r.outcome),
            (5, 8_333, PeriodOutcome::Eligible)
        );
    }
}
