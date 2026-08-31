/**
 * Registry of available tax systems, keyed by country + tax year.
 *
 * Adding a new jurisdiction or year = write one `TaxSystem` implementation,
 * then register it here. The rest of the product (web / mobile / MCP) only
 * ever talks to the registry — no direct imports of individual systems.
 */

import type { TaxCountry, TaxSystem } from "./types"
import { thai2026System } from "./thai/thai-2026"
import { us2026System } from "./us/us-2026"

const systems = new Map<string, TaxSystem>()

/** Register (or replace) a system for its country + tax year. */
export function registerTaxSystem(system: TaxSystem): void {
	systems.set(`${system.country}-${system.taxYear}`, system)
}

/**
 * Resolve the system for a country + tax year.
 * Throws with the available options when the combination is not registered.
 */
export function getTaxSystem(country: TaxCountry, taxYear: number): TaxSystem {
	const system = systems.get(`${country}-${taxYear}`)
	if (!system) {
		const available = [...systems.values()]
			.map((item) => `${item.country} ${item.taxYear}`)
			.join(", ")
		throw new Error(`No tax system registered for ${country} ${taxYear}. Available: ${available || "none"}`)
	}
	return system
}

/** All registered systems (for pickers, docs, tests). */
export function availableTaxSystems(): TaxSystem[] {
	return [...systems.values()]
}

// Built-in systems.
registerTaxSystem(thai2026System)
registerTaxSystem(us2026System)// [ci self-test] triggers affected-package detection; reverted in next commit
