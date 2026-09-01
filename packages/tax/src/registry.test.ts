import type { TaxCountry } from "./types"
import { describe, expect, it } from "vitest"
import {
	availableTaxSystems,
	getTaxSystem,
	registerTaxSystem,
} from "./registry"
import { thai2026System } from "./thai/thai-2026"

describe("registry", () => {
	it("resolves built-in systems by country + tax year", () => {
		const thai = getTaxSystem("TH", 2026)
		expect(thai.country).toBe("TH")
		expect(thai.taxYear).toBe(2026)

		const us = getTaxSystem("US", 2026)
		expect(us.country).toBe("US")
		expect(us.taxYear).toBe(2026)
	})

	it("throws with available options for unknown combinations", () => {
		expect(() => getTaxSystem("TH", 2025)).toThrow(/No tax system registered for TH 2025/)
		expect(() => getTaxSystem("FR" as TaxCountry, 2026)).toThrow(
			/No tax system registered for FR 2026/,
		)
	})

	it("lists all registered systems", () => {
		const systems = availableTaxSystems()
		expect(systems.map((system) => `${system.country}-${system.taxYear}`).sort()).toEqual([
			"TH-2026",
			"US-2026",
		])
	})

	it("allows registering additional systems at runtime", () => {
		const custom = { ...thai2026System, taxYear: 2027 }
		registerTaxSystem(custom)
		expect(getTaxSystem("TH", 2027)).toBe(custom)
	})

	it("exposes static config on every built-in system", () => {
		const builtins = [getTaxSystem("TH", 2026), getTaxSystem("US", 2026)]
		for (const system of builtins) {
			expect(system.config).toBeDefined()
			expect(system.config?.country).toBe(system.country)
			expect(system.config?.taxYear).toBe(system.taxYear)
			expect(system.config?.brackets.length).toBeGreaterThan(0)
			expect(system.config?.incomeCategories.length).toBeGreaterThan(0)
			// Last bracket must be the open-ended one (Infinity).
			expect(system.config?.brackets[system.config.brackets.length - 1]?.upTo).toBe(Infinity)
		}
	})
})