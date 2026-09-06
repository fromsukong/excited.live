/**
 * ProjectionChart — the one custom visual on the dashboard (a line chart is
 * the single thing Astryx has no primitive for). Pure SVG via design-system
 * primitives. Supports two metrics (net worth / cash flow); hover, drag and
 * keyboard focus inspect a year. Unmet-spend years get a warning marker.
 */
import { useMemo, useState } from "react"
import {
	Svg,
	SvgCircle,
	SvgDefs,
	SvgGradientStop,
	SvgLine,
	SvgPath,
	Stack,
	Text,
} from "@excited-live/design-system"
import type { SimulationYear } from "../lib/plan-service"
import { formatBaht, formatBahtCompact } from "../lib/format"

const WIDTH = 1000
const HEIGHT = 320
const PAD = { top: 16, right: 16, bottom: 28, left: 64 }

export interface ProjectionChartProps {
	/** Projected years to draw (already sliced to the active period). */
	years: SimulationYear[]
	/** Which series to draw: end-of-year net worth or yearly cash flow. */
	metric?: "netWorth" | "cashFlow"
	ariaLabel: string
}

export function ProjectionChart({
	years,
	metric = "netWorth",
	ariaLabel,
}: ProjectionChartProps) {
	const [activeIndex, setActiveIndex] = useState<number | null>(null)

	const valueOf = (year: SimulationYear) =>
		metric === "netWorth" ? year.netWorth : year.netCash

	const { points, min, max } = useMemo(() => {
		const values = years.map(valueOf)
		const rawMax = Math.max(...values, 0)
		const rawMin = Math.min(...values, 0)
		const span = rawMax - rawMin || 1
		const innerW = WIDTH - PAD.left - PAD.right
		const innerH = HEIGHT - PAD.top - PAD.bottom
		const xFor = (index: number) =>
			years.length === 1 ? PAD.left + innerW / 2 : PAD.left + (index / (years.length - 1)) * innerW
		const yFor = (value: number) => PAD.top + (1 - (value - rawMin) / span) * innerH
		return {
			points: years.map((year, index) => ({
				year: year.year,
				x: xFor(index),
				y: yFor(valueOf(year)),
				value: valueOf(year),
				unmet: year.unmet,
			})),
			min: rawMin,
			max: rawMax,
		}
		// valueOf is a stable pure function of the metric prop.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [years, metric])

	const linePath = points
		.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
		.join(" ")
	const areaPath = `${linePath} L${(points.at(-1)?.x ?? PAD.left).toFixed(1)} ${HEIGHT - PAD.bottom} L${PAD.left} ${HEIGHT - PAD.bottom} Z`

	const zeroY =
		min < 0 ? PAD.top + (1 - (0 - min) / (max - min || 1)) * (HEIGHT - PAD.top - PAD.bottom) : null
	const active = activeIndex === null ? points.at(-1) : points[activeIndex]

	/** Map a pointer x back to the nearest year (hover, drag, click). */
	function handlePointer(clientX: number, target: Element) {
		const bounds = target.getBoundingClientRect()
		if (bounds.width === 0) return
		const fraction = (clientX - bounds.left) / bounds.width
		const index = Math.round(fraction * (points.length - 1))
		setActiveIndex(Math.min(Math.max(index, 0), points.length - 1))
	}

	const gridLines = [0, 0.25, 0.5, 0.75, 1].map((fraction) => {
		const value = max - fraction * (max - min)
		const y = PAD.top + fraction * (HEIGHT - PAD.top - PAD.bottom)
		return { value, y }
	})

	return (
		<Stack gap={1}>
			{active ? (
				<Text size="sm" color="secondary">
					{active.year} · {formatBaht(active.value)}
					{active.unmet ? " · ⚠" : ""}
				</Text>
			) : null}
			<Svg
				viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
				role="img"
				aria-label={ariaLabel}
				className="mvp-chart"
				style={{ width: "100%", height: "auto", display: "block", touchAction: "none" }}
				onPointerMove={(event) => handlePointer(event.clientX, event.currentTarget)}
				onPointerLeave={() => setActiveIndex(null)}
				onPointerDown={(event) => handlePointer(event.clientX, event.currentTarget)}
			>
				<SvgDefs>
					<linearGradient id="mvp-area" x1="0" y1="0" x2="0" y2="1">
						<SvgGradientStop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.28" />
						<SvgGradientStop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.02" />
					</linearGradient>
				</SvgDefs>
				{gridLines.map((grid) => (
					<SvgLine
						key={grid.y}
						x1={PAD.left}
						x2={WIDTH - PAD.right}
						y1={grid.y}
						y2={grid.y}
						stroke="var(--color-border)"
						strokeWidth="1"
					/>
				))}
				{gridLines.map((grid) => (
					<text
						key={`label-${grid.y}`}
						x={PAD.left - 8}
						y={grid.y + 4}
						textAnchor="end"
						fontSize="12"
						fill="var(--color-text-secondary)"
					>
						{formatBahtCompact(grid.value)}
					</text>
				))}
				{zeroY !== null ? (
					<SvgLine
						x1={PAD.left}
						x2={WIDTH - PAD.right}
						y1={zeroY}
						y2={zeroY}
						stroke="var(--color-text-orange)"
						strokeWidth="1"
						strokeDasharray="4 4"
					/>
				) : null}
				<SvgPath d={areaPath} fill="url(#mvp-area)" />
				<SvgPath
					d={linePath}
					fill="none"
					stroke="var(--color-accent)"
					strokeWidth="2.5"
					strokeLinejoin="round"
				/>
				{active ? (
					<SvgCircle cx={active.x} cy={active.y} r="5" fill="var(--color-accent)" />
				) : null}
				{points
					.filter((_, index) => index % 10 === 0 || index === points.length - 1)
					.map((point) => (
						<text
							key={`x-${point.year}`}
							x={point.x}
							y={HEIGHT - 8}
							textAnchor="middle"
							fontSize="12"
							fill="var(--color-text-secondary)"
						>
							{point.year}
						</text>
					))}
			</Svg>
		</Stack>
	)
}
