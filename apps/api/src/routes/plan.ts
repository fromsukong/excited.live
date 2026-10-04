import { Hono } from "hono"
import { defaultPlanInput, type PlanInput } from "@excited-live/sim"

export const planRouter = new Hono()

// In-memory plan store (keyed by userId / "default")
const planStore = new Map<string, PlanInput>()

function getUserId(c: { req: { header: (key: string) => string | undefined } }): string {
	return c.req.header("x-user-id") || "default"
}

planRouter.get("/", (c) => {
	const userId = getUserId(c)
	const plan = planStore.get(userId) || defaultPlanInput()
	return c.json(plan)
})

planRouter.put("/", async (c) => {
	const userId = getUserId(c)
	const body = await c.req.json<PlanInput>()
	planStore.set(userId, body)
	return c.json({ ok: true, data: body })
})
