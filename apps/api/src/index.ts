import { serve } from "@hono/node-server"
import { createApp } from "./app"
import { getDb } from "./db"

const app = createApp()

const port = Number(process.env.PORT) || 8000

if (process.env.NODE_ENV !== "test") {
	try {
		// Open (and migrate) the database before accepting traffic: a broken
		// database should fail loudly at boot, not silently serve volatile data.
		const db = await getDb()
		console.log(`[excited-live-api] persistence: ${db.mode} (${db.location})`)
		if (db.migrations.length > 0) {
			console.log(`[excited-live-api] migrations applied: ${db.migrations.join(", ")}`)
		}
	} catch (error) {
		console.error("[excited-live-api] persistence unavailable:", error)
		console.error(
			"[excited-live-api] set EXCITED_API_DB_PATH to a writable file, or bind a D1 database to DB.",
		)
		process.exit(1)
	}

	console.log(`[excited-live-api] Running on http://localhost:${port}`)
	serve({
		fetch: app.fetch,
		port,
	})
}

export default app
