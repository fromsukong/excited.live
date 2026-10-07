import { defaultPlanInput } from "@excited-live/sim"
import { describe, expect, it } from "vitest"
import { createPlanStore } from "./plan-store"
import { createNodeSqliteDriver } from "../db/node-sqlite"

const driver = await createNodeSqliteDriver(":memory:")
const { applyMigrations } = await import("../db/apply")
await applyMigrations(driver)
const store = createPlanStore(driver)

describe("plan store", () => {
	it("returns a fresh default plan when the user has none", async () => {
		const plan = await store.get("nobody")
		expect(JSON.stringify(plan)).toBe(JSON.stringify(defaultPlanInput()))
	})

	it("round-trips a saved plan byte for byte", async () => {
		// Distinctive marker, not the default fixture: a default-vs-default
		// compare passes even when nothing was persisted (FRO-72 nit 1).
		const plan = { ...defaultPlanInput(), personalAllowances: 123456 } as ReturnType<
			typeof defaultPlanInput
		>
		expect(JSON.stringify(plan)).not.toBe(JSON.stringify(defaultPlanInput()))

		await store.save("user-a", plan)
		expect(JSON.stringify(await store.get("user-a"))).toBe(JSON.stringify(plan))
	})

	it("upserts instead of inserting duplicates", async () => {
		const first = defaultPlanInput()
		await store.save("user-b", first)

		const second = { ...defaultPlanInput(), personalAllowances: 123456 } as ReturnType<
			typeof defaultPlanInput
		>
		await store.save("user-b", second)

		expect(JSON.stringify(await store.get("user-b"))).toBe(JSON.stringify(second))
		const rows = await driver.all<{ count: number }>(
			"SELECT COUNT(*) AS count FROM plans WHERE user_id = ?",
			["user-b"],
		)
		expect(rows[0]?.count).toBe(1)
	})

	it("keeps plans isolated per user", async () => {
		await store.save("user-c", { ...defaultPlanInput(), personalAllowances: 111 } as ReturnType<
			typeof defaultPlanInput
		>)
		await store.save("user-d", { ...defaultPlanInput(), personalAllowances: 222 } as ReturnType<
			typeof defaultPlanInput
		>)

		const c = await store.get("user-c")
		const d = await store.get("user-d")
		expect(c.personalAllowances).toBe(111)
		expect(d.personalAllowances).toBe(222)
	})
})
