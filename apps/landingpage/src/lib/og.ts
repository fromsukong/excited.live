/** Shared helpers for the build-time OG image routes (blog + docs). */

/** Collapse whitespace and clamp to `max` chars at a word boundary (adds …). */
export function clampText(text: string, max: number): string {
	const clean = text.replace(/\s+/g, ' ').trim();
	if (clean.length <= max) return clean;
	const cut = clean.slice(0, max);
	const lastSpace = cut.lastIndexOf(' ');
	return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).trimEnd()}…`;
}

/** Brand accents for the dark OG cards (tokens from src/styles/landing.css). */
export const OG_COLORS = {
	primaryColor: 'rgba(207, 69, 0, 0.55)',
	primaryTextColor: '#f37338',
};
