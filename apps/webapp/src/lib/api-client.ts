/**
 * Unified API Client with Mock vs Live dispatching.
 *
 * In "mock" mode (default for `pnpm dev` and PR preview-mock):
 *   - Calls return local/stubbed engine data without making external network calls.
 *
 * In "live" mode (`pnpm dev:api`, PR preview-live, and production `pnpm start`):
 *   - Requests hit the backend API (proxied via Vite during dev, direct in prod).
 */

export type ApiMode = "mock" | "live"

export function getApiMode(): ApiMode {
	return import.meta.env.VITE_API_MODE === "live" ? "live" : "mock"
}

export function isLiveApi(): boolean {
	return getApiMode() === "live"
}

export class ApiError extends Error {
	constructor(
		public status: number,
		message: string,
		public data?: unknown,
	) {
		super(message)
		this.name = "ApiError"
	}
}

/**
 * Base fetch wrapper for backend endpoints (/api/v1/*).
 */
export async function apiFetch<T>(
	endpoint: string,
	init?: RequestInit,
): Promise<T> {
	const url = endpoint.startsWith("/") ? `/api/v1${endpoint}` : `/api/v1/${endpoint}`
	const response = await fetch(url, {
		...init,
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
			...init?.headers,
		},
	})

	if (!response.ok) {
		let errorData: unknown = null
		try {
			errorData = await response.json()
		} catch {
			// Response was not JSON
		}
		throw new ApiError(
			response.status,
			`API request failed: ${response.status} ${response.statusText}`,
			errorData,
		)
	}

	return (await response.json()) as T
}
