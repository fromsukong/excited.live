import type { D1DatabaseLike, SqlDriver, SqlValue } from "./types"

/**
 * Driver for a real Cloudflare D1 binding (Workers / `wrangler dev`).
 *
 * Thin by design: D1 already exposes the shape the stores need. Everything we
 * do here is bind parameters and collapse D1's envelopes (`.results`, null).
 */
export function createD1Driver(binding: D1DatabaseLike): SqlDriver {
	return {
		kind: "d1",
		async exec(sql: string): Promise<void> {
			await binding.exec(sql)
		},
		async all<T>(sql: string, params: readonly SqlValue[] = []): Promise<T[]> {
			const result = await binding.prepare(sql).bind(...params).all<T>()
			return result.results ?? []
		},
		async first<T>(sql: string, params: readonly SqlValue[] = []): Promise<T | null> {
			return await binding.prepare(sql).bind(...params).first<T>()
		},
		async run(sql: string, params: readonly SqlValue[] = []): Promise<void> {
			await binding.prepare(sql).bind(...params).run()
		},
		close(): void {
			// D1 connections are managed by the platform.
		},
	}
}
