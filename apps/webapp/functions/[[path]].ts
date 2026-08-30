// Cloudflare Pages Function: SSR entry for the TanStack Start app
// 1) Serve static assets first (images/css/js) via the ASSETS binding
// 2) Everything else goes through the SSR handler
import server from "../dist/server/server.js"

export const onRequest = async (context) => {
  // Fast path: only GET/HEAD are rendered by this app's router at request time
  const url = new URL(context.request.url)

  // Let static assets pass through untouched
  if (
    context.request.method === "GET" &&
    (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/favicon") || url.pathname.startsWith("/public/"))
  ) {
    const staticResp = await context.env.ASSETS.fetch(context.request)
    if (staticResp.status !== 404) return staticResp
  }

  return server.fetch(context.request)
}