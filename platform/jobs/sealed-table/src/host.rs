//! Everything the job takes from its environment, behind one trait so the logic runs natively against fixtures:
//! HTTPS (with response headers, which the Intel collateral needs), randomness, the clock, and sleeping.
//! Inside OutLayer it is `WasiHost` (WASI HTTP directly, bodies written in 4 KB chunks); the tests use recording
//! and replaying hosts (`tests/common`).

use accord_jobkit::http::{Http, Request, Response};
use std::time::Duration;

pub use accord_jobkit::http::{Method, Request as HttpRequest};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct HttpResponse {
    pub status: u16,
    /// Header names lowercased.
    pub headers: Vec<(String, String)>,
    pub body: Vec<u8>,
}

impl HttpResponse {
    pub fn header(&self, name: &str) -> Option<&str> {
        self.headers
            .iter()
            .find(|(k, _)| k.eq_ignore_ascii_case(name))
            .map(|(_, v)| v.as_str())
    }
}

pub trait Host {
    fn send(&self, req: &Request) -> Result<HttpResponse, String>;
    /// `n` bytes from a cryptographically secure source.
    fn random(&self, n: usize) -> Vec<u8>;
    /// Unix seconds (the quote collateral's validity is checked against it).
    fn now_secs(&self) -> u64;
    /// Milliseconds since an arbitrary start, for deadlines.
    fn millis(&self) -> u64;
    fn sleep(&self, d: Duration);
}

/// `accord-jobkit`'s transport over a [`Host`], so its pinned NEAR RPC client runs unchanged.
pub struct JobkitHttp<'a>(pub &'a dyn Host);

impl Http for JobkitHttp<'_> {
    fn send(&self, req: &Request) -> Result<Response, String> {
        let r = self.0.send(req)?;
        Ok(Response {
            status: r.status,
            content_type: r.header("content-type").map(String::from),
            body: r.body,
        })
    }
}

pub fn get(url: &str, headers: &[(&str, &str)], max_bytes: usize) -> Request {
    Request {
        method: Method::Get,
        url: url.to_string(),
        headers: headers
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect(),
        body: None,
        max_bytes,
    }
}

pub fn post(url: &str, headers: &[(&str, &str)], body: Vec<u8>, max_bytes: usize) -> Request {
    Request {
        method: Method::Post,
        body: Some(body),
        ..get(url, headers, max_bytes)
    }
}

#[cfg(all(target_arch = "wasm32", target_os = "wasi"))]
pub use wasi_host::WasiHost;

#[cfg(all(target_arch = "wasm32", target_os = "wasi"))]
mod wasi_host {
    use super::*;
    use std::time::{Instant, SystemTime, UNIX_EPOCH};
    use wasi::http::outgoing_handler;
    use wasi::http::types::{
        Fields, Method as WMethod, OutgoingBody, OutgoingRequest, RequestOptions, Scheme,
    };
    use wasi::io::streams::StreamError;

    /// WASI HTTP's `blocking-write-and-flush` takes at most 4096 bytes per call (wasmtime enforces it), so request
    /// bodies are written in chunks. `wasi-http-client 0.2.1` writes the whole body in one call and traps on
    /// anything larger, which a completion request or a GPU evidence payload always is.
    const WRITE_CHUNK: usize = 4096;
    const CONNECT_TIMEOUT_NS: u64 = 10_000_000_000;
    /// OutLayer aborts any single HTTPS call after 30 s.
    const BYTES_TIMEOUT_NS: u64 = 29_000_000_000;

    /// OutLayer's runtime: WASI HTTP is the only outbound path from `wasm32-wasip2`.
    pub struct WasiHost {
        start: Instant,
    }

    impl WasiHost {
        pub fn new() -> Self {
            Self {
                start: Instant::now(),
            }
        }
    }

    impl Default for WasiHost {
        fn default() -> Self {
            Self::new()
        }
    }

    fn split_url(url: &str) -> Result<(&str, &str), String> {
        let rest = url.strip_prefix("https://").ok_or("only https URLs")?;
        Ok(match rest.find('/') {
            Some(i) => (&rest[..i], &rest[i..]),
            None => (rest, "/"),
        })
    }

    fn send(req: &Request) -> Result<HttpResponse, String> {
        let (authority, path) = split_url(&req.url)?;
        let headers = Fields::new();
        for (k, v) in &req.headers {
            headers
                .append(&k.to_ascii_lowercase(), &v.as_bytes().to_vec())
                .map_err(|e| format!("header {k}: {e:?}"))?;
        }
        let out = OutgoingRequest::new(headers);
        out.set_method(match req.method {
            Method::Get => &WMethod::Get,
            Method::Post => &WMethod::Post,
        })
        .map_err(|()| "method")?;
        out.set_scheme(Some(&Scheme::Https))
            .map_err(|()| "scheme")?;
        out.set_authority(Some(authority))
            .map_err(|()| "authority")?;
        out.set_path_with_query(Some(path)).map_err(|()| "path")?;
        let body = out.body().map_err(|()| "request body")?;
        let options = RequestOptions::new();
        let _ = options.set_connect_timeout(Some(CONNECT_TIMEOUT_NS));
        let _ = options.set_first_byte_timeout(Some(BYTES_TIMEOUT_NS));
        let _ = options.set_between_bytes_timeout(Some(BYTES_TIMEOUT_NS));
        // Start the request first, then stream the body: a body larger than the host's buffer only drains once the
        // request is in flight.
        let future =
            outgoing_handler::handle(out, Some(options)).map_err(|e| format!("http: {e:?}"))?;
        if let Some(bytes) = &req.body {
            let stream = body.write().map_err(|()| "request body stream")?;
            for chunk in bytes.chunks(WRITE_CHUNK) {
                stream
                    .blocking_write_and_flush(chunk)
                    .map_err(|e| format!("request write: {e:?}"))?;
            }
            drop(stream);
        }
        OutgoingBody::finish(body, None).map_err(|e| format!("request finish: {e:?}"))?;
        let resp = match future.get() {
            Some(r) => r,
            None => {
                future.subscribe().block();
                future.get().ok_or("no response")?
            }
        }
        .map_err(|()| "response taken")?
        .map_err(|e| format!("http: {e:?}"))?;
        let status = resp.status();
        let headers = resp
            .headers()
            .entries()
            .into_iter()
            .map(|(k, v)| {
                (
                    k.to_ascii_lowercase(),
                    String::from_utf8_lossy(&v).into_owned(),
                )
            })
            .collect();
        let incoming = resp.consume().map_err(|()| "response body")?;
        let stream = incoming.stream().map_err(|()| "response stream")?;
        let mut body = Vec::new();
        loop {
            match stream.blocking_read(64 * 1024) {
                Ok(c) => {
                    body.extend_from_slice(&c);
                    if body.len() > req.max_bytes {
                        return Err(format!("body exceeds {} bytes", req.max_bytes));
                    }
                }
                Err(StreamError::Closed) => break,
                Err(e) => return Err(format!("response read: {e:?}")),
            }
        }
        drop(stream);
        drop(incoming);
        Ok(HttpResponse {
            status,
            headers,
            body,
        })
    }

    impl Host for WasiHost {
        fn send(&self, req: &Request) -> Result<HttpResponse, String> {
            send(req)
        }

        fn random(&self, n: usize) -> Vec<u8> {
            wasi::random::random::get_random_bytes(n as u64)
        }

        fn now_secs(&self) -> u64 {
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0)
        }

        fn millis(&self) -> u64 {
            self.start.elapsed().as_millis() as u64
        }

        fn sleep(&self, d: Duration) {
            std::thread::sleep(d)
        }
    }
}
