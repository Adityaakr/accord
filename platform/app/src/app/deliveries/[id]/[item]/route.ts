// /app/deliveries/<agreement>/<item>: the same response as /app/api/deliveries/<agreement>/<item>. Older rooms' on-chain
// evidence URIs point at https://<site>/deliveries/<agreement>/<item>, which the site redirects here.
export { GET } from "../../../api/deliveries/[id]/[item]/route";

export const dynamic = "force-dynamic";
