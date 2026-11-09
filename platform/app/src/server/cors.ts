// CORS for the app's keyless, read-only routes (GET /api/verify/<id>, the public record CSV, /mcp): any origin may
// read them from a browser, with no credentials. Only these routes answer a preflight; every write route keeps
// answering none, which is what server/origin.ts's same-origin check relies on (a cross-origin page cannot send
// x-accord-site-host or a JSON body to them). `*` with no Access-Control-Allow-Credentials means a browser never
// sends the visitor's cookies on such a request, so a session never reaches these responses.
// Pure (no server-only) so it is testable.

export const READ_CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "accept, content-type",
  "access-control-max-age": "86400",
};

/** The same response with the read-only CORS headers set. */
export function withReadCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(READ_CORS)) headers.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

/** The answer to a CORS preflight on a read-only route. */
export function readPreflight(): Response {
  return new Response(null, { status: 204, headers: READ_CORS });
}
