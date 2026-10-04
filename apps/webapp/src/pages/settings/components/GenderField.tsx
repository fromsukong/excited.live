import {
	SegmentedControl,
	SegmentedControlItem,
	Stack,
	Text,
} from "@excited-live/design-system"

export interface GenderFieldProps {
	value: string
	onChange: (val: string) => void
	t: (key: string, vars?: Record<string, string>) => string
}

export function GenderField({ value, onChange, t }: GenderFieldProps) {
	return (
		<Stack gap={1}>
			<Text size="sm" color="secondary">
				{t("settings.gender")}
			</Text>
			<SegmentedControl
				value={value}
				onChange={onChange}
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
	)
}
