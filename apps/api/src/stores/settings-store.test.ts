import { describe, expect, it } from "vitest"
import { createSettingsStore } from "./settings-store"
import { applyMigrations } from "../db/apply"
import { createNodeSqliteDriver } from "../db/node-sqlite"

const driver = await createNodeSqliteDriver(":memory:")
await applyMigrations(driver)
const store = createSettingsStore(driver)

describe("settings store", () => {
	it("returns the defaults for a user with no settings", async () => {
		const settings = await store.get("nobody")
		expect(settings).toEqual({ profileName: "", birthday: undefined, gender: "female" })
		// Byte-compat with the previous in-memory store: `birthday` stays absent.
		expect(JSON.stringify(settings)).toBe('{"profileName":"","gender":"female"}')
	})

	it("round-trips profile name and gender", async () => {
		await store.save("user-a", { profileName: "Prame", gender: "male" })
		expect(await store.get("user-a")).toEqual({
			profileName: "Prame",
			birthday: undefined,
			gender: "male",
		})
		expect(JSON.stringify(await store.get("user-a"))).toBe('{"profileName":"Prame","gender":"male"}')
	})

	it("round-trips a birthday and keeps the JSON shape identical", async () => {
		await store.save("user-b", { profileName: "Nok", birthday: "1994-03-17", gender: "female" })
		const settings = await store.get("user-b")
		expect(settings.birthday).toBe("1994-03-17")
		expect(JSON.stringify(settings)).toBe('{"profileName":"Nok","birthday":"1994-03-17","gender":"female"}')
	})

	it("overwrites the previous row on save", async () => {
		await store.save("user-c", { profileName: "First", gender: "female" })
		await store.save("user-c", { profileName: "Second", birthday: "2000-01-01", gender: "male" })

		expect(await store.get("user-c")).toEqual({
			profileName: "Second",
			birthday: "2000-01-01",
			gender: "male",
		})
		const rows = await driver.all<{ count: number }>(
			"SELECT COUNT(*) AS count FROM user_settings WHERE user_id = ?",
			["user-c"],
		)
		expect(rows[0]?.count).toBe(1)
	})

	it("keeps settings isolated per user", async () => {
		await store.save("user-d", { profileName: "D", gender: "female" })
		expect(await store.get("user-e")).toEqual({
			profileName: "",
			birthday: undefined,
			gender: "female",
		})
	})
})
