-- 0001_init.sql — excited.live API persistence baseline.
--
-- Engine: Cloudflare D1 (SQLite). One statement per entry, terminated by a
-- semicolon on its own line (the runtime migrator splits on those).
--
-- Applied by:
--   local  : apps/api boots with node:sqlite and applies pending migrations
--   remote : wrangler d1 migrations apply excited-live-api --remote
--
-- Both paths track progress in the wrangler-standard `d1_migrations` table,
-- so the two can be used interchangeably.

CREATE TABLE IF NOT EXISTS plans (
	user_id TEXT PRIMARY KEY,
	data TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_settings (
	user_id TEXT PRIMARY KEY,
	profile_name TEXT NOT NULL DEFAULT '',
	birthday TEXT,
	gender TEXT NOT NULL DEFAULT 'female',
	updated_at TEXT NOT NULL
);
