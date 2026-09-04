import { defineConfig } from "vitest/config"

// Unit tests for pure lib code (plan-service etc.). Intentionally minimal —
// no TanStack Start plugins, no DOM: these are logic tests. Keep the main
// vite.config.ts untouched so dev/SSR behavior stays identical.
export default defineConfig({
	test: {
		environment: "node",
		include: ["src/**/*.test.ts"],
	},
	resolve: {
		// Mirror the app's bundler resolution so workspace packages (tax, i18n)
		// resolve the same way they do inside vite dev/build.
		conditions: ["import", "module", "browser"],
	},
})
