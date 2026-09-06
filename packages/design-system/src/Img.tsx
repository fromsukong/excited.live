import { type ImgHTMLAttributes } from "react";

export type ImgProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "children">;

/**
 * Typed image primitive. Exists so app code never writes raw <img> elements
 * (same rationale as AppDocument for html/body) — styling stays in app CSS.
 */
export function Img(props: ImgProps) {
	return <img {...props} />;
}
