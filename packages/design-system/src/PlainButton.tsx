import { type ButtonHTMLAttributes, type ReactNode, type Ref } from "react";

export interface PlainButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
	/** Defaults to "button" so plain buttons never submit surrounding forms. */
	type?: "button" | "submit" | "reset";
	children?: ReactNode;
	ref?: Ref<HTMLButtonElement>;
}

/**
 * Zero-style native button. All styling comes from app stylesheets.
 * Use Astryx `Button`/`IconButton` when the design system look is wanted.
 */
export function PlainButton({ type = "button", children, ...rest }: PlainButtonProps) {
	return (
		<button type={type} {...rest}>
			{children}
		</button>
	);
}
