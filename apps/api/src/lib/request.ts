/**
 * Shared request helpers for the API routers.
 */

/** Identity for per-user records: the `x-user-id` header, else the "default" bucket. */
export function getUserId(c: { req: { header: (key: string) => string | undefined } }): string {
	return c.req.header("x-user-id") || "default"
}
