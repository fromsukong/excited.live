import {
	Img,
	PlainButton,
	Stack,
	Tab,
	TabList,
	Text,
} from "@excited-live/design-system"
import { Link, useLocation } from "@tanstack/react-router"
import { useLocale } from "../lib/locale-context"

export function Topbar() {
	const { t, locale, setLocale } = useLocale()
	const location = useLocation()

	const currentTab = location.pathname.startsWith("/settings")
		? "settings"
		: "plan"

	return (
		<Stack
			direction="horizontal"
			justify="between"
			vAlign="center"
			as="header"
			className="topbar"
		>
			<Link to="/" className="brand-lockup">
				<Img
					className="brand-lockup__mark"
					src="/logo-mark.png"
					alt=""
					width={30}
					height={26}
				/>
				<Img
					className="brand-lockup__wordmark"
					src="/logo-wordmark.png"
					alt="excited.live"
					height={15}
				/>
				<Text
					size="lg"
					color="secondary"
					weight="semibold"
					className="brand-lockup__hello"
				>
					{t("nav.hello")}
				</Text>
			</Link>
			<TabList
				className="topnav"
				value={currentTab}
				onChange={() => {}}
				size="sm"
				aria-label={t("a11y.mainNav")}
			>
				<Tab
					value="plan"
					label={t("nav.plan")}
					href="/"
					as={Link}
				/>
				<Tab
					value="settings"
					label={t("nav.settings")}
					href="/settings"
					as={Link}
				/>
			</TabList>
			<Stack
				direction="horizontal"
				vAlign="center"
				className="market-status"
			>
				<Text color="secondary">{t("nav.synced")}</Text>
				<PlainButton
					className={`locale-button ${locale === "th" ? "is-active" : ""}`}
					aria-label={t("locale.toggle")}
					onClick={() => setLocale(locale === "en" ? "th" : "en")}
				>
					{locale === "en" ? t("locale.th") : t("locale.en")}
				</PlainButton>
			</Stack>
		</Stack>
	)
}
