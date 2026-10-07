import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
import type { SqlDriver, SqlValue } from "./types"

/**
 * Kept in a variable on purpose: esbuild (through tsup) rewrites a literal
 * `import("node:sqlite")` into `import("sqlite")` in the bundle, which then
 * fails at runtime with ERR_MODULE_NOT_FOUND. A computed specifier is left
 * alone. (Found by scripts/persistence-proof.sh running the built dist.)
 */
const SQLITE_MODULE = "node:sqlite"

/**
 * Local SQLite driver built on Node's built-in `node:sqlite` (Node >= 22.13).
 *
 * Same engine and SQL dialect as Cloudflare D1, so dev, tests and CI execute
 * the real migrations and the real store SQL instead of a stand-in. The module
 * is imported dynamically so a Workers bundle that never takes this branch
 * does not try to resolve a Node builtin — the D1 branch is the deploy path.
 */
export async function createNodeSqliteDriver(file: string): Promise<SqlDriver> {
	mkdirSync(dirname(file), { recursive: true })
	const { DatabaseSync: SqliteDatabase } = (await import(SQLITE_MODULE)) as typeof import("node:sqlite")
	const db = new SqliteDatabase(file)

	return {
		kind: "node-sqlite",
		async exec(sql: string): Promise<void> {
			db.exec(sql)
		},
		async all<T>(sql: string, params: readonly SqlValue[] = []): Promise<T[]> {
			return db.prepare(sql).all(...params) as T[]
		},
		async first<T>(sql: string, params: readonly SqlValue[] = []): Promise<T | null> {
			return (db.prepare(sql).get(...params) ?? null) as T | null
		},
		async run(sql: string, params: readonly SqlValue[] = []): Promise<void> {
			db.prepare(sql).run(...params)
		},
		close(): void {
			db.close()
		},
	}
}
