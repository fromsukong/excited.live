import type { ReactNode } from "react";

export interface AppDocumentProps {
	/** Document language. Defaults to "en". */
	lang?: string;
	/** Value for the data-theme attribute. Defaults to "dark". */
	theme?: string;
	/** Contents of <head> (meta, title, CSS links, HeadContent, …). */
	head: ReactNode;
	/** App content rendered inside <body> before scripts. */
	children: ReactNode;
	/** Scripts rendered at the end of <body> (e.g. TanStack <Scripts />). */
	scripts?: ReactNode;
}

/**
 * Root document shell (<html>/<head>/<body>) for SSR apps. This is the ONLY
 * place a raw html element is allowed outside packages/design-system sources:
 * the raw elements themselves live here, in the design system.
 */
export function AppDocument({ lang = "en", theme = "dark", head, children, scripts }: AppDocumentProps) {
	return (
		<html lang={lang} data-theme={theme}>
			<head>{head}</head>
			<body>
				{children}
				{scripts}
			</body>
		</html>
	);
}
