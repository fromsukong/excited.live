import { defaultPlanInput, type PlanInput } from "@excited-live/sim"
import type { SqlDriver } from "../db/types"

/**
 * Plan-per-user store.
 *
 * The plan document is stored as a JSON snapshot in a single column: the API
 * contract is "whatever the client PUT, byte-for-byte back on GET", and the
 * shape of PlanInput is owned by @excited-live/sim, not by this service.
 */
export interface PlanStore {
	/** The user's plan, or a fresh default plan when none was saved yet. */
	get(userId: string): Promise<PlanInput>
	/** Persist the plan for this user (upsert). */
	save(userId: string, plan: PlanInput): Promise<void>
}

export function createPlanStore(driver: SqlDriver): PlanStore {
	return {
		async get(userId: string): Promise<PlanInput> {
			const row = await driver.first<{ data: string }>(
				"SELECT data FROM plans WHERE user_id = ?",
				[userId],
			)
			if (!row) return defaultPlanInput()
			return JSON.parse(row.data) as PlanInput
		},

		async save(userId: string, plan: PlanInput): Promise<void> {
			await driver.run(
				`INSERT INTO plans (user_id, data, updated_at) VALUES (?, ?, ?)
				 ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
				[userId, JSON.stringify(plan), new Date().toISOString()],
			)
		},
	}
}
