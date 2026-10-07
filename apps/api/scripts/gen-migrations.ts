/**
 * Generates src/db/migrations.generated.ts from migrations/*.sql.
 *
 * Why a generated mirror: Cloudflare Workers cannot read files from disk at
 * runtime, so the SQL has to be in the bundle. The .sql files stay the source
 * of truth (they are also what `wrangler d1 migrations apply` reads); this
 * mirror is what Node and Workers execute.
 *
 * Run: pnpm --filter @excited-live/api gen:migrations
 * Parity is enforced in CI by src/db/migrations.parity.test.ts.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const apiDir = join(dirname(fileURLToPath(import.meta.url)), "..")
const migrationsDir = join(apiDir, "migrations")
const outputFile = join(apiDir, "src", "db", "migrations.generated.ts")

const files = readdirSync(migrationsDir)
	.filter((name) => name.endsWith(".sql"))
	.sort()

if (files.length === 0) {
	console.error(`No .sql migrations found in ${migrationsDir}`)
	process.exit(1)
}

const entries = files
	.map((name) => {
		const sql = readFileSync(join(migrationsDir, name), "utf8")
		const escaped = sql.replaceAll("\\", "\\\\").replaceAll("`", "\\`").replaceAll("${", "\\${")
		return `\t{\n\t\tname: ${JSON.stringify(name)},\n\t\tsql: \`${escaped}\`,\n\t},`
	})
	.join("\n")

const output = `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Source of truth: apps/api/migrations/*.sql
 * Regenerate: pnpm --filter @excited-live/api gen:migrations
 * Parity test: src/db/migrations.parity.test.ts
 */

export interface MigrationFile {
	readonly name: string
	readonly sql: string
}

export const MIGRATION_FILES: readonly MigrationFile[] = [
${entries}
]
`

writeFileSync(outputFile, output)
console.log(`Wrote ${files.length} migration(s) to ${outputFile}: ${files.join(", ")}`)
