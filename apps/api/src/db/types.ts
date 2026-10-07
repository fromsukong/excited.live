/**
 * Structural types for the persistence layer.
 *
 * Store code only ever talks to a `SqlDriver` — a deliberately tiny surface
 * modelled on Cloudflare D1 (prepare/bind/all/first/run/exec). Two drivers
 * implement it:
 *
 *   - d1          wraps a real D1 binding (Workers deploy, `wrangler dev`)
 *   - node-sqlite wraps Node's built-in `node:sqlite` (local dev + tests)
 *
 * Both are SQLite: identical SQL dialect, identical migration files, so the
 * store code and migrations are exercised for real without a Workers runtime.
 */

/** Parameter types accepted by both drivers (D1 also allows blobs — unused here). */
export type SqlValue = string | number | null

export interface SqlDriver {
	/** Which backend this driver talks to — surfaced in logs and health. */
	readonly kind: "d1" | "node-sqlite"
	/** Run a single statement with no parameters (DDL). */
	exec(sql: string): Promise<void>
	/** All rows matching a parameterised query. */
	all<T>(sql: string, params?: readonly SqlValue[]): Promise<T[]>
	/** The first row, or null when there is none. */
	first<T>(sql: string, params?: readonly SqlValue[]): Promise<T | null>
	/** Run a parameterised write. */
	run(sql: string, params?: readonly SqlValue[]): Promise<void>
	/** Release the underlying handle (no-op for D1). */
	close(): void
}

/** The subset of the Cloudflare D1 binding API this layer depends on. */
export interface D1PreparedStatementLike {
	bind(...values: SqlValue[]): D1PreparedStatementLike
	all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>
	first<T = Record<string, unknown>>(): Promise<T | null>
	run(): Promise<unknown>
}

export interface D1DatabaseLike {
	prepare(sql: string): D1PreparedStatementLike
	exec(sql: string): Promise<unknown>
}

/** Narrow an unknown binding (e.g. `c.env.DB`) to a D1 database. */
export function isD1Database(value: unknown): value is D1DatabaseLike {
	if (typeof value !== "object" || value === null) return false
	const candidate = value as { prepare?: unknown; exec?: unknown }
	return typeof candidate.prepare === "function" && typeof candidate.exec === "function"
}
