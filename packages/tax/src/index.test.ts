import { describe, it, expect } from "vitest"
import * as taxModule from "./index"

describe("tax module index re-exports", () => {
	it("re-exports all expected public APIs", () => {
		expect(taxModule.thai2026System).toBeDefined()
		expect(taxModule.thai2026System.country).toBe("TH")
		expect(taxModule.us2026System).toBeDefined()
		expect(taxModule.us2026System.country).toBe("US")
		expect(typeof taxModule.getTaxSystem).toBe("function")
		expect(typeof taxModule.registerTaxSystem).toBe("function")
		expect(typeof taxModule.availableTaxSystems).toBe("function")
	})
})
