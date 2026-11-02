//! The one HTTP surface every job uses. Inside OutLayer it is `wasi-http-client` (the only outbound path from
//! `wasm32-wasip2`); natively it is `ureq` behind the `native` feature; in tests it is a fixture.
//! Redirects are never followed, and a body larger than `max_bytes` is an error, read no further than that.

use std::time::Duration;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Method {
    Get,
    Post,
}

#[derive(Clone, Debug)]
pub struct Request {
    pub method: Method,
    pub url: String,
    pub headers: Vec<(String, String)>,
    pub body: Option<Vec<u8>>,
    pub max_bytes: usize,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Response {
    pub status: u16,
    /// The `Content-Type` header as sent, if any.
    pub content_type: Option<String>,
    pub body: Vec<u8>,
}

pub trait Http {
    fn send(&self, req: &Request) -> Result<Response, String>;
}

pub const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
/// OutLayer aborts any single HTTPS call after 30 s; the native transport stops earlier.
pub const CALL_TIMEOUT: Duration = Duration::from_secs(25);

/// The transport for this build: WASI HTTP in the enclave, ureq natively with `native`, otherwise none.
pub fn default_http() -> Box<dyn Http> {
    #[cfg(all(target_arch = "wasm32", target_os = "wasi"))]
    {
        Box::new(wasi::WasiHttp)
    }
    #[cfg(all(
        not(all(target_arch = "wasm32", target_os = "wasi")),
        feature = "native"
    ))]
    {
        Box::new(native::UreqHttp::new())
    }
    #[cfg(all(
        not(all(target_arch = "wasm32", target_os = "wasi")),
        not(feature = "native")
    ))]
    {
        Box::new(Unavailable)
    }
}

/// No transport in this build (a native build without `native`): every call fails.
pub struct Unavailable;
impl Http for Unavailable {
    fn send(&self, _: &Request) -> Result<Response, String> {
        Err("no HTTP transport in this build (enable the `native` feature)".into())
    }
}

#[cfg(all(target_arch = "wasm32", target_os = "wasi"))]
mod wasi {
    use super::*;
    use wasi_http_client::Client;

    pub struct WasiHttp;

    impl Http for WasiHttp {
        fn send(&self, req: &Request) -> Result<Response, String> {
            let client = Client::new();
            let mut b = match req.method {
                Method::Get => client.get(&req.url),
                Method::Post => client.post(&req.url),
            };
            for (k, v) in &req.headers {
                b = b.header(k.as_str(), v.as_str());
            }
            if let Some(body) = &req.body {
                b = b.body(body);
            }
            let resp = b
                .connect_timeout(CONNECT_TIMEOUT)
                .send()
                .map_err(|e| format!("http: {e}"))?;
            let status = resp.status();
            let content_type = resp
                .headers()
                .iter()
                .find(|(k, _)| k.eq_ignore_ascii_case("content-type"))
                .map(|(_, v)| v.clone());
            let mut body = Vec::new();
            while let Some(chunk) = resp.chunk(16 * 1024).map_err(|e| format!("http: {e}"))? {
                body.extend_from_slice(&chunk);
                if body.len() > req.max_bytes {
                    return Err(format!("body exceeds {} bytes", req.max_bytes));
                }
            }
            Ok(Response {
                status,
                content_type,
                body,
            })
        }
    }
}

#[cfg(all(
    not(all(target_arch = "wasm32", target_os = "wasi")),
    feature = "native"
))]
pub mod native {
    use super::*;
    use std::io::Read;

    pub struct UreqHttp(ureq::Agent);

    impl UreqHttp {
        pub fn new() -> Self {
            Self(
                ureq::AgentBuilder::new()
                    .timeout_connect(CONNECT_TIMEOUT)
                    .timeout(CALL_TIMEOUT)
                    .redirects(0)
                    .build(),
            )
        }
    }

    impl Default for UreqHttp {
        fn default() -> Self {
            Self::new()
        }
    }

    impl Http for UreqHttp {
        fn send(&self, req: &Request) -> Result<Response, String> {
            let mut r = match req.method {
                Method::Get => self.0.get(&req.url),
                Method::Post => self.0.post(&req.url),
            };
            for (k, v) in &req.headers {
                r = r.set(k, v);
            }
            let resp = match &req.body {
                Some(b) => r.send_bytes(b),
                None => r.call(),
            };
            let resp = match resp {
                Ok(resp) | Err(ureq::Error::Status(_, resp)) => resp,
                Err(e) => return Err(format!("http: {e}")),
            };
            let status = resp.status();
            let content_type = resp.header("content-type").map(String::from);
            let mut body = Vec::new();
            resp.into_reader()
                .take(req.max_bytes as u64 + 1)
                .read_to_end(&mut body)
                .map_err(|e| format!("http: {e}"))?;
            if body.len() > req.max_bytes {
                return Err(format!("body exceeds {} bytes", req.max_bytes));
            }
            Ok(Response {
                status,
                content_type,
                body,
            })
        }
    }
}
