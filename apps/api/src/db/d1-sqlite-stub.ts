import { DatabaseSync } from "node:sqlite"
import type { D1DatabaseLike, D1PreparedStatementLike, SqlValue } from "./types"

/**
 * Test double: a Cloudflare D1 binding backed by real SQLite (node:sqlite).
 *
 * The stores and the migrator never run against this directly — it sits on the
 * other side of the real D1 driver (src/db/d1.ts), so tests can exercise the
 * D1 code path (prepare/bind/all/first/run and D1's `.results` envelope)
 * without a Workers runtime. Production code never imports this file.
 */
export interface D1SqliteStub {
	binding: D1DatabaseLike
	/** Statement texts seen by the binding, in order (assertion aid). */
	calls: string[]
	close(): void
}

export function createD1SqliteStub(file: string): D1SqliteStub {
	const db = new DatabaseSync(file)
	const calls: string[] = []

	const binding: D1DatabaseLike = {
		async exec(sql: string): Promise<void> {
			calls.push(`exec ${sql}`)
			db.exec(sql)
		},
		prepare(sql: string): D1PreparedStatementLike {
			calls.push(`prepare ${sql}`)
			let params: readonly SqlValue[] = []
			const statement: D1PreparedStatementLike = {
				bind(...values: SqlValue[]): D1PreparedStatementLike {
					params = values
					return statement
				},
				async all<T = Record<string, unknown>>(): Promise<{ results?: T[] }> {
					return { results: db.prepare(sql).all(...params) as T[] }
				},
				async first<T = Record<string, unknown>>(): Promise<T | null> {
					return (db.prepare(sql).get(...params) ?? null) as T | null
				},
				async run(): Promise<unknown> {
					return db.prepare(sql).run(...params)
				},
			}
			return statement
		},
	}

	return {
		binding,
		calls,
		close: () => db.close(),
	}
}
