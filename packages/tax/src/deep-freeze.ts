/**
 * Recursively freeze a value so exposed views cannot be mutated.
 *
 * The tax systems expose a `config` view (brackets, income categories,
 * options) for UIs to render dynamic forms. `compute()` reads the SAME
 * nested objects, so a consumer mutating the view would corrupt engine
 * results. Freezing (vs copying) also protects the module-level state the
 * engine itself reads — mutation attempts throw in strict mode (ESM).
 *
 * Idempotent and cycle-safe: already-frozen values are not re-walked.
 */
export function deepFreeze<T>(value: T): T {
	if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
		Object.freeze(value)
		for (const key of Object.keys(value as object)) {
			deepFreeze((value as Record<string, unknown>)[key])
		}
	}
	return value
}
