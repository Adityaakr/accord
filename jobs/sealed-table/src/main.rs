//! OutLayer entry: one JSON object on stdin, the signed JSON output on stdout.

fn main() {
    #[cfg(all(target_arch = "wasm32", target_os = "wasi"))]
    {
        use accord_sealed_table::{host::WasiHost, run, state::ChainSource};
        accord_jobkit::main_with(|input| {
            let host = WasiHost::new();
            let src = ChainSource::new(&host);
            let secrets = run::secrets_from_env(accord_jobkit::mode(input));
            run::handle(&host, &src, input, secrets)
        });
    }
    #[cfg(not(all(target_arch = "wasm32", target_os = "wasi")))]
    {
        eprintln!(
            "accord-sealed-table runs inside OutLayer (wasm32-wasip2); natively, use the tests"
        );
        std::process::exit(2);
    }
}
