import { Hono } from "hono"
import type { PlanInput } from "@excited-live/sim"
import type { ApiEnv } from "../lib/env"
import { getUserId } from "../lib/request"
import { createPlanStore } from "../stores/plan-store"

/**
 * Plan routes. The store is built per request from the driver the api
 * middleware resolved (`c.var.db`), so this router is backend-agnostic: D1 in
 * the deployment, local SQLite file in dev/test. Response shapes are unchanged.
 */
export function createPlanRouter(): Hono<ApiEnv> {
	const router = new Hono<ApiEnv>()

	router.get("/", async (c) => {
		const plan = await createPlanStore(c.get("db")).get(getUserId(c))
		return c.json(plan)
	})

	router.put("/", async (c) => {
		const userId = getUserId(c)
		const body = await c.req.json<PlanInput>()
		await createPlanStore(c.get("db")).save(userId, body)
		return c.json({ ok: true, data: body })
	})

	return router
}
