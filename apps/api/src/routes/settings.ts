import { Hono } from "hono"
import type { ApiEnv } from "../lib/env"
import { getUserId } from "../lib/request"
import { createSettingsStore, type UserSettings } from "../stores/settings-store"

/**
 * Settings routes. Same shape as before persistence: `GET` returns the stored
 * settings (defaults for an unknown user, `birthday` absent when unset) and
 * `PUT` echoes the body.
 */
export function createSettingsRouter(): Hono<ApiEnv> {
	const router = new Hono<ApiEnv>()

	router.get("/", async (c) => {
		const settings = await createSettingsStore(c.get("db")).get(getUserId(c))
		return c.json(settings)
	})

	router.put("/", async (c) => {
		const userId = getUserId(c)
		const body = await c.req.json<UserSettings>()
		await createSettingsStore(c.get("db")).save(userId, body)
		return c.json({ ok: true, data: body })
	})

	return router
}

export type { UserSettings } from "../stores/settings-store"
