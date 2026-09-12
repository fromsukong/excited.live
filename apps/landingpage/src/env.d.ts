/// <reference types="astro/client" />

interface Window {
	/** GA4 shim — defined only on the production hostname (see layout.astro). */
	gtag?: (...args: unknown[]) => void;
	dataLayer?: unknown[];
}
