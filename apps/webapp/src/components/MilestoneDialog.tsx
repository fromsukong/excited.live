import { useState } from "react"
import {
	Button,
	Dialog,
	DialogHeader,
	HStack,
	Layout,
	LayoutContent,
	LayoutFooter,
	PlainButton,
	Stack,
	TextInput,
} from "@excited-live/design-system"
import { type PlanInput } from "../lib/plan-service"
import { MonthYearPicker } from "./MonthYearPicker"

export interface MilestoneDialogProps {
	id: string | null
	plan: PlanInput
	onSave: (values: { label: string; year: number; month: number }) => void
	onRemove: (id: string) => void
	onClose: () => void
	t: (key: string, vars?: Record<string, string>) => string
}

export function MilestoneDialog({
	id,
	plan,
	onSave,
	onRemove,
	onClose,
	t,
}: MilestoneDialogProps) {
	const existing =
		id !== null ? plan.milestones.find((m) => m.id === id) : null
	const [label, setLabel] = useState(existing?.label ?? "")
	const [year, setYear] = useState(existing?.year ?? plan.startYear + 29)
	const [month, setMonth] = useState(existing?.month ?? 0)

	const title = id === null ? t("milestone.add") : t("milestone.edit")

	return (
		<Dialog
			isOpen
			onOpenChange={(open) => {
				if (!open) onClose()
			}}
			purpose="form"
			width={520}
		>
			<Layout
				header={<DialogHeader title={title} onOpenChange={() => onClose()} />}
				content={
					<LayoutContent>
						<Stack gap={1.5}>
							<TextInput
								label={t("row.label")}
								value={label}
								onChange={setLabel}
							/>
							<MonthYearPicker
								label={t("table.month")}
								year={year}
								month={month}
								onChange={(y, m) => {
									if (y !== null) setYear(y)
									setMonth(m)
								}}
								t={t}
							/>
						</Stack>
					</LayoutContent>
				}
				footer={
					<LayoutFooter>
						<HStack gap={2} hAlign="end">
							{id !== null ? (
								<PlainButton onClick={() => onRemove(id)}>
									{t("row.remove")}
								</PlainButton>
							) : null}
							<Button
								label={t("dialog.cancel")}
								variant="secondary"
								onClick={onClose}
							/>
							<Button
								label={t("dialog.save")}
								variant="primary"
								onClick={() => {
									onSave({
										label: label.trim() || t("tab.milestone"),
										year,
										month,
									})
								}}
							/>
						</HStack>
					</LayoutFooter>
				}
			/>
		</Dialog>
	)
}
