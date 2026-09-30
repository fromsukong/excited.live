import { useState } from "react"
import {
	PlainButton,
	Stack,
	Table,
	Text,
	pixel,
	proportional,
	useTableRowExpansion,
	type TableColumn,
} from "@excited-live/design-system"
import { useLocale } from "../../lib/locale-context"
import {
	ASSET_TYPE_IDS,
	EXPENSE_TYPE_IDS,
	INCOME_TYPE_IDS,
	LIABILITY_TYPE_IDS,
	rowLifetimeTotal,
	type AssetRow,
	type AssetTypeId,
	type ExpenseTypeId,
	type IncomeTypeId,
	type LiabilityRow,
	type LiabilityTypeId,
	type PeriodRow,
	type PlanInput,
} from "../../lib/plan-service"
import { formatBaht } from "../../lib/format"
import { MONTHS_EN, MONTHS_TH } from "./months"

/** Row id for the synthetic "+ Add row" line at the bottom of an editor table. */
const ADD_ROW_ID = "__add__"

/** Nested entry table rendered inside an expanded income/expense type group. */
type PeriodRowItem = PeriodRow & Record<string, unknown>

function EntryTable({
	rows,
	plan,
	onEditItem,
	t,
}: {
	rows: PeriodRow[]
	plan: PlanInput
	onEditItem: (row: PeriodRow) => void
	t: (key: string, vars?: Record<string, string>) => string
}) {
	const columns: TableColumn<PeriodRowItem>[] = [
		{
			key: "label",
			header: t("row.label"),
			width: proportional(1),
			renderCell: (row) => (
				<PlainButton className="row-add" onClick={() => onEditItem(row)}>
					{row.label}
				</PlainButton>
			),
		},
		{
			key: "period",
			header: t("row.period"),
			width: pixel(110),
			align: "end",
			renderCell: (row) => (
				<Text color="secondary" hasTabularNumbers>
					{row.startYear} – {row.endYear ?? "∞"}
				</Text>
			),
		},
		{
			key: "amount",
			header: t("table.rate"),
			width: pixel(140),
			align: "end",
			renderCell: (row) => (
				<Text hasTabularNumbers>
					{formatBaht(row.amount)} {t(row.frequency === "monthly" ? "freq.perMonth" : "freq.perYear")}
				</Text>
			),
		},
		{
			key: "lifetime",
			header: t("table.lifetime"),
			width: pixel(140),
			align: "end",
			renderCell: (row) => (
				<Text hasTabularNumbers>
					{formatBaht(rowLifetimeTotal(row, plan))}
				</Text>
			),
		},
	]

	return (
		<Table
			data={rows as PeriodRowItem[]}
			idKey="id"
			density="compact"
			dividers="rows"
			hasHover
			columns={columns}
		/>
	)
}

interface PeriodGroupRowData extends Record<string, unknown> {
	id: string
	typeId?: IncomeTypeId | ExpenseTypeId
	total?: number
	periodText?: string
}

export function GroupedPeriodTable({
	kind,
	plan,
	addedTypeIds,
	onAddType,
	onAddItem,
	onEditItem,
	t,
}: {
	kind: "incomes" | "expenses"
	plan: PlanInput
	addedTypeIds: string[]
	onAddType: () => void
	onAddItem: (typeId: string) => void
	onEditItem: (row: PeriodRow) => void
	t: (key: string, vars?: Record<string, string>) => string
}) {
	const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
	const catalog = kind === "incomes" ? INCOME_TYPE_IDS : EXPENSE_TYPE_IDS
	const activeTypeIds = catalog.filter((id) => addedTypeIds.includes(id))

	const expansion = useTableRowExpansion<PeriodGroupRowData>({
		expandedKeys,
		onToggle: (key) =>
			setExpandedKeys((prev) => {
				const next = new Set(prev)
				if (next.has(key)) next.delete(key)
				else next.add(key)
				return next
			}),
		getRowKey: (item) => item.id,
		getIsItemExpandable: (item) => item.id !== ADD_ROW_ID,
		renderExpanded: (item) => {
			const typeId = item.typeId!
			const entries = plan[kind].filter((r) => r.typeId === typeId)
			return (
				<Stack className="row-detail" gap={1.5}>
					{entries.length > 0 ? (
						<EntryTable rows={entries} plan={plan} onEditItem={onEditItem} t={t} />
					) : (
						<Text color="secondary">{t("group.empty")}</Text>
					)}
					<PlainButton className="row-add" onClick={() => onAddItem(typeId)}>
						+ {t("group.addItem", { label: t(`type.${typeId}`) })}
					</PlainButton>
				</Stack>
			)
		},
	})

	const rows: PeriodGroupRowData[] = activeTypeIds.map((typeId) => {
		const entries = plan[kind].filter((r) => r.typeId === typeId)
		const total = entries.reduce((acc, r) => acc + rowLifetimeTotal(r, plan), 0)
		let periodText = "—"
		if (entries.length > 0) {
			const minStart = Math.min(...entries.map((r) => r.startYear))
			const hasForever = entries.some((r) => r.endYear === null)
			const maxEnd = hasForever ? "∞" : Math.max(...entries.map((r) => r.endYear as number))
			periodText = `${minStart} – ${maxEnd}`
		}
		return {
			id: typeId,
			typeId,
			total,
			periodText,
		}
	})

	const addMarker: PeriodGroupRowData = {
		id: ADD_ROW_ID,
	}

	const data: PeriodGroupRowData[] = [...rows, addMarker]

	const columns: TableColumn<PeriodGroupRowData>[] = [
		{
			key: "name",
			header: t("row.label"),
			width: proportional(1),
			renderCell: (row) =>
				row.id === ADD_ROW_ID ? (
					<PlainButton className="row-add" onClick={onAddType}>
						+ {t("row.addType")}
					</PlainButton>
				) : (
					<Text weight="semibold">{t(`type.${row.typeId}`)}</Text>
				),
		},
		{
			key: "total",
			header: t("table.total"),
			width: pixel(140),
			align: "end",
			renderCell: (row) =>
				row.id === ADD_ROW_ID ? null : (
					<Text hasTabularNumbers>{formatBaht(row.total ?? 0)}</Text>
				),
		},
		{
			key: "period",
			header: t("row.period"),
			width: pixel(120),
			align: "end",
			renderCell: (row) =>
				row.id === ADD_ROW_ID ? null : (
					<Text color="secondary" hasTabularNumbers>
						{row.periodText}
					</Text>
				),
		},
	]

	return (
		<Table
			data={data}
			idKey="id"
			density="compact"
			dividers="rows"
			hasHover
			columns={columns}
			plugins={{ expansion }}
		/>
	)
}

interface ValueGroupRowData extends Record<string, unknown> {
	id: string
	typeId?: AssetTypeId | LiabilityTypeId
	total?: number
}

type ValueEntryItem = (AssetRow | LiabilityRow) & Record<string, unknown>

export function GroupedValueTable({
	kind,
	plan,
	addedTypeIds,
	onAddType,
	onAddItem,
	onEditItem,
	t,
}: {
	kind: "assets" | "liabilities"
	plan: PlanInput
	addedTypeIds: string[]
	onAddType: () => void
	onAddItem: (typeId: string) => void
	onEditItem: (row: AssetRow | LiabilityRow) => void
	t: (key: string, vars?: Record<string, string>) => string
}) {
	const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
	const catalog = kind === "assets" ? ASSET_TYPE_IDS : LIABILITY_TYPE_IDS
	const activeTypeIds = catalog.filter((id) => addedTypeIds.includes(id))

	const expansion = useTableRowExpansion<ValueGroupRowData>({
		expandedKeys,
		onToggle: (key) =>
			setExpandedKeys((prev) => {
				const next = new Set(prev)
				if (next.has(key)) next.delete(key)
				else next.add(key)
				return next
			}),
		getRowKey: (item) => item.id,
		getIsItemExpandable: (item) => item.id !== ADD_ROW_ID,
		renderExpanded: (item) => {
			const typeId = item.typeId!
			const entries = (plan[kind] as Array<AssetRow | LiabilityRow>).filter((r) => r.typeId === typeId)
			return (
				<Stack className="row-detail" gap={1.5}>
					{entries.length > 0 ? (
						<Table
							data={entries as ValueEntryItem[]}
							idKey="id"
							density="compact"
							dividers="rows"
							hasHover
							columns={[
								{
									key: "label",
									header: t("row.label"),
									width: proportional(1),
									renderCell: (entry) => (
										<PlainButton className="row-add" onClick={() => onEditItem(entry)}>
											{entry.label}
										</PlainButton>
									),
								},
								{
									key: "value",
									header: t("table.value"),
									width: pixel(140),
									align: "end",
									renderCell: (entry) => <Text hasTabularNumbers>{formatBaht(entry.value)}</Text>,
								},
							]}
						/>
					) : (
						<Text color="secondary">{t("group.empty")}</Text>
					)}
					<PlainButton className="row-add" onClick={() => onAddItem(typeId)}>
						+ {t("group.addItem", { label: t(`type.${typeId}`) })}
					</PlainButton>
				</Stack>
			)
		},
	})

	const rows: ValueGroupRowData[] = activeTypeIds.map((typeId) => {
		const entries = (plan[kind] as Array<AssetRow | LiabilityRow>).filter((r) => r.typeId === typeId)
		const total = entries.reduce((acc, r) => acc + r.value, 0)
		return {
			id: typeId,
			typeId,
			total,
		}
	})

	const addMarker: ValueGroupRowData = {
		id: ADD_ROW_ID,
	}

	const data: ValueGroupRowData[] = [...rows, addMarker]

	const columns: TableColumn<ValueGroupRowData>[] = [
		{
			key: "name",
			header: t("row.label"),
			width: proportional(1),
			renderCell: (row) =>
				row.id === ADD_ROW_ID ? (
					<PlainButton className="row-add" onClick={onAddType}>
						+ {t("row.addType")}
					</PlainButton>
				) : (
					<Text weight="semibold">{t(`type.${row.typeId}`)}</Text>
				),
		},
		{
			key: "total",
			header: t("table.total"),
			width: pixel(140),
			align: "end",
			renderCell: (row) =>
				row.id === ADD_ROW_ID ? null : (
					<Text hasTabularNumbers>{formatBaht(row.total ?? 0)}</Text>
				),
		},
	]

	return (
		<Table
			data={data}
			idKey="id"
			density="compact"
			dividers="rows"
			hasHover
			columns={columns}
			plugins={{ expansion }}
		/>
	)
}

interface MilestoneRowData extends Record<string, unknown> {
	id: string
	label: string
	year?: number
	month?: number
}

export function MilestoneTable({
	plan,
	onAdd,
	onEdit,
	t,
}: {
	plan: PlanInput
	onAdd: () => void
	onEdit: (id: string) => void
	t: (key: string, vars?: Record<string, string>) => string
}) {
	const { locale } = useLocale()
	const monthNames = locale === "th" ? MONTHS_TH : MONTHS_EN

	const addMarker: MilestoneRowData = {
		id: ADD_ROW_ID,
		label: "",
	}

	const data: MilestoneRowData[] = [
		...plan.milestones.map((m) => ({
			id: m.id,
			label: m.label,
			year: m.year,
			month: m.month,
		})),
		addMarker,
	]

	const columns: TableColumn<MilestoneRowData>[] = [
		{
			key: "name",
			header: t("row.label"),
			width: proportional(1),
			renderCell: (row) =>
				row.id === ADD_ROW_ID ? (
					<PlainButton className="row-add" onClick={onAdd}>
						+ {t("milestone.add")}
					</PlainButton>
				) : (
					<PlainButton className="row-add" onClick={() => onEdit(row.id)}>
						{row.label}
					</PlainButton>
				),
		},
		{
			key: "month",
			header: t("table.month"),
			width: pixel(140),
			align: "end",
			renderCell: (row) =>
				row.id === ADD_ROW_ID ? null : (
					<Text color="secondary" hasTabularNumbers>
						{monthNames[row.month ?? 0]} {row.year}
					</Text>
				),
		},
	]

	return <Table data={data} idKey="id" density="compact" dividers="rows" hasHover columns={columns} />
}
