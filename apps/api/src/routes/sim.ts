import { Hono } from "hono"
import {
	defaultMonteCarloConfig,
	runMonteCarlo,
	runSimulation,
	type MonteCarloConfig,
	type PlanInput,
} from "@excited-live/sim"

export const simRouter = new Hono()

simRouter.post("/monte-carlo", async (c) => {
	const body = await c.req.json<{ plan: PlanInput; config?: MonteCarloConfig }>()
	if (!body?.plan) {
		return c.json({ error: "Body must be { plan, config? }" }, 400)
	}
	const config = body.config ?? defaultMonteCarloConfig
	const result = runMonteCarlo(body.plan, config)
	return c.json(result)
})

simRouter.post("/simulate", async (c) => {
	const body = await c.req.json<{ plan: PlanInput }>()
	if (!body?.plan) {
		return c.json({ error: "Body must be { plan }" }, 400)
	}
	const result = runSimulation(body.plan)
	return c.json(result)
})
