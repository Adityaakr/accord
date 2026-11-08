//! Which accounts the jobs serve (DECISIONS.md section 25): only agreements an Accord factory created. The factories
//! are compiled into every build; an input never names one. A job checks the account before it spends anything on
//! it (a model call, a domain fetch, a mainnet read): the id is `a<n>.<factory>` for a compiled factory, the
//! agreement's own view names that factory and `n`, and the factory's `is_agreement` says yes.

use serde_json::{json, Value};

/// The testnet factories whose agreements the deployed jobs serve: test USDC and Circle USDC (DECISIONS.md 24).
pub const FACTORIES: &[&str] = &["accord-v2.testnet", "accord-usdc.testnet"];

/// The compiled list as owned strings, for a job's dependencies.
pub fn compiled() -> Vec<String> {
    FACTORIES.iter().map(|f| f.to_string()).collect()
}

/// `a<n>.<factory>` for one of `factories`: that factory and `n`.
pub fn agreement_of<'f>(account: &str, factories: &'f [String]) -> Option<(&'f str, u64)> {
    factories.iter().find_map(|f| {
        let n = account
            .strip_prefix('a')?
            .strip_suffix(f.as_str())?
            .strip_suffix('.')?;
        let ok = !n.is_empty() && !n.starts_with('0') && n.bytes().all(|b| b.is_ascii_digit());
        Some((f.as_str(), n.parse().ok().filter(|_| ok)?))
    })
}

#[derive(Debug, PartialEq, Eq)]
pub enum Refused {
    /// Not an Accord agreement: final, the job does nothing for it.
    NotAccord(&'static str),
    /// The factory could not be read: retryable.
    Unreadable(String),
}

/// Checks `account` against the compiled factories, its own `get_agreement` view and the factory's `is_agreement`.
/// `is_agreement` is the factory's view (`|factory, args| view_json(rpc, factory, "is_agreement", args, ..)`).
pub fn check(
    account: &str,
    view: &Value,
    factories: &[String],
    is_agreement: impl FnOnce(&str, &Value) -> Result<Value, String>,
) -> Result<(), Refused> {
    let (factory, n) = agreement_of(account, factories).ok_or(Refused::NotAccord(
        "not an agreement id of an Accord factory",
    ))?;
    if view.get("factory").and_then(Value::as_str) != Some(factory)
        || view.get("id").and_then(Value::as_u64) != Some(n)
    {
        return Err(Refused::NotAccord(
            "the agreement's state names another factory or id",
        ));
    }
    match is_agreement(factory, &json!({"account": account})) {
        Ok(Value::Bool(true)) => Ok(()),
        Ok(_) => Err(Refused::NotAccord(
            "the factory did not create this account",
        )),
        Err(e) => Err(Refused::Unreadable(format!("is_agreement: {e}"))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn f() -> Vec<String> {
        compiled()
    }

    #[test]
    fn only_factory_agreement_ids_parse() {
        assert_eq!(
            agreement_of("a6.accord-v2.testnet", &f()),
            Some(("accord-v2.testnet", 6))
        );
        assert_eq!(
            agreement_of("a12.accord-usdc.testnet", &f()),
            Some(("accord-usdc.testnet", 12))
        );
        for bad in [
            "evil-room.testnet",
            "a6.evil-accord-v2.testnet",
            "a6accord-v2.testnet",
            "a.accord-v2.testnet",
            "a06.accord-v2.testnet",
            "ax6.accord-v2.testnet",
            "b6.accord-v2.testnet",
            "a6.x.accord-v2.testnet",
            "accord-v2.testnet",
        ] {
            assert_eq!(agreement_of(bad, &f()), None, "{bad}");
        }
    }

    #[test]
    fn the_view_and_the_factory_must_agree() {
        let view = json!({"id": 6, "factory": "accord-v2.testnet"});
        let yes = |_: &str, _: &Value| Ok(json!(true));
        assert_eq!(check("a6.accord-v2.testnet", &view, &f(), yes), Ok(()));
        assert!(matches!(
            check("a7.accord-v2.testnet", &view, &f(), yes),
            Err(Refused::NotAccord(_))
        ));
        let other = json!({"id": 6, "factory": "rogue.testnet"});
        assert!(matches!(
            check("a6.accord-v2.testnet", &other, &f(), yes),
            Err(Refused::NotAccord(_))
        ));
        let no = |_: &str, _: &Value| Ok(json!(false));
        assert!(matches!(
            check("a6.accord-v2.testnet", &view, &f(), no),
            Err(Refused::NotAccord(_))
        ));
        let down = |_: &str, _: &Value| Err("timeout".to_string());
        assert!(matches!(
            check("a6.accord-v2.testnet", &view, &f(), down),
            Err(Refused::Unreadable(_))
        ));
        let asked = std::cell::RefCell::new(String::new());
        let _ = check("a6.accord-v2.testnet", &view, &f(), |fac, args| {
            *asked.borrow_mut() = format!("{fac} {args}");
            Ok(json!(true))
        });
        assert_eq!(
            *asked.borrow(),
            r#"accord-v2.testnet {"account":"a6.accord-v2.testnet"}"#
        );
    }
}
