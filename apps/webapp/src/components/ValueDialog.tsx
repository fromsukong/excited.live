import { useState } from "react"
import {
	Button,
	Dialog,
	DialogHeader,
	HStack,
	Layout,
	LayoutContent,
	LayoutFooter,
	NumberInput,
	PlainButton,
	Stack,
	TextInput,
} from "@excited-live/design-system"
import {
	type AssetRow,
	type LiabilityRow,
	type PlanInput,
} from "../lib/plan-service"

export type ValueDialogDescriptor =
	| { mode: "add"; kind: "assets" | "liabilities"; typeId: string }
	| { mode: "edit"; kind: "assets" | "liabilities"; rowId: string }

export interface ValueDialogProps {
	dialog: ValueDialogDescriptor
	plan: PlanInput
	onSave: (values: { label: string; value: number }) => void
	onRemove: (id: string) => void
	onClose: () => void
	t: (key: string, vars?: Record<string, string>) => string
}

export function ValueDialog({
	dialog,
	plan,
	onSave,
	onRemove,
	onClose,
	t,
}: ValueDialogProps) {
	const existingRow =
		dialog.mode === "edit"
			? (plan[dialog.kind] as Array<AssetRow | LiabilityRow>).find(
					(r) => r.id === dialog.rowId,
				)
			: null
	const typeId =
		dialog.mode === "edit"
			? (existingRow?.typeId ??
				(dialog.kind === "assets" ? "stock" : "debt"))
			: dialog.typeId
	const typeLabel = t(`type.${typeId}`)
	const [label, setLabel] = useState(
		dialog.mode === "edit" ? (existingRow?.label ?? "") : typeLabel,
	)
	const [value, setValue] = useState(
		dialog.mode === "edit" ? (existingRow?.value ?? 0) : 0,
	)

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
