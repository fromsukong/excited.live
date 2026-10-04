import { Button, Card, Heading, Stack, Text } from "@excited-live/design-system"

export interface PageEmptyStateProps {
	title: string
	description: string
	actionLabel: string
	onAction: () => void
}

export function PageEmptyState({
	title,
	description,
	actionLabel,
	onAction,
}: PageEmptyStateProps) {
	return (
		<Card variant="transparent" padding={4} className="chart-panel__inner">
			<Stack gap={3} vAlign="center" hAlign="center" className="page-empty-state">
				<Stack gap={1} hAlign="center">
					<Heading level={3}>{title}</Heading>
					<Text color="secondary">{description}</Text>
				</Stack>
				<Button
					variant="primary"
					label={actionLabel}
					onClick={onAction}
				/>
			</Stack>
		</Card>
	)
}
