import {
	DateInput,
	Grid,
	Heading,
	SegmentedControl,
	SegmentedControlItem,
	Stack,
	Text,
	TextInput,
	type DateInputProps,
} from "@excited-live/design-system"

export interface SettingsPanelProps {
	profileName: string
	onProfileNameChange: (val: string) => void
	birthday: DateInputProps["value"]
	onBirthdayChange: (val: DateInputProps["value"]) => void
	gender: string
	onGenderChange: (val: string) => void
	t: (key: string, vars?: Record<string, string>) => string
}

export function SettingsPanel({
	profileName,
	onProfileNameChange,
	birthday,
	onBirthdayChange,
	gender,
	onGenderChange,
	t,
}: SettingsPanelProps) {
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
					onChange={onProfileNameChange}
				/>
				<DateInput
					label={t("settings.birthday")}
					value={birthday}
					onChange={onBirthdayChange}
				/>
				<Stack gap={1}>
					<Text size="sm" color="secondary">
						{t("settings.gender")}
					</Text>
					<SegmentedControl
						value={gender}
						onChange={onGenderChange}
						label={t("settings.gender")}
						layout="fill"
						size="sm"
					>
						<SegmentedControlItem
							value="female"
							label={t("settings.gender.female")}
						/>
						<SegmentedControlItem
							value="male"
							label={t("settings.gender.male")}
						/>
						<SegmentedControlItem
							value="other"
							label={t("settings.gender.other")}
						/>
					</SegmentedControl>
				</Stack>
			</Grid>
		</Stack>
	)
}
