import { useState } from "react"
import {
	Button,
	Dialog,
	DialogHeader,
	Grid,
	HStack,
	Layout,
	LayoutContent,
	LayoutFooter,
	NumberInput,
	PlainButton,
	SegmentedControl,
	SegmentedControlItem,
	Stack,
	Text,
	TextInput,
} from "@excited-live/design-system"
import {
	EXPENSE_TYPE_DEFAULT_FREQUENCY,
	INCOME_TYPE_DEFAULT_FREQUENCY,
	type AmountFrequency,
	type ExpenseTypeId,
	type IncomeTypeId,
	type PeriodRow,
	type PlanInput,
} from "../lib/plan-service"
import { MonthYearPicker } from "./MonthYearPicker"

export type EntryDialogDescriptor =
	| { mode: "add"; kind: "incomes" | "expenses"; typeId: string }
	| { mode: "edit"; kind: "incomes" | "expenses"; rowId: string }

export interface EntryDialogProps {
	dialog: EntryDialogDescriptor
	plan: PlanInput
	onSave: (values: {
		label: string
		amount: number
		frequency: AmountFrequency
		startYear: number
		startMonth: number
		endYear: number | null
		endMonth: number
		growthMode: PeriodRow["growthMode"]
		growthRate: number
		deductible?: PeriodRow["deductible"]
	}) => void
	onRemove: (id: string) => void
	onClose: () => void
	t: (key: string, vars?: Record<string, string>) => string
}

export function EntryDialog({
	dialog,
	plan,
	onSave,
	onRemove,
	onClose,
	t,
}: EntryDialogProps) {
	const existingRow =
		dialog.mode === "edit"
			? plan[dialog.kind].find((r) => r.id === dialog.rowId)
			: null
	const typeId =
		dialog.mode === "edit"
			? (existingRow?.typeId ??
				(dialog.kind === "incomes" ? "salary" : "livingExpenses"))
			: dialog.typeId
	const defaultFreq =
		dialog.kind === "incomes"
			? (INCOME_TYPE_DEFAULT_FREQUENCY[typeId as IncomeTypeId] ?? "monthly")
			: (EXPENSE_TYPE_DEFAULT_FREQUENCY[typeId as ExpenseTypeId] ?? "monthly")

	const [label, setLabel] = useState(
		dialog.mode === "edit"
			? (existingRow?.label ?? "")
			: t(`type.${typeId}`),
	)
	const [amount, setAmount] = useState(
		dialog.mode === "edit" ? (existingRow?.amount ?? 0) : 0,
	)
	const [frequency, setFrequency] = useState<AmountFrequency>(
		dialog.mode === "edit" ? (existingRow?.frequency ?? defaultFreq) : defaultFreq,
	)
	const [startYear, setStartYear] = useState(
		dialog.mode === "edit"
			? (existingRow?.startYear ?? plan.startYear)
			: plan.startYear,
	)
	const [startMonth, setStartMonth] = useState(
		dialog.mode === "edit" ? (existingRow?.startMonth ?? 0) : 0,
	)
	const [endYear, setEndYear] = useState<number | null>(
		dialog.mode === "edit" ? (existingRow?.endYear ?? null) : null,
	)
	const [endMonth, setEndMonth] = useState(
		dialog.mode === "edit" ? (existingRow?.endMonth ?? 11) : 11,
	)
	const [growthMode, setGrowthMode] = useState<PeriodRow["growthMode"]>(
		dialog.mode === "edit"
			? (existingRow?.growthMode ?? "inflation")
			: "inflation",
	)
	const [growthRate, setGrowthRate] = useState(
		dialog.mode === "edit" ? (existingRow?.growthRate ?? 0) : 0,
	)
	const [deductible, setDeductible] = useState<PeriodRow["deductible"]>(
		dialog.mode === "edit" ? (existingRow?.deductible ?? "none") : "none",
	)

	const typeLabel = t(`type.${typeId}`)
	const title =
		dialog.mode === "add"
			? t("dialog.addItem", { label: typeLabel })
			: t("dialog.editItem", { label: typeLabel })

	return (
		<Dialog
			isOpen
			onOpenChange={(open) => {
				if (!open) onClose()
			}}
			purpose="form"
			width={640}
		>
			<Layout
				header={<DialogHeader title={title} onOpenChange={() => onClose()} />}
				content={
					<LayoutContent>
						<Grid columns={{ minWidth: 240, max: 2 }} gap={1.5}>
							<TextInput
								label={t("row.label")}
								value={label}
								onChange={setLabel}
							/>
							<NumberInput
								label={t("row.amount")}
								value={amount}
								onChange={(v) => setAmount(v ?? 0)}
								min={0}
								step={1000}
								units="฿"
							/>
							<Stack gap={0.5}>
								<Text size="sm" color="secondary">
									{t("row.frequency")}
								</Text>
								<SegmentedControl
									value={frequency}
									onChange={(v) => setFrequency(v as AmountFrequency)}
									label={t("row.frequency")}
									layout="fill"
									size="sm"
								>
									<SegmentedControlItem
										value="monthly"
										label={t("freq.monthly")}
									/>
									<SegmentedControlItem
										value="yearly"
										label={t("freq.yearly")}
									/>
								</SegmentedControl>
							</Stack>
							<MonthYearPicker
								label={t("row.startYear")}
								year={startYear}
								month={startMonth}
								onChange={(y, m) => {
									if (y !== null) setStartYear(y)
									setStartMonth(m)
								}}
								t={t}
							/>
							<MonthYearPicker
								label={t("row.endYear")}
								year={endYear}
								month={endMonth}
								allowForever
								onChange={(y, m) => {
									setEndYear(y)
									setEndMonth(m)
								}}
								t={t}
							/>
							<Stack gap={1}>
								<Text size="sm" color="secondary">
									{t("row.growth")}
								</Text>
								<SegmentedControl
									value={growthMode}
									onChange={(v) => setGrowthMode(v as PeriodRow["growthMode"])}
									label={t("row.growth")}
									layout="fill"
									size="sm"
								>
									<SegmentedControlItem
										value="inflation"
										label={t("growth.inflation")}
									/>
									<SegmentedControlItem
										value="fixed"
										label={t("growth.fixed")}
									/>
									<SegmentedControlItem
										value="override"
										label={t("growth.override")}
									/>
								</SegmentedControl>
								{growthMode === "override" ? (
									<NumberInput
										label={t("row.growthRate")}
										value={growthRate * 100}
										onChange={(v) => setGrowthRate((v ?? 0) / 100)}
										min={-10}
										max={50}
										step={0.5}
										units="%"
									/>
								) : null}
							</Stack>
							{dialog.kind === "expenses" ? (
								<Stack gap={1}>
									<Text size="sm" color="secondary">
										{t("row.deductible")}
									</Text>
									<SegmentedControl
										value={deductible ?? "none"}
										onChange={(v) =>
											setDeductible(
												v === "mortgageInterest" ? "mortgageInterest" : "none",
											)
										}
										label={t("row.deductible")}
										layout="fill"
										size="sm"
									>
										<SegmentedControlItem
											value="none"
											label={t("deductible.none")}
										/>
										<SegmentedControlItem
											value="mortgageInterest"
											label={t("deductible.mortgageInterest")}
										/>
									</SegmentedControl>
								</Stack>
							) : null}
						</Grid>
					</LayoutContent>
				}
				footer={
					<LayoutFooter>
						<HStack gap={2} hAlign="end">
							{dialog.mode === "edit" ? (
								<PlainButton onClick={() => onRemove(dialog.rowId)}>
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
										label: label.trim() || typeLabel,
										amount,
										frequency,
										startYear,
										startMonth,
										endYear,
										endMonth,
										growthMode,
										growthRate,
										...(dialog.kind === "expenses" ? { deductible } : {}),
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
