import { type AnchorHTMLAttributes, type ReactNode, type Ref } from "react";

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
	children?: ReactNode;
	ref?: Ref<HTMLAnchorElement>;
}

/**
 * Zero-style native anchor. All styling comes from app stylesheets.
 * Use for real full-page navigations the router must not intercept
 * (auth endpoints, external URLs) — use router components for in-app routes.
 */
export function Link({ children, ...rest }: LinkProps) {
	return <a {...rest}>{children}</a>;
}
