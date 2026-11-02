//! The leak filter (ARCHITECTURE.md 8.3 step 6): before a message reaches the other negotiator, every rendering of
//! the sender's private numbers is removed from its reasons. Words can still concede; numbers cannot be copied.
//!
//! Rather than listing renderings, every number in the text is read as a value and compared with each private
//! number under every reading the spec names: base units; whole token units with zero to six decimals (`40`,
//! `40.0`, `40.000000`), with or without thousands separators (`40,000,000`, `1,500.50`); `k` forms (`40k`,
//! `40000k`, `1.5K`); and basis points as basis points (`60`, `60 bps`) or percent (`0.6%`, `0.60 percent`).
//! Other private integers (seconds, counts) are matched as plain integers with or without separators.
//! A match is replaced, suffix included, by `[removed]`.

use serde_json::Value;

pub const REMOVED: &str = "[removed]";

#[derive(Clone, Debug, PartialEq, Eq)]
enum Private {
    /// A token amount in base units (`decimals` places).
    Amount(u128),
    /// Basis points.
    Bps(u128),
    /// Any other integer (seconds, counts).
    Int(u128),
}

fn privates(limits: &Value) -> Vec<Private> {
    let mut out = Vec::new();
    if let Value::Object(m) = limits {
        for (k, v) in m {
            match v {
                Value::String(s) => {
                    if let Ok(n) = s.parse::<u128>() {
                        out.push(Private::Amount(n));
                    }
                }
                Value::Number(n) => {
                    if let Some(n) = n.as_u64() {
                        if k.ends_with("_bps") {
                            out.push(Private::Bps(u128::from(n)));
                        } else {
                            out.push(Private::Int(u128::from(n)));
                        }
                    }
                }
                _ => {}
            }
        }
    }
    out
}

/// A decimal number read from text: `mantissa / 10^scale`.
#[derive(Clone, Copy, Debug)]
struct Num {
    mantissa: u128,
    scale: u32,
}

impl Num {
    /// `self * 10^shift * mul == target` exactly.
    fn equals(&self, target: u128, shift: u32, mul: u128) -> bool {
        // mantissa * 10^shift * mul == target * 10^scale
        let lhs = 10u128
            .checked_pow(shift)
            .and_then(|p| self.mantissa.checked_mul(p))
            .and_then(|x| x.checked_mul(mul));
        let rhs = 10u128
            .checked_pow(self.scale)
            .and_then(|p| target.checked_mul(p));
        matches!((lhs, rhs), (Some(a), Some(b)) if a == b)
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Suffix {
    None,
    K,
    Percent,
    Bps,
}

fn matches(n: Num, suffix: Suffix, p: &Private, decimals: u32) -> bool {
    let mul = if suffix == Suffix::K { 1000 } else { 1 };
    match (p, suffix) {
        (Private::Amount(a), Suffix::None | Suffix::K) => {
            n.equals(*a, 0, mul) || n.equals(*a, decimals, mul)
        }
        (Private::Bps(b), Suffix::None | Suffix::Bps) => n.equals(*b, 0, 1),
        (Private::Bps(b), Suffix::Percent) => n.equals(*b, 2, 1),
        (Private::Int(i), Suffix::None | Suffix::K) => n.equals(*i, 0, mul),
        _ => false,
    }
}

/// Removes every rendering of `limits`' numbers from `text`. `decimals` is the token's (6 for USDC).
pub fn filter(text: &str, limits: &Value, decimals: u8) -> String {
    let ps = privates(limits);
    if ps.is_empty() {
        return text.to_string();
    }
    let decimals = u32::from(decimals);
    let chars: Vec<char> = text.chars().collect();
    let mut out = String::with_capacity(text.len());
    let mut i = 0;
    while i < chars.len() {
        let starts_number = chars[i].is_ascii_digit()
            && (i == 0 || !(chars[i - 1].is_ascii_digit() || chars[i - 1] == '.'))
            || (chars[i] == '.'
                && chars.get(i + 1).is_some_and(|c| c.is_ascii_digit())
                && (i == 0 || !chars[i - 1].is_ascii_digit()));
        if !starts_number {
            out.push(chars[i]);
            i += 1;
            continue;
        }
        // Integer part with optional thousands separators, then an optional fraction.
        let start = i;
        let mut digits = String::new();
        let mut j = i;
        while j < chars.len() {
            let c = chars[j];
            if c.is_ascii_digit() {
                digits.push(c);
                j += 1;
            } else if (c == ',' || c == '_' || c == '\u{202f}' || c == '\u{a0}')
                && chars.get(j + 1).is_some_and(|d| d.is_ascii_digit())
                && !digits.is_empty()
            {
                j += 1;
            } else {
                break;
            }
        }
        let mut scale = 0u32;
        if j < chars.len()
            && chars[j] == '.'
            && chars.get(j + 1).is_some_and(|d| d.is_ascii_digit())
        {
            j += 1;
            while j < chars.len() && chars[j].is_ascii_digit() {
                digits.push(chars[j]);
                scale += 1;
                j += 1;
            }
        }
        let num_end = j;
        // Suffix, allowing one space before a word suffix.
        let rest: String = chars[num_end..].iter().take(10).collect();
        let lower = rest.to_ascii_lowercase();
        let (suffix, suffix_len) = if lower.starts_with('%') {
            (Suffix::Percent, 1)
        } else if lower.starts_with(" %") {
            (Suffix::Percent, 2)
        } else if lower.starts_with(" percent") {
            (Suffix::Percent, 8)
        } else if lower.starts_with("percent") {
            (Suffix::Percent, 7)
        } else if lower.starts_with(" bps") || lower.starts_with(" bp") {
            (Suffix::Bps, if lower.starts_with(" bps") { 4 } else { 3 })
        } else if lower.starts_with("bps") {
            (Suffix::Bps, 3)
        } else if lower.starts_with('k')
            && !lower[1..].starts_with(|c: char| c.is_ascii_alphanumeric())
        {
            (Suffix::K, 1)
        } else {
            (Suffix::None, 0)
        };
        let n = digits
            .parse::<u128>()
            .ok()
            .map(|mantissa| Num { mantissa, scale });
        let hit = n.is_some_and(|n| {
            ps.iter().any(|p| {
                matches(n, suffix, p, decimals)
                    || (suffix != Suffix::None && matches(n, Suffix::None, p, decimals))
            })
        });
        if hit {
            out.push_str(REMOVED);
            i = num_end + suffix_len;
        } else {
            out.extend(&chars[start..num_end]);
            i = num_end;
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn buyer() -> Value {
        json!({"max_total": "40000000", "target_total": "32000000", "max_items": 4,
               "max_duration_secs": 604800, "min_acceptance_window_secs": 120})
    }

    #[test]
    fn removes_every_amount_rendering() {
        let l = buyer();
        for s in [
            "40000000",
            "40,000,000",
            "40",
            "40.0",
            "40.00",
            "40.000",
            "40.0000",
            "40.00000",
            "40.000000",
            "$40",
            "40 USDC",
            "40k",
            "40000k",
            "32",
            "32.00",
            "32,000,000",
        ] {
            let out = filter(&format!("we can do {s} at most"), &l, 6);
            assert!(!out.contains("40") && !out.contains("32"), "{s} -> {out}");
            assert!(out.contains(REMOVED), "{s} -> {out}");
        }
    }

    #[test]
    fn keeps_numbers_that_are_not_private() {
        let l = buyer();
        let t = "Three milestones, 36 USDC, delivered in 2 days; 41 is too much";
        assert_eq!(filter(t, &l, 6), t);
        // A private number inside a longer number is not a match.
        assert_eq!(filter("ref 400000001", &l, 6), "ref 400000001");
    }

    #[test]
    fn removes_seconds_and_counts() {
        let out = filter(
            "a window of 120 s, up to 604,800 seconds and 4 items",
            &buyer(),
            6,
        );
        assert_eq!(
            out,
            "a window of [removed] s, up to [removed] seconds and [removed] items"
        );
    }

    #[test]
    fn removes_bps_and_percent() {
        let l = json!({"max_retainer_per_period": "8000000", "max_spread_bps": 60, "depth_band_bps": 200});
        for s in [
            "60",
            "60 bps",
            "60bps",
            "0.6%",
            "0.60%",
            "0.6 %",
            "0.60 percent",
            "2%",
            "200 bps",
        ] {
            let out = filter(&format!("spread {s} is fine"), &l, 6);
            assert_eq!(out, format!("spread {REMOVED} is fine"), "{s}");
        }
        assert_eq!(filter("spread 0.45% ok", &l, 6), "spread 0.45% ok");
        let out = filter("a retainer of 8, i.e. 8.00 or 8,000,000", &l, 6);
        assert_eq!(out, "a retainer of [removed], i.e. [removed] or [removed]");
    }

    #[test]
    fn fractional_whole_units_and_k() {
        let l = json!({"min_total": "1500500000"});
        for s in [
            "1,500.5",
            "1500.50",
            "1500.500000",
            "1500500000",
            "1,500,500,000",
            "1500500k",
        ] {
            let out = filter(&format!("floor {s}."), &l, 6);
            assert_eq!(out, format!("floor {REMOVED}."), "{s}");
        }
        let l = json!({"min_total": "1500000000"});
        assert_eq!(filter("about 1.5k", &l, 6), format!("about {REMOVED}"));
        assert_eq!(
            filter("about 1.5K total", &l, 6),
            format!("about {REMOVED} total")
        );
    }
}
