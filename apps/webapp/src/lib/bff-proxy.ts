import { getAuth } from "@workos/authkit-tanstack-react-start"
import { authkitConfigured } from "./auth-config"

const BACKEND_URL = process.env.BACKEND_API_URL || "http://localhost:8000"

/**
 * BFF Passthrough Handler.
 * Forwards requests to the standalone Hono API backend, injecting
 * authenticated user identity (x-user-id, x-user-email) when available.
 */
export async function forwardToBackend(request: Request, path: string): Promise<Response> {
	const targetUrl = new URL(path, BACKEND_URL)
	const reqUrl = new URL(request.url)
	reqUrl.searchParams.forEach((val, key) => targetUrl.searchParams.append(key, val))

	const headers = new Headers()
	request.headers.forEach((val, key) => {
		// Omit hop-by-hop headers
		if (key.toLowerCase() !== "host" && key.toLowerCase() !== "connection") {
			headers.set(key, val)
		}
	})

	// BFF session injection: attach user identity from WorkOS AuthKit
	if (authkitConfigured()) {
		try {
			const { user } = await getAuth()
			if (user) {
				headers.set("x-user-id", user.id)
				headers.set("x-user-email", user.email)
			}
		} catch {
			// Unauthenticated session, continue with guest/default
		}
	}

	const hasBody = request.method !== "GET" && request.method !== "HEAD"
	const body = hasBody ? await request.text() : undefined

	try {
		const upstreamResponse = await fetch(targetUrl.toString(), {
			method: request.method,
			headers,
			body,
		})

		const resHeaders = new Headers(upstreamResponse.headers)
		// Enable CORS if accessed from other origins
		resHeaders.set("Access-Control-Allow-Origin", reqUrl.origin)
		resHeaders.set("Access-Control-Allow-Credentials", "true")

		return new Response(upstreamResponse.body, {
			status: upstreamResponse.status,
			statusText: upstreamResponse.statusText,
			headers: resHeaders,
		})
	} catch (err) {
		console.error(`[bff] Failed to reach Hono API at ${targetUrl.toString()}:`, err)
		return new Response(
			JSON.stringify({
				error: "Bad Gateway",
				message: `Could not connect to Hono backend API at ${BACKEND_URL}`,
			}),
			{
				status: 502,
				headers: { "Content-Type": "application/json" },
			},
		)
	}
}
