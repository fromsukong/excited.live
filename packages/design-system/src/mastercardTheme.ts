import { defineTheme } from "@astryxdesign/core/theme";

/**
 * Mastercard-inspired theme for excited.live.
 *
 * Generated from DESIGN.md (repo root) — installed via `npx getdesign@latest add mastercard`.
 * Design language: warm editorial surfaces (Canvas Cream), extreme radii
 * (20px buttons / 40px panels / 999px pills+circles), MarkForMC-like geometric
 * sans (Sofia Sans), Ink Black CTAs, Signal Orange reserved as the single
 * aggressive accent (eyebrow dots, secondary chart line, arcs).
 *
 * Dark mode is "Mastercard after dark": the same warm palette inverted —
 * Ink Black canvas, cream text, signal-orange accents kept intact.
 */
export const mastercardTheme = defineTheme({
	name: "mastercard",
	typography: {
		// MarkForMC is proprietary; Sofia Sans is Mastercard's own open fallback.
		body: {
			family: '"Sofia Sans"',
			fallbacks: 'Arial, "Helvetica Neue", sans-serif',
			weight: "450",
		},
		heading: {
			family: '"Sofia Sans"',
			fallbacks: 'Arial, "Helvetica Neue", sans-serif',
			weight: "500",
		},
	},
	tokens: {
		// — Surfaces: warm putty canvas, paper-on-paper lift, never pure white —
		"--color-background-body": ["#F3F0EE", "#141413"],
		"--color-background-card": ["#FCFBFA", "#1C1C1A"],
		"--color-background-surface": ["#FCFBFA", "#262625"],
		"--color-background-muted": ["#F4F4F4", "#262625"],

		// — Accent = Ink Black pill (light) / cream pill (dark) —
		"--color-accent": ["#141413", "#F3F0EE"],
		"--color-accent-muted": ["#F4F4F4", "#262625"],
		"--color-on-accent": ["#F3F0EE", "#141413"],
		"--color-text-accent": ["#141413", "#F3F0EE"],
		"--color-icon-accent": ["#141413", "#F3F0EE"],

		// — Neutrals / overlays: warm ink at low alpha —
		"--color-neutral": ["rgba(20, 20, 19, 0.06)", "rgba(252, 251, 250, 0.08)"],
		"--color-overlay": ["rgba(20, 20, 19, 0.55)", "rgba(0, 0, 0, 0.72)"],
		"--color-overlay-hover": ["rgba(20, 20, 19, 0.05)", "rgba(252, 251, 250, 0.07)"],
		"--color-overlay-pressed": ["rgba(20, 20, 19, 0.1)", "rgba(252, 251, 250, 0.12)"],

		// — Text: Ink Black on cream / cream on ink; Slate Gray secondary —
		"--color-text-primary": ["#141413", "#F3F0EE"],
		"--color-text-secondary": ["#696969", "#B0AAA2"],
		"--color-text-disabled": ["#D1CDC7", "#565656"],
		"--color-icon-primary": ["#141413", "#F3F0EE"],
		"--color-icon-secondary": ["#696969", "#B0AAA2"],
		"--color-icon-disabled": ["#D1CDC7", "#565656"],

		// — Borders: ink at 10%, emphasized at 35% (1.5px pill outlines) —
		"--color-border": ["rgba(20, 20, 19, 0.1)", "rgba(252, 251, 250, 0.12)"],
		"--color-border-emphasized": ["rgba(20, 20, 19, 0.35)", "rgba(252, 251, 250, 0.4)"],

		// — Skeleton / shadow: soft 48px halos, ≤10% opacity per DESIGN.md —
		"--color-skeleton": ["#E8E2DA", "#2A2A28"],
		"--color-shadow": ["rgba(0, 0, 0, 0.08)", "rgba(0, 0, 0, 0.4)"],
		"--color-tint-hover": ["black", "white"],
		"--shadow-low": [
			"rgba(20, 20, 19, 0.04) 0px 2px 8px",
			"rgba(0, 0, 0, 0.3) 0px 2px 8px",
		],
		"--shadow-med": [
			"rgba(20, 20, 19, 0.06) 0px 12px 32px",
			"rgba(0, 0, 0, 0.35) 0px 12px 32px",
		],
		"--shadow-high": [
			"rgba(0, 0, 0, 0.08) 0px 24px 48px",
			"rgba(0, 0, 0, 0.45) 0px 24px 48px",
		],

		// — Signal Orange accent scale (attention cue only, never body color) —
		"--color-background-orange": ["#F9DCCB", "rgba(243, 115, 56, 0.16)"],
		"--color-border-orange": ["#E8A177", "rgba(243, 115, 56, 0.45)"],
		"--color-icon-orange": ["#CF4500", "#F37338"],
		"--color-text-orange": ["#9A3A0A", "#F9A47C"],

		// — Extreme radii: 20px buttons, 40px panels, 999px pills/circles —
		"--radius-element": "20px",
		"--radius-container": "40px",
		"--radius-inner": "999px",
	},
	components: {
		button: {
			base: {
				// Stadium pill CTAs with the MC tight tracking.
				borderRadius: "var(--radius-element)",
				letterSpacing: "-0.02em",
				fontWeight: "500",
			},
		},
		badge: {
			base: {
				borderRadius: "var(--radius-full)",
			},
		},
	},
});

export type MastercardTheme = typeof mastercardTheme;
