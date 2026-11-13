// Entry for app/public/tender-tlock.mjs: the drand timelock helpers tender-bid.mjs needs, bundled so the one-file
// script stays install-free. Rebuild with `make tlock-bundle`; tender-bid.mjs pins the bundle's sha256.
export { timelockBidSecret, timelockRoundFor } from "../../packages/sdk/dist/timelock.js";
