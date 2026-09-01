import { describe, expect, it } from "vitest";
import {
	DEFAULT_LOCALE,
	LOCALES,
	createTranslator,
	isLocale,
	localeCookieValue,
	localeFromAcceptLanguage,
	localeFromCookie,
	toLocale,
	translateLabel,
} from "./index";

describe("locale primitives", () => {
	it("defaults to EN", () => {
		expect(DEFAULT_LOCALE).toBe("en");
		expect(LOCALES).toEqual(["en", "th"]);
	});

	it("validates and narrows locale values", () => {
		expect(isLocale("en")).toBe(true);
		expect(isLocale("th")).toBe(true);
		expect(isLocale("fr")).toBe(false);
		expect(toLocale("th-TH")).toBe("th");
		expect(toLocale(" EN ")).toBe("en");
		expect(toLocale("fr-FR")).toBeUndefined();
		expect(toLocale(42)).toBeUndefined();
		expect(toLocale(null)).toBeUndefined();
	});
});

describe("translateLabel", () => {
	const label = { en: "Net Worth", th: "มูลค่าสุทธิ" };

	it("uses the requested locale", () => {
		expect(translateLabel(label, "en")).toBe("Net Worth");
		expect(translateLabel(label, "th")).toBe("มูลค่าสุทธิ");
	});

	it("falls back to EN when TH is empty", () => {
		expect(translateLabel({ en: "Taxes", th: "" }, "th")).toBe("Taxes");
	});
});

describe("createTranslator", () => {
	const dictionaries = {
		en: {
			"greeting": { en: "Hello, Sam", th: "สวัสดี Sam" },
			"missing.th": { en: "English only", th: "" },
		},
		th: {
			"greeting": { en: "Hello, Sam", th: "สวัสดี Sam" },
		},
	};

	it("resolves keys for the active locale", () => {
		expect(createTranslator(dictionaries, "en").t("greeting")).toBe("Hello, Sam");
		expect(createTranslator(dictionaries, "th").t("greeting")).toBe("สวัสดี Sam");
	});

	it("falls back to the key when a key is missing", () => {
		expect(createTranslator(dictionaries, "th").t("nope")).toBe("nope");
	});

	it("falls back to the EN dictionary when a locale has none", () => {
		expect(createTranslator({}, "th").t("greeting")).toBe("greeting");
		expect(createTranslator({ en: dictionaries.en }, "th").t("missing.th")).toBe("English only");
	});

	it("translates engine labels via label()", () => {
		const th = createTranslator(dictionaries, "th");
		expect(th.label({ en: "Taxable Income", th: "รายได้สุทธิ" })).toBe("รายได้สุทธิ");
	});

	it("interpolates {vars} and keeps unknown names visible", () => {
		const en = createTranslator(
			{ en: { "plan.selected": { en: "{action} selected", th: "เลือก {action} อยู่" } } },
			"en",
		);
		expect(en.t("plan.selected", { action: "Update plan" })).toBe("Update plan selected");
		expect(en.t("plan.selected")).toBe("{action} selected");
		expect(en.t("plan.selected", { nope: "x" })).toBe("{action} selected");
	});
});

describe("localeFromAcceptLanguage", () => {
	it("picks the highest-quality supported locale", () => {
		expect(localeFromAcceptLanguage("fr-FR, th-TH;q=0.9, en;q=0.8")).toBe("th");
		expect(localeFromAcceptLanguage("en-GB,en;q=0.9")).toBe("en");
	});

	it("prefers order when quality ties", () => {
		expect(localeFromAcceptLanguage("th, en")).toBe("th");
	});

	it("ignores unsupported languages and zero quality", () => {
		expect(localeFromAcceptLanguage("fr, de;q=0.5")).toBeUndefined();
		expect(localeFromAcceptLanguage("th;q=0")).toBeUndefined();
	});

	it("handles case-insensitive q and whitespace", () => {
		expect(localeFromAcceptLanguage("th; Q=0.4, en;q=0.8")).toBe("en");
		expect(localeFromAcceptLanguage("th ; q=0.9 , en ; q=0.8")).toBe("th");
	});

	it("drops candidates with malformed or out-of-range q", () => {
		expect(localeFromAcceptLanguage("th;q=1e2, en;q=0.5")).toBe("en");
		expect(localeFromAcceptLanguage("th;q=1.5, en;q=0.5")).toBe("en");
		expect(localeFromAcceptLanguage("th;q=0.5foo, en;q=0.4")).toBe("en");
		expect(localeFromAcceptLanguage("th;q=-1, en;q=0.9")).toBe("en");
		expect(localeFromAcceptLanguage("th;q=0.955, en;q=0.9")).toBe("th");
	});

	it("handles empty and missing headers", () => {
		expect(localeFromAcceptLanguage(null)).toBeUndefined();
		expect(localeFromAcceptLanguage("")).toBeUndefined();
		expect(localeFromAcceptLanguage("*")).toBeUndefined();
	});
});

describe("locale cookie", () => {
	it("serializes a SameSite=Lax one-year cookie", () => {
		expect(localeCookieValue("th")).toBe(
			"excited_live_locale=th; Path=/; Max-Age=31536000; SameSite=Lax",
		);
	});

	it("adds Secure on request", () => {
		expect(localeCookieValue("th", { secure: true })).toBe(
			"excited_live_locale=th; Path=/; Max-Age=31536000; SameSite=Lax; Secure",
		);
	});

	it("reads the locale back from a Cookie header", () => {
		expect(localeFromCookie("excited_live_locale=th")).toBe("th");
		expect(localeFromCookie("foo=bar; excited_live_locale=en")).toBe("en");
		expect(localeFromCookie("excited_live_locale=th-TH")).toBe("th");
		expect(localeFromCookie("excited_live_locale=fr")).toBeUndefined();
		expect(localeFromCookie("")).toBeUndefined();
		expect(localeFromCookie(null)).toBeUndefined();
	});
});
