import { type ReactNode, type SVGProps } from "react";

export type SvgProps = SVGProps<SVGSVGElement> & { children?: ReactNode };
export type SvgLineProps = SVGProps<SVGLineElement>;
export type SvgPathProps = SVGProps<SVGPathElement>;

/** Zero-style inline SVG root (charts, brand marks, icon hosts). */
export function Svg({ children, ...rest }: SvgProps) {
	return <svg {...rest}>{children}</svg>;
}

export function SvgLine(rest: SvgLineProps) {
	return <line {...rest} />;
}

export function SvgPath(rest: SvgPathProps) {
	return <path {...rest} />;
}

export type SvgCircleProps = SVGProps<SVGCircleElement>;

export function SvgCircle(rest: SvgCircleProps) {
	return <circle {...rest} />;
}
