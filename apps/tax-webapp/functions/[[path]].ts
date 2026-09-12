// Cloudflare Pages Function: SSR entry for the tax-webapp (TanStack Start)
// 1) Serve static assets first (images/css/js) via the ASSETS binding
// 2) Everything else goes through the SSR handler
import server from "../dist/server/server.js"

// Paths always served from the static build. /assets is the Vite hashed
// bundle dir; the rest are files published from apps/tax-webapp/public/.
const STATIC_PREFIXES = [
  "/assets/",
  "/favicon",
  "/logo-",
  "/og",
  "/apple-touch-icon",
  "/robots",
]

export const onRequest = async (context) => {
  // Fast path: only GET/HEAD are rendered by this app's router at request time
  const url = new URL(context.request.url)

  // Let static assets pass through untouched (HEAD too — social crawlers and
  // link checkers probe og.png/favicons with HEAD and must not hit the SSR 404)
  if (
    (context.request.method === "GET" || context.request.method === "HEAD") &&
    STATIC_PREFIXES.some((p) => url.pathname.startsWith(p))
  ) {
    const staticResp = await context.env.ASSETS.fetch(context.request)
    if (staticResp.status !== 404) return staticResp
  }

  return server.fetch(context.request)
}
