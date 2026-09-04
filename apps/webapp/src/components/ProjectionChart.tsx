/**
 * ProjectionChart — interactive net-worth projection line.
 *
 * Hover/drag/keyboard-focus a year to inspect it: `onActiveYearChange` fires
 * with the year under the pointer so panels below the chart can react.
 * Pure SVG (via design-system primitives), no chart library.
 */
import { useMemo } from "react"
import { Svg, SvgCircle, SvgLine, SvgPath } from "@excited-live/design-system"

export interface ProjectionChartProps {
	/** One point per projected year, ascending. */
	years: { year: number; netWorth: number }[]
	/** Currently inspected year (null = none hovered → show latest). */
	activeYear: number | null
	onActiveYearChange: (year: number | null) => void
	/** Optional horizontal goal line. */
	goalNetWorth?: number | null
	ariaLabel: string
}

const WIDTH = 1000
const HEIGHT = 300
const PAD_TOP = 14
const PAD_BOTTOM = 8

export function ProjectionChart({
	years,
	activeYear,
	onActiveYearChange,
	goalNetWorth,
	ariaLabel,
}: ProjectionChartProps) {
	const { points, min, max } = useMemo(() => {
		const values = years.map((point) => point.netWorth)
		const rawMax = Math.max(...values, goalNetWorth ?? 0)
		const rawMin = Math.min(...values, 0)
		const span = rawMax - rawMin || 1
		const yFor = (value: number) =>
			PAD_TOP + (1 - (value - rawMin) / span) * (HEIGHT - PAD_TOP - PAD_BOTTOM)
		return {
			points: years.map((point, index) => ({
				year: point.year,
				x: years.length === 1 ? WIDTH / 2 : (index / (years.length - 1)) * WIDTH,
				y: yFor(point.netWorth),
				value: point.netWorth,
			})),
			min: rawMin,
			max: rawMax,
		}
	}, [years, goalNetWorth])

	const linePath = points
		.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
		.join(" ")
	const areaPath = `${linePath} L${WIDTH} ${HEIGHT} L0 ${HEIGHT} Z`

	const goalY =
		goalNetWorth != null && goalNetWorth > min && goalNetWorth <= max
			? PAD_TOP + (1 - (goalNetWorth - min) / (max - min)) * (HEIGHT - PAD_TOP - PAD_BOTTOM)
			: null

	const activePoint =
		points.find((point) => point.year === activeYear) ?? points.at(-1) ?? null

	/** Map a pointer x position back to the nearest projected year. */
	function handlePointer(clientX: number, currentTarget: Element) {
		const bounds = currentTarget.getBoundingClientRect()
		const fraction = bounds.width === 0 ? 0 : (clientX - bounds.left) / bounds.width
		const index = Math.round(fraction * (points.length - 1))
		const clamped = Math.min(Math.max(index, 0), points.length - 1)
		onActiveYearChange(points[clamped]?.year ?? null)
	}

	function handleKeyDown(event: React.KeyboardEvent<SVGSVGElement>) {
		const currentIndex = activeYear == null
			? points.length - 1
			: points.findIndex((point) => point.year === activeYear)
		let next: number
		if (event.key === "ArrowLeft") next = Math.max(0, currentIndex - 1)
		else if (event.key === "ArrowRight") next = Math.min(points.length - 1, currentIndex + 1)
		else if (event.key === "Home") next = 0
		else if (event.key === "End") next = points.length - 1
		else return
		event.preventDefault()
		onActiveYearChange(points[next]?.year ?? null)
	}

	return (
		<Svg
			viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
			preserveAspectRatio="none"
			className="chart-svg"
			role="img"
			aria-label={ariaLabel}
			tabIndex={0}
			onPointerMove={(event) => handlePointer(event.clientX, event.currentTarget)}
			onPointerDown={(event) => handlePointer(event.clientX, event.currentTarget)}
			onPointerLeave={() => onActiveYearChange(null)}
			onKeyDown={handleKeyDown}
			onBlur={() => onActiveYearChange(null)}
		>
			<defs>
				<linearGradient id="chart-area-fill" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.25" />
					<stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
				</linearGradient>
			</defs>
			<SvgPath className="chart-guide" d={`M0 ${PAD_TOP}H${WIDTH}`} />
			<SvgPath className="chart-guide" d={`M0 ${HEIGHT / 2}H${WIDTH}`} />
			{goalY != null ? (
				<SvgPath className="chart-guide chart-guide--goal" d={`M0 ${goalY}H${WIDTH}`} />
			) : null}
			<SvgPath className="chart-area" d={areaPath} fill="url(#chart-area-fill)" stroke="none" />
			<SvgPath
				className="chart-line"
				d={linePath}
				fill="none"
				vectorEffect="non-scaling-stroke"
			/>
			{activePoint ? (
				<g>
					<SvgLine
						className="chart-cursor"
						x1={activePoint.x}
						x2={activePoint.x}
						y1={PAD_TOP}
						y2={HEIGHT}
						vectorEffect="non-scaling-stroke"
					/>
					<SvgCircle
						className="chart-marker"
						cx={activePoint.x}
						cy={activePoint.y}
						r={5}
						vectorEffect="non-scaling-stroke"
					/>
				</g>
			) : null}
			{/**
			 * Value labels are rendered outside the SVG (HTML overlays in the
			 * parent) so they keep real text sizing; the SVG uses a stretched
			 * viewBox that would distort SVG text.
			 */}
		</Svg>
	)
}
