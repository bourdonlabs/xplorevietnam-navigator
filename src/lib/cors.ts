// The public website (xplorevietnam.org, a separate Vercel project) calls a few Navigator API routes from the
// browser. Only these origins may do so. Extra origins (e.g. a preview URL) can be added with WEBSITE_ORIGINS.
const DEFAULT_ORIGINS = [
  "https://xplorevietnam.org",
  "https://www.xplorevietnam.org",
  "https://xplorevietnam-website.vercel.app",
];

function allowed(origin: string | null) {
  if (!origin) return false;
  const extra = (process.env.WEBSITE_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return [...DEFAULT_ORIGINS, ...extra].includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin);
}

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!allowed(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin!,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function preflight(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function json(request: Request, body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders(request) });
}

/** The website origin a browser came from, for Stripe return URLs. Falls back to the main site. */
export function websiteOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return allowed(origin) ? origin! : "https://xplorevietnam.org";
}
