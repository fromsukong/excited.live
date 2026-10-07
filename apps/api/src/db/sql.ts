/**
 * SQL helpers shared by the runtime migrator and the migration parity test.
 */

/**
 * Split a migration file into individual statements.
 *
 * Comment-only lines are dropped, statements are separated by `;`. The schema
 * keeps one statement per `;` on its own line so this stays trivial — no
 * function bodies, triggers or string literals containing `;`.
 */
export function splitStatements(sql: string): string[] {
	return sql
		.split("\n")
		.filter((line) => !line.trim().startsWith("--"))
		.join("\n")
		.split(";")
		.map((statement) => statement.trim())
		.filter((statement) => statement.length > 0)
}
