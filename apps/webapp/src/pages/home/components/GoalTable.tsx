import {
	PlainButton,
	Stack,
	Table,
	Text,
	pixel,
	proportional,
	type TableColumn,
} from "@excited-live/design-system"
import { formatBaht } from "../../../lib/format"
import { type GoalCheck, type GoalRow } from "../../../lib/plan-service"
import { ADD_ROW_ID } from "./EntryTable"

interface GoalRowData extends Record<string, unknown> {
	id: string
	label: string
	/** Today's-money target, formatted for the amount column. */
	amount: string
	targetYear: number | null
	/** Projection feedback for this goal ("" = verdict unavailable). */
	status: string
}

export interface GoalTableProps {
	goals: GoalRow[]
	/**
	 * goalChecks() from the plan summary — same order as `goals`. Null while
	 * the projection is unavailable (the list still edits; the verdict waits).
	 */
	checks: GoalCheck[] | null
	onAdd: () => void
	onEdit: (id: string) => void
	t: (key: string, vars?: Record<string, string>) => string
}

/**
 * US-101 AC#2 — the goals the wizard collected stay editable here: tap a row
 * to edit or remove it, or the last line to add one. The status line is the
 * projection's own answer (goalChecks) to "will this goal be funded?", so a
 * goal edit is visible in the numbers, not just in the list.
 */
export function GoalTable({ goals, checks, onAdd, onEdit, t }: GoalTableProps) {
	const checkById = new Map(
		(checks ?? []).map((check) => [check.goal.id, check]),
	)

	const data: GoalRowData[] = [
		...goals.map((goal) => {
			const check = checkById.get(goal.id)
			return {
				id: goal.id,
				label: goal.label,
				amount: formatBaht(goal.amountToday),
				targetYear: goal.targetYear,
				status: check
					? check.onTrack
						? t("summary.goal.onTrack")
						: t("summary.goal.short", {
								amount: formatBaht(check.shortBy),
								year: String(goal.targetYear),
							})
					: "",
			}
		}),
		{
			id: ADD_ROW_ID,
			label: "",
			amount: "",
			targetYear: null,
			status: "",
		},
	]

	const columns: TableColumn<GoalRowData>[] = [
		{
			key: "name",
			header: t("row.label"),
			width: proportional(1),
			renderCell: (row) =>
				row.id === ADD_ROW_ID ? (
					<PlainButton className="row-add" onClick={onAdd}>
						+ {t("goal.add")}
					</PlainButton>
				) : (
					<Stack gap={0.5}>
						<PlainButton className="row-add" onClick={() => onEdit(row.id)}>
							{row.label}
						</PlainButton>
						{row.status ? (
							<Text size="sm" color="secondary">
								{row.status}
							</Text>
						) : null}
					</Stack>
				),
		},
		{
			key: "amount",
			header: t("table.rate"),
			width: pixel(120),
			align: "end",
			renderCell: (row) =>
				row.id === ADD_ROW_ID ? null : (
					<Text hasTabularNumbers>{row.amount}</Text>
				),
		},
		{
			key: "year",
			header: t("wizard.goals.targetYear"),
			width: pixel(76),
			align: "end",
			renderCell: (row) =>
				row.id === ADD_ROW_ID ? null : (
					<Text color="secondary" hasTabularNumbers>
						{row.targetYear}
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
			textOverflow="wrap"
			columns={columns}
		/>
	)
}
