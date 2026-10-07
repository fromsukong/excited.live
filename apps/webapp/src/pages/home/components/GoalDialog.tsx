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
	Selector,
	TextInput,
} from "@excited-live/design-system"
import { type GoalRow, type PlanInput } from "../../../lib/plan-service"

/** Wallets a goal may be funded from (engine truth: sim GoalRow["wallet"]). */
const GOAL_WALLETS: GoalRow["wallet"][] = ["goal", "nontax", "taxAdvantaged"]

export interface GoalDialogProps {
	/** null = add a new goal; otherwise the id being edited. */
	id: string | null
	plan: PlanInput
	onSave: (values: Omit<GoalRow, "id">) => void
	onRemove: (id: string) => void
	onClose: () => void
	t: (key: string, vars?: Record<string, string>) => string
}

/**
 * US-101 AC#2 — add/edit/remove one goal row. Mirrors the wizard's goals step
 * (label, cost in today's money, target year) and adds the wallet the engine
 * actually funds it from.
 */
export function GoalDialog({
	id,
	plan,
	onSave,
	onRemove,
	onClose,
	t,
}: GoalDialogProps) {
	const existing = id !== null ? plan.goals.find((goal) => goal.id === id) : null
	const currentYear = new Date().getFullYear()
	const [label, setLabel] = useState(existing?.label ?? "")
	const [amountToday, setAmountToday] = useState(existing?.amountToday ?? 1_000_000)
	const [targetYear, setTargetYear] = useState(
		existing?.targetYear ?? currentYear + 5,
	)
	const [wallet, setWallet] = useState<GoalRow["wallet"]>(
		existing?.wallet ?? "goal",
	)

	const title = id === null ? t("goal.add") : t("goal.edit")

	return (
		<Dialog
			isOpen
			onOpenChange={(open) => {
				if (!open) onClose()
			}}
			purpose="form"
			width={560}
		>
			<Layout
				defaultHasDividers
				header={
					<DialogHeader
						title={title}
						hasDivider
						onOpenChange={() => onClose()}
					/>
				}
				content={
					<LayoutContent>
						<Grid columns={{ minWidth: 220, max: 2 }} gap={1.5}>
							<TextInput
								label={t("row.label")}
								value={label}
								onChange={setLabel}
								placeholder={t("wizard.goals.labelPlaceholder")}
							/>
							<NumberInput
								label={t("wizard.goals.amount")}
								value={amountToday}
								onChange={(amount) => setAmountToday(amount ?? 0)}
								min={0}
								step={10_000}
								units="฿"
							/>
							<NumberInput
								label={t("wizard.goals.targetYear")}
								value={targetYear}
								onChange={(year) => setTargetYear(year ?? currentYear)}
								min={currentYear}
								max={currentYear + 60}
								step={1}
								isIntegerOnly
							/>
							<Selector
								label={t("goal.wallet")}
								value={wallet}
								onChange={(value) => setWallet(value as GoalRow["wallet"])}
								options={GOAL_WALLETS.map((walletId) => ({
									value: walletId,
									label: t(`wallet.${walletId}`),
								}))}
							/>
						</Grid>
					</LayoutContent>
				}
				footer={
					<LayoutFooter hasDivider>
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
								onClick={() =>
									onSave({
										label: label.trim() || t("tab.goals"),
										amountToday,
										targetYear,
										wallet,
									})
								}
							/>
						</HStack>
					</LayoutFooter>
				}
			/>
		</Dialog>
	)
}
