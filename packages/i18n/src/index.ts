/**
 * @excited-live/i18n — bilingual (en + th) localisation, pure logic only.
 *
 * Locale contract mirrors packages/tax `LocalizedLabel { en, th }` so engine
 * labels render with the same translator as UI strings. No network, no DOM,
 * no framework: dictionaries are plain data, translation is a lookup.
 *
 * EN is the default locale (product launches EN-first in Thailand).
 */

export type Locale = "en" | "th";

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALES: readonly Locale[] = ["en", "th"] as const;

/** Shape shared with packages/tax `LocalizedLabel`. */
export interface LocalizedLabel {
	en: string;
	th: string;
}

/** A dictionary maps stable string keys to bilingual labels. */
export type Dictionary = Record<string, LocalizedLabel>;

export function isLocale(value: unknown): value is Locale {
	return value === "en" || value === "th";
}

/**
 * Narrow an unknown value (cookie, header, storage) to a supported Locale.
 * Case-insensitive; language-region tags like "th-TH" match their base language.
 */
export function toLocale(value: unknown): Locale | undefined {
	if (typeof value !== "string") return undefined;
	const base = value.trim().toLowerCase().split("-")[0];
	return isLocale(base) ? base : undefined;
}

/**
 * Translate a label for a locale. Falls back to EN when the requested locale
 * has no entry, then to the key itself so missing translations stay visible.
 */
export function translateLabel(label: LocalizedLabel, locale: Locale): string {
	if (locale === "en") return label.en;
	return label.th || label.en;
}

export interface Translator {
	locale: Locale;
	t: (key: string, vars?: Record<string, string>) => string;
	/** Translate a bilingual label coming from an engine (packages/tax). */
	label: (value: LocalizedLabel) => string;
}

/** Fill `{name}` placeholders; unknown names stay visible for debugging. */
export function interpolate(template: string, vars?: Record<string, string>): string {
	if (!vars) return template;
	return template.replace(/\{([A-Za-z][A-Za-z0-9_.-]*)\}/g, (match, name: string) => vars[name] ?? match);
}

export function createTranslator(
	dictionaries: Partial<Record<Locale, Dictionary>>,
	locale: Locale = DEFAULT_LOCALE,
): Translator {
	const dictionary = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE] ?? {};
	return {
		locale,
		t: (key: string, vars?: Record<string, string>) =>
			interpolate(translateLabel(dictionary[key] ?? { en: key, th: key }, locale), vars),
		label: (value: LocalizedLabel) => translateLabel(value, locale),
	};
}

/**
 * Pick the best locale from an `Accept-Language` header.
 * Quality values are respected loosely (order wins ties); anything the product
 * does not support is ignored, and an empty/no-match result is `undefined` so
 * callers can apply their own default.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | undefined {
	if (!header) return undefined;
	const candidates: Array<{ locale: Locale; quality: number; order: number }> = [];
	for (const [index, part] of header.split(",").entries()) {
		const [tag, ...params] = part.trim().split(";");
		if (!tag) continue;
		const locale = toLocale(tag);
		if (!locale) continue;
		let quality: number | undefined;
		let malformed = false;
		for (const param of params) {
			const [name, raw] = param.trim().split("=");
			if (name?.trim().toLowerCase() === "q") {
				const value = (raw ?? "").trim();
				// RFC 7231 qvalue: 0–1, at most 3 decimals. Malformed or
				// out-of-range q invalidates the candidate entirely — never
				// let a broken header win by defaulting to max priority.
				if (/^(?:0(?:\.\d{1,3})?|1(?:\.0{1,3})?)$/.test(value)) {
					quality = Number.parseFloat(value);
				} else {
					malformed = true;
					break;
				}
			}
		}
		if (malformed) continue;
		if (quality === undefined) quality = 1;
		if (quality > 0) candidates.push({ locale, quality, order: index });
	}
	if (candidates.length === 0) return undefined;
	candidates.sort((a, b) => b.quality - a.quality || a.order - b.order);
	return candidates[0]?.locale;
}

/** Cookie that carries the visitor's chosen locale across requests. */
export const LOCALE_COOKIE = "excited_live_locale";

/**
 * Serialize the locale cookie (SameSite=Lax, 1 year). Value is validated.
 * Pass `secure: true` when serving over HTTPS so the cookie is never sent
 * over plain HTTP (leave off for http://localhost development).
 */
export function localeCookieValue(locale: Locale, options?: { secure?: boolean }): string {
	const secure = options?.secure ? "; Secure" : "";
	return `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

/** Parse the `excited_live_locale` cookie from a Cookie header value. */
export function localeFromCookie(cookieHeader: string | null | undefined): Locale | undefined {
	if (!cookieHeader) return undefined;
	for (const pair of cookieHeader.split(";")) {
		const [name, ...rest] = pair.trim().split("=");
		if (name === LOCALE_COOKIE) return toLocale(rest.join("="));
	}
	return undefined;
}
