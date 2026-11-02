//! OutLayer entry: JSON on stdin, JCS on stdout. The seed comes only from the `PROTECTED_PAYEE_SEED` secret.

use accord_jobkit::{error_output, http::default_http, keys::seed_from_env, main_with};
use accord_payee::{run, Deps, SEED_VAR};

fn main() {
    main_with(|input| match seed_from_env(SEED_VAR) {
        Ok(seed) => {
            let http = default_http();
            run(input, &Deps::enclave(http.as_ref(), seed))
        }
        Err(e) => error_output(accord_jobkit::mode(input), e),
    })
}
