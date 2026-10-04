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
	Selector,
	Stack,
	Text,
	TextInput,
} from "@excited-live/design-system"
import { useLocale } from "../../lib/locale-context"
import { MONTHS_EN, MONTHS_TH } from "./months"
import {
	ASSET_TYPE_IDS,
	EXPENSE_TYPE_DEFAULT_FREQUENCY,
	EXPENSE_TYPE_IDS,
	INCOME_TYPE_DEFAULT_FREQUENCY,
	INCOME_TYPE_IDS,
	LIABILITY_TYPE_IDS,
	type AmountFrequency,
	type AssetRow,
	type ExpenseTypeId,
	type IncomeTypeId,
	type LiabilityRow,
	type PeriodRow,
	type PlanInput,
} from "../../lib/plan-service"

/**
 * Month + year picker for a period row boundary. Month = Astryx Selector
 * dropdown; year = compact integer input. `allowForever` adds an ∞ option
 * that clears the end year (row runs forever).
 */
function MonthYearPicker({
	label,
	year,
	month,
	onChange,
	allowForever = false,
	t,
}: {
	label: string
	year: number | null
	month: number
	onChange: (year: number | null, month: number) => void
	allowForever?: boolean
	t: (key: string, vars?: Record<string, string>) => string
}) {
	const { locale } = useLocale()
	const monthNames = locale === "th" ? MONTHS_TH : MONTHS_EN
	const forever = allowForever && year === null
	const monthOptions = monthNames.map((name, index) => ({ value: `${index}:${name}`, label: name }))
	return (
		<Stack gap={0.5}>
			<Text size="sm" color="secondary">{label}</Text>
			<Stack direction="horizontal" align="center" gap={1}>
				{allowForever ? (
					<SegmentedControl
						value={forever ? "forever" : "until"}
						onChange={(value) => onChange(value === "forever" ? null : new Date().getFullYear() + 1, month)}
						label={label}
						size="sm"
					>
						<SegmentedControlItem value="until" label={t("row.until")} />
						<SegmentedControlItem value="forever" label="∞" />
					</SegmentedControl>
				) : null}
				{!forever ? (
					<>
						<NumberInput
							label={`${label} ${t("freq.yearly")}`}
							isLabelHidden
							value={year ?? undefined}
							onChange={(value) => onChange(value === null ? null : Math.round(value), month)}
							isIntegerOnly
							min={2000}
							max={2100}
							width={88}
						/>
						<Selector
							label={`${label} ${t("table.month")}`}
							isLabelHidden
							value={`${month}:${monthNames[month]}`}
							onChange={(value) => {
								const parsed = Number.parseInt(value.split(":")[0] ?? "0", 10)
								onChange(year, Number.isFinite(parsed) ? parsed : 0)
							}}
							options={monthOptions}
							width={110}
						/>
					</>
				) : null}
			</Stack>
		</Stack>
	)
}

export function EntryDialog({
	dialog,
	plan,
	onSave,
	onRemove,
	onClose,
	t,
}: {
	dialog:
		| { mode: "add"; kind: "incomes" | "expenses"; typeId: string }
		| { mode: "edit"; kind: "incomes" | "expenses"; rowId: string }
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
}) {
	const existingRow = dialog.mode === "edit" ? plan[dialog.kind].find((r) => r.id === dialog.rowId) : null
	const typeId =
		dialog.mode === "edit"
			? (existingRow?.typeId ?? (dialog.kind === "incomes" ? "salary" : "livingExpenses"))
			: dialog.typeId
	const defaultFreq =
		dialog.kind === "incomes"
			? (INCOME_TYPE_DEFAULT_FREQUENCY[typeId as IncomeTypeId] ?? "monthly")
			: (EXPENSE_TYPE_DEFAULT_FREQUENCY[typeId as ExpenseTypeId] ?? "monthly")

	const [label, setLabel] = useState(dialog.mode === "edit" ? (existingRow?.label ?? "") : t(`type.${typeId}`))
	const [amount, setAmount] = useState(dialog.mode === "edit" ? (existingRow?.amount ?? 0) : 0)
	const [frequency, setFrequency] = useState<AmountFrequency>(
		dialog.mode === "edit" ? (existingRow?.frequency ?? defaultFreq) : defaultFreq,
	)
	const [startYear, setStartYear] = useState(dialog.mode === "edit" ? (existingRow?.startYear ?? plan.startYear) : plan.startYear)
	const [startMonth, setStartMonth] = useState(dialog.mode === "edit" ? (existingRow?.startMonth ?? 0) : 0)
	const [endYear, setEndYear] = useState<number | null>(dialog.mode === "edit" ? (existingRow?.endYear ?? null) : null)
	const [endMonth, setEndMonth] = useState(dialog.mode === "edit" ? (existingRow?.endMonth ?? 11) : 11)
	const [growthMode, setGrowthMode] = useState<PeriodRow["growthMode"]>(
		dialog.mode === "edit" ? (existingRow?.growthMode ?? "inflation") : "inflation",
	)
	const [growthRate, setGrowthRate] = useState(dialog.mode === "edit" ? (existingRow?.growthRate ?? 0) : 0)
	const [deductible, setDeductible] = useState<PeriodRow["deductible"]>(
		dialog.mode === "edit" ? (existingRow?.deductible ?? "none") : "none",
	)

	const typeLabel = t(`type.${typeId}`)
	const title = dialog.mode === "add" ? t("dialog.addItem", { label: typeLabel }) : t("dialog.editItem", { label: typeLabel })

	return (
		<Dialog isOpen onOpenChange={(open) => { if (!open) onClose() }} purpose="form" width={640}>
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
								<Text size="sm" color="secondary">{t("row.frequency")}</Text>
								<SegmentedControl
									value={frequency}
									onChange={(v) => setFrequency(v as AmountFrequency)}
									label={t("row.frequency")}
									layout="fill"
									size="sm"
								>
									<SegmentedControlItem value="monthly" label={t("freq.monthly")} />
									<SegmentedControlItem value="yearly" label={t("freq.yearly")} />
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
								<Text size="sm" color="secondary">{t("row.growth")}</Text>
								<SegmentedControl
									value={growthMode}
									onChange={(v) => setGrowthMode(v as PeriodRow["growthMode"])}
									label={t("row.growth")}
									layout="fill"
									size="sm"
								>
									<SegmentedControlItem value="inflation" label={t("growth.inflation")} />
									<SegmentedControlItem value="fixed" label={t("growth.fixed")} />
									<SegmentedControlItem value="override" label={t("growth.override")} />
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
									<Text size="sm" color="secondary">{t("row.deductible")}</Text>
									<SegmentedControl
										value={deductible ?? "none"}
										onChange={(v) => setDeductible(v === "mortgageInterest" ? "mortgageInterest" : "none")}
										label={t("row.deductible")}
										layout="fill"
										size="sm"
									>
										<SegmentedControlItem value="none" label={t("deductible.none")} />
										<SegmentedControlItem value="mortgageInterest" label={t("deductible.mortgageInterest")} />
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
							<Button label={t("dialog.cancel")} variant="secondary" onClick={onClose} />
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

export function ValueDialog({
	dialog,
	plan,
	onSave,
	onRemove,
	onClose,
	t,
}: {
	dialog:
		| { mode: "add"; kind: "assets" | "liabilities"; typeId: string }
		| { mode: "edit"; kind: "assets" | "liabilities"; rowId: string }
	plan: PlanInput
	onSave: (values: { label: string; value: number }) => void
	onRemove: (id: string) => void
	onClose: () => void
	t: (key: string, vars?: Record<string, string>) => string
}) {
	const existingRow =
		dialog.mode === "edit" ? (plan[dialog.kind] as Array<AssetRow | LiabilityRow>).find((r) => r.id === dialog.rowId) : null
	const typeId = dialog.mode === "edit" ? (existingRow?.typeId ?? (dialog.kind === "assets" ? "stock" : "debt")) : dialog.typeId
	const typeLabel = t(`type.${typeId}`)
	const [label, setLabel] = useState(dialog.mode === "edit" ? (existingRow?.label ?? "") : typeLabel)
	const [value, setValue] = useState(dialog.mode === "edit" ? (existingRow?.value ?? 0) : 0)

	const title = dialog.mode === "add" ? t("dialog.addItem", { label: typeLabel }) : t("dialog.editItem", { label: typeLabel })

	return (
		<Dialog isOpen onOpenChange={(open) => { if (!open) onClose() }} purpose="form" width={520}>
			<Layout
				header={<DialogHeader title={title} onOpenChange={() => onClose()} />}
				content={
					<LayoutContent>
						<Stack gap={1.5}>
							<TextInput label={t("row.label")} value={label} onChange={setLabel} />
							<NumberInput
								label={t("table.value")}
								value={value}
								onChange={(v) => setValue(v ?? 0)}
								min={0}
								step={1000}
								units="฿"
							/>
						</Stack>
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
							<Button label={t("dialog.cancel")} variant="secondary" onClick={onClose} />
							<Button
								label={t("dialog.save")}
								variant="primary"
								onClick={() => {
									onSave({
										label: label.trim() || typeLabel,
										value,
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

export function MilestoneDialog({
	id,
	plan,
	onSave,
	onRemove,
	onClose,
	t,
}: {
	id: string | null
	plan: PlanInput
	onSave: (values: { label: string; year: number; month: number }) => void
	onRemove: (id: string) => void
	onClose: () => void
	t: (key: string, vars?: Record<string, string>) => string
}) {
	const existing = id !== null ? plan.milestones.find((m) => m.id === id) : null
	const [label, setLabel] = useState(existing?.label ?? "")
	const [year, setYear] = useState(existing?.year ?? plan.startYear + 29)
	const [month, setMonth] = useState(existing?.month ?? 0)

	const title = id === null ? t("milestone.add") : t("milestone.edit")

	return (
		<Dialog isOpen onOpenChange={(open) => { if (!open) onClose() }} purpose="form" width={520}>
			<Layout
				header={<DialogHeader title={title} onOpenChange={() => onClose()} />}
				content={
					<LayoutContent>
						<Stack gap={1.5}>
							<TextInput label={t("row.label")} value={label} onChange={setLabel} />
							<MonthYearPicker
								label={t("milestone.date")}
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
							<Button label={t("dialog.cancel")} variant="secondary" onClick={onClose} />
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

export function TypePickerDialog({
	kind,
	addedTypeIds,
	onPick,
	onClose,
	t,
}: {
	kind: "incomes" | "expenses" | "assets" | "liabilities"
	addedTypeIds: string[]
	onPick: (typeId: string) => void
	onClose: () => void
	t: (key: string, vars?: Record<string, string>) => string
}) {
	const catalog =
		kind === "incomes"
			? INCOME_TYPE_IDS
			: kind === "expenses"
				? EXPENSE_TYPE_IDS
				: kind === "assets"
					? ASSET_TYPE_IDS
					: LIABILITY_TYPE_IDS

	const available = catalog.filter((id) => !addedTypeIds.includes(id))

	const titleKey =
		kind === "incomes"
			? "dialog.addType.income"
			: kind === "expenses"
				? "dialog.addType.expense"
				: kind === "assets"
					? "dialog.addType.asset"
					: "dialog.addType.liability"

	return (
		<Dialog isOpen onOpenChange={(open) => { if (!open) onClose() }} purpose="info" width={420}>
			<Layout
				header={<DialogHeader title={t(titleKey)} onOpenChange={() => onClose()} />}
				content={
					<LayoutContent>
						{available.length === 0 ? (
							<Text color="secondary">{t("dialog.allTypesAdded")}</Text>
						) : (
							<Stack className="dialog-options">
								{available.map((id) => (
									<PlainButton
										key={id}
										className="dialog-option"
										onClick={() => onPick(id)}
									>
										{t(`type.${id}`)}
									</PlainButton>
								))}
							</Stack>
						)}
					</LayoutContent>
				}
			/>
		</Dialog>
	)
}
