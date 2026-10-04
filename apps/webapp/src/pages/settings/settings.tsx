import {
	DateInput,
	Grid,
	Heading,
	Stack,
	Text,
	TextInput,
} from "@excited-live/design-system"
import { GenderField } from "./components/GenderField"
import { usePlanDashboardContext } from "../../hooks/usePlanDashboard"

export function Settings() {
	const {
		t,
		profileName,
		setProfileName,
		birthday,
		setBirthday,
		gender,
		setGender,
	} = usePlanDashboardContext()

	return (
		<Stack gap={3} className="chart-panel__inner settings-panel">
			<Stack gap={1}>
				<Heading level={2}>{t("nav.settings")}</Heading>
				<Text color="secondary">{t("settings.note")}</Text>
			</Stack>
			<Grid columns={{ minWidth: 220, max: 2 }} gap={2}>
				<TextInput
					label={t("settings.name")}
					value={profileName}
					onChange={setProfileName}
				/>
				<DateInput
					label={t("settings.birthday")}
					value={birthday}
					onChange={setBirthday}
				/>
				<GenderField
					value={gender}
					onChange={setGender}
					t={t}
				/>
			</Grid>
		</Stack>
	)
}

export default Settings
