import { Hono } from "hono"

export interface UserSettings {
	profileName: string
	birthday?: `${number}${number}${number}${number}-${number}${number}-${number}${number}`
	gender: string
}

const DEFAULT_SETTINGS: UserSettings = {
	profileName: "",
	birthday: undefined,
	gender: "female",
}

export const settingsRouter = new Hono()

// In-memory settings store (keyed by userId / "default")
const settingsStore = new Map<string, UserSettings>()

function getUserId(c: { req: { header: (key: string) => string | undefined } }): string {
	return c.req.header("x-user-id") || "default"
}

settingsRouter.get("/", (c) => {
	const userId = getUserId(c)
	const settings = settingsStore.get(userId) || DEFAULT_SETTINGS
	return c.json(settings)
})

settingsRouter.put("/", async (c) => {
	const userId = getUserId(c)
	const body = await c.req.json<UserSettings>()
	settingsStore.set(userId, body)
	return c.json({ ok: true, data: body })
})
