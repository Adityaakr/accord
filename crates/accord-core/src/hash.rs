//! RFC 8785 (JCS) canonical JSON and its SHA-256. Signatures are always over the raw JCS bytes.

use serde::Serialize;
use sha2::{Digest, Sha256};

/// The JCS bytes of `value`.
pub fn jcs<T: Serialize + ?Sized>(value: &T) -> Vec<u8> {
    serde_jcs::to_vec(value).expect("JCS encoding of a serialisable value")
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
    fn hash_is_lowercase_hex_of_sha256() {
        assert_eq!(
            to_hex(&jcs_sha256(&json!({}))),
            "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a"
        );
    }
}
