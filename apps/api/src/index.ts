import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { serve } from "@hono/node-server"
import { planRouter } from "./routes/plan"
import { settingsRouter } from "./routes/settings"
import { simRouter } from "./routes/sim"

const app = new Hono()

app.use("*", logger())
app.use(
	"*",
	cors({
		origin: (origin) => origin || "*",
		allowHeaders: ["Content-Type", "Authorization", "x-user-id"],
		allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		credentials: true,
	}),
)

app.get("/health", (c) => {
	return c.json({ status: "ok", service: "excited-live-api", timestamp: new Date().toISOString() })
})

app.get("/", (c) => {
	return c.json({
		name: "excited.live API",
		version: "0.0.1",
		docs: "/health",
	})
})

const apiV1 = new Hono()
apiV1.route("/plan", planRouter)
apiV1.route("/settings", settingsRouter)
apiV1.route("/sim", simRouter)

app.route("/api/v1", apiV1)

const port = Number(process.env.PORT) || 8000

if (process.env.NODE_ENV !== "test") {
	console.log(`[excited-live-api] Running on http://localhost:${port}`)
	serve({
		fetch: app.fetch,
		port,
	})
}

export default app
