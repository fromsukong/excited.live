import { describe, expect, it } from "vitest"
import type { TaxInput } from "./types"
import { getTaxSystem } from "./registry"
import { deepFreeze } from "./deep-freeze"

const SAMPLE_INPUT: TaxInput = {
	incomes: [{ categoryCode: "employment", amount: 900_000 }],
	allowances: { personal: 1, spouse: 0, children: 0, disabled: 0 },
	deductions: {
		insurance: 0,
		mortgageInterest: 0,
		donations: 0,
		retirementSavings: { ssf: 0, rmf: 0, provident: 0 },
	},
	withheld: 0,
	estimatedPaid: 0,
	filingStatus: "single",
}

describe("deepFreeze", () => {
	it("freezes nested objects and arrays in place", () => {
		const value = deepFreeze({ a: { b: [1, { c: 2 }] } })
		expect(Object.isFrozen(value)).toBe(true)
		expect(Object.isFrozen(value.a)).toBe(true)
		expect(Object.isFrozen(value.a.b)).toBe(true)
		expect(Object.isFrozen(value.a.b[1])).toBe(true)
	})

	it("is idempotent and handles primitives/cycles", () => {
		const inner = { x: 1 }
		const value: { inner: unknown; self?: unknown } = { inner }
		value.self = value
		deepFreeze(value)
		expect(Object.isFrozen(inner)).toBe(true)
		expect(() => deepFreeze(value)).not.toThrow()
		expect(deepFreeze(42)).toBe(42)
		expect(deepFreeze(null)).toBe(null)
	})
})

describe.each(["TH", "US"] as const)("config purity (%s)", (country) => {
	const system = getTaxSystem(country, 2026)

	it("exposes a deeply frozen config view", () => {
		expect(system.config).toBeDefined()
		expect(Object.isFrozen(system.config)).toBe(true)
		expect(Object.isFrozen(system.config?.brackets)).toBe(true)
		expect(Object.isFrozen(system.config?.incomeCategories)).toBe(true)
		for (const bracket of system.config?.brackets ?? []) {
			expect(Object.isFrozen(bracket)).toBe(true)
		}
	})

	it("mutating the exposed config cannot corrupt compute()", () => {
		const before = system.compute(SAMPLE_INPUT)
		const brackets = system.config?.brackets ?? []
		// Tamper attempts are type-honest casts: freezing is runtime-only and
		// invisible to the type system. The assertion below holds via EITHER
		// protection mechanism: (a) a frozen write throws (US shares the
		// instances compute() reads), or (b) the write lands on a copy the
		// engine never reads (TH config holds copies). Both = output unchanged.
		const attempts: Array<() => void> = [
			() => {
				const first = brackets[0]
				if (first) {
					;(first as { rate: number }).rate = 0
				}
			},
			() => {
				;(system.config as { taxYear: number }).taxYear = 9999
			},
		]
		for (const attempt of attempts) {
			try {
				attempt()
			} catch {
				// Frozen target rejected the write (strict mode) — engine data
				// stays intact either way; the assertion below proves it.
			}
		}
		const after = system.compute(SAMPLE_INPUT)
		expect(after).toEqual(before)
		expect(after.taxYear).toBe(2026)
	})

	it("returns the same registered instance on repeated lookups", () => {
		expect(getTaxSystem(country, 2026)).toBe(system)
	})
})

describe("config purity (US options)", () => {
	const system = getTaxSystem("US", 2026)

	it("freezes shared filing-status and bracket data compute() reads", () => {
		const options = system.config?.options as {
			filingStatuses: unknown[]
			bracketsByStatus: Record<string, unknown[]>
		}
		expect(Object.isFrozen(options.filingStatuses)).toBe(true)
		expect(Object.isFrozen(options.bracketsByStatus)).toBe(true)
		expect(Object.isFrozen(options.bracketsByStatus.single)).toBe(true)
	})
})
