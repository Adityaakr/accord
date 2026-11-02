//! Runs step 3 of the Sealed Table (NEAR AI attestation, Intel quote verification with `dcap-qvl`, NVIDIA NRAS)
//! inside `wasm32-wasip2`, the way OutLayer runs the job. A development check, not part of the release:
//! `cargo build --release --target wasm32-wasip2 -p accord-sealed-table --example attest_wasm`, then
//! `wasmtime run -S http --env NEARAI_API_KEY target/wasm32-wasip2/release/examples/attest_wasm.wasm`.

fn main() {
    #[cfg(all(target_arch = "wasm32", target_os = "wasi"))]
    {
        use accord_sealed_table::{
            attest,
            host::{Host, WasiHost},
        };
        let host = WasiHost::new();
        let key = std::env::var("NEARAI_API_KEY").expect("NEARAI_API_KEY");
        let model = std::env::args()
            .nth(1)
            .unwrap_or_else(|| "z-ai/glm-5.3-flash".into());
        let t = host.millis();
        match attest::attest(&host, &key, &model) {
            Ok(a) => {
                println!(
                    "report sha256 {} in {} ms",
                    a.report_sha256,
                    host.millis() - t
                );
                println!(
                    "gateway {} tdx_ok {} {:?}",
                    a.gateway.signing_address, a.gateway.tdx_ok, a.gateway.failures
                );
                for c in &a.candidates {
                    println!(
                        "candidate {} tdx_ok {} gpu {:?} {:?}",
                        c.signing_address, c.tdx_ok, c.gpu_ok, c.failures
                    );
                }
                println!("verified signers {:?}", a.verified_signers());
            }
            Err(e) => println!("attestation failed: {e}"),
        }
    }
}
