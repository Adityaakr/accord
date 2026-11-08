//! RFC 8785 (JCS) canonical JSON and its SHA-256. Signatures are always over the raw JCS bytes.
//!
//! The writer is ours rather than `serde_jcs`: RFC 8785 orders object keys by their UTF-16 code units, and the
//! shared vectors (`tests/jcs_vectors.json`, written by the TypeScript `canonicalize`) showed `serde_jcs` 0.1
//! ordering keys outside the Basic Multilingual Plane differently.

use serde::Serialize;
use serde_json::Value;
use sha2::{Digest, Sha256};

/// The JCS bytes of `value`.
pub fn jcs<T: Serialize + ?Sized>(value: &T) -> Vec<u8> {
    let v = serde_json::to_value(value).expect("JCS encoding of a serialisable value");
    let mut out = Vec::with_capacity(256);
    write_canonical(&v, &mut out);
    out
}

fn write_canonical(v: &Value, out: &mut Vec<u8>) {
    match v {
        Value::Null | Value::Bool(_) | Value::String(_) => {
            // serde_json escapes strings exactly as ECMAScript's JSON.stringify does: `"` `\\`, the short forms
            // for \b \f \n \r \t, `\u00xx` (lowercase) for other control characters, everything else as UTF-8.
            serde_json::to_writer(&mut *out, v).expect("writing to a Vec")
        }
        Value::Number(n) => match (n.as_i64(), n.as_u64(), n.as_f64()) {
            (Some(i), _, _) => out.extend_from_slice(i.to_string().as_bytes()),
            (_, Some(u), _) => out.extend_from_slice(u.to_string().as_bytes()),
            (_, _, Some(f)) => out.extend_from_slice(ryu_js::Buffer::new().format(f).as_bytes()),
            _ => unreachable!("a JSON number is an integer or a float"),
        },
        Value::Array(items) => {
            out.push(b'[');
            for (i, item) in items.iter().enumerate() {
                if i > 0 {
                    out.push(b',');
                }
                write_canonical(item, out);
            }
            out.push(b']');
        }
        Value::Object(map) => {
            let mut keys: Vec<&String> = map.keys().collect();
            keys.sort_by(|a, b| a.encode_utf16().cmp(b.encode_utf16()));
            out.push(b'{');
            for (i, k) in keys.into_iter().enumerate() {
                if i > 0 {
                    out.push(b',');
                }
                serde_json::to_writer(&mut *out, k).expect("writing to a Vec");
                out.push(b':');
                write_canonical(&map[k], out);
            }
            out.push(b'}');
        }
    }
}

pub fn sha256(bytes: &[u8]) -> [u8; 32] {
    Sha256::digest(bytes).into()
}

/// `sha256(JCS(value))`.
pub fn jcs_sha256<T: Serialize + ?Sized>(value: &T) -> [u8; 32] {
    sha256(&jcs(value))
}

pub fn to_hex(h: &[u8; 32]) -> String {
    hex::encode(h)
}

/// The bytes a job signs: `JCS(output without "sig")`. Every job output is a JSON object carrying its signature
/// as `"sig"`; the verifier drops that one field and re-encodes, so no other field can change unnoticed.
pub fn signed_bytes(output: &serde_json::Value) -> Vec<u8> {
    match output {
        serde_json::Value::Object(map) => {
            let mut m = map.clone();
            m.remove("sig");
            jcs(&serde_json::Value::Object(m))
        }
        other => jcs(other),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn jcs_sorts_keys_and_strips_whitespace() {
        let v = json!({"b": 1, "a": [true, null, "x"], "c": {"z": 1, "y": 2}});
        assert_eq!(
            String::from_utf8(jcs(&v)).unwrap(),
            r#"{"a":[true,null,"x"],"b":1,"c":{"y":2,"z":1}}"#
        );
    }

    #[test]
    fn signed_bytes_drop_only_the_signature() {
        let v = json!({"mode": "pubkey", "sig": "abc", "b": [1]});
        assert_eq!(signed_bytes(&v), br#"{"b":[1],"mode":"pubkey"}"#.to_vec());
    }

    #[test]
    fn hash_is_lowercase_hex_of_sha256() {
        assert_eq!(
            to_hex(&jcs_sha256(&json!({}))),
            "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a"
        );
    }
}
