// Cloudflare Pages Function: SSR entry for the TanStack Start app
// 1) Serve static assets (images/css/js) via the ASSETS binding
// 2) Everything else goes through the SSR handler
import server from "../dist/server/server.js"

// Paths that are always static. /assets is the Vite hashed-bundle dir;
// the rest are files published from apps/webapp/public/.
const STATIC_PREFIXES = ["/assets/", "/favicon", "/logo-", "/og-image", "/apple-touch-icon", "/public/"]

export const onRequest = async (context: {
  request: Request
  env: { ASSETS: { fetch: (req: Request) => Promise<Response> } }
}) => {
  // Fast path: only GET/HEAD are rendered by this app's router at request time
  const url = new URL(context.request.url)

  // Let static assets pass through untouched
  if (context.request.method === "GET" && STATIC_PREFIXES.some((p) => url.pathname.startsWith(p))) {
    const staticResp = await context.env.ASSETS.fetch(context.request)
    if (staticResp.status !== 404) return staticResp
  }

  return server.fetch(context.request)
}
