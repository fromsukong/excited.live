/**
 * @excited-live/tax — pure, multi-jurisdiction tax engine.
 *
 * Individual income tax only (product decision 2026-08-30: no corporate tax).
 * Thailand is the fully implemented system (TH 2026); the US system (US 2026)
 * is a structural placeholder proving the multi-country pattern.
 *
 * Logic only: no network, no DOM, no framework. All labels are bilingual
 * (en + th); the UI launches EN-first in Thailand.
 */

export * from "./types"
export {
	registerTaxSystem,
	getTaxSystem,
	availableTaxSystems,
} from "./registry"
export { thai2026System } from "./thai/thai-2026"
export { us2026System } from "./us/us-2026"