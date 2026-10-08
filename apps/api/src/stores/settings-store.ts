import type { SqlDriver } from "../db/types"

export interface UserSettings {
	profileName: string
	birthday?: `${number}${number}${number}${number}-${number}${number}-${number}${number}`
	gender: string
}

export const DEFAULT_SETTINGS: UserSettings = {
	profileName: "",
	birthday: undefined,
	gender: "female",
}

/** Settings-per-user store (structured columns: profile name, birthday, gender). */
export interface SettingsStore {
	/** The user's settings, or the defaults when none were saved yet. */
	get(userId: string): Promise<UserSettings>
	/** Persist settings for this user (upsert). */
	save(userId: string, settings: UserSettings): Promise<void>
}

interface SettingsRow {
	profile_name: string
	birthday: string | null
	gender: string
}

export function createSettingsStore(driver: SqlDriver): SettingsStore {
	return {
		async get(userId: string): Promise<UserSettings> {
			const row = await driver.first<SettingsRow>(
				"SELECT profile_name, birthday, gender FROM user_settings WHERE user_id = ?",
				[userId],
			)
			if (!row) return DEFAULT_SETTINGS
			return {
				profileName: row.profile_name,
				// A NULL birthday must stay absent from the JSON response (the
				// previous in-memory store held `undefined`), so it is dropped.
				// The column holds exactly what a client PUT (YYYY-MM-DD); the
				// API has never validated that shape.
				birthday: (row.birthday ?? undefined) as UserSettings["birthday"],
				gender: row.gender,
			}
		},

		async save(userId: string, settings: UserSettings): Promise<void> {
			const profileName = typeof settings.profileName === "string" ? settings.profileName : ""
			const gender = typeof settings.gender === "string" ? settings.gender : "female"
			await driver.run(
				`INSERT INTO user_settings (user_id, profile_name, birthday, gender, updated_at)
				 VALUES (?, ?, ?, ?, ?)
				 ON CONFLICT(user_id) DO UPDATE SET
					profile_name = excluded.profile_name,
					birthday = excluded.birthday,
					gender = excluded.gender,
					updated_at = excluded.updated_at`,
				[userId, profileName, settings.birthday ?? null, gender, new Date().toISOString()],
			)
		},
	}
}
