//! NEP-297 events: `standard: "accord"`, `version: "1.0.0"`, one event per log line (INTERFACES.md 4.6).

use near_sdk::env;
use serde_json::Value;

pub fn emit(event: &str, data: Value) {
    let line = serde_json::json!({
        "standard": "accord",
        "version": "1.0.0",
        "event": event,
        "data": [data],
    });
    env::log_str(&format!("EVENT_JSON:{line}"));
}
