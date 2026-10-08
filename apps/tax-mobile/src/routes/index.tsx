import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getTaxSystem, type TaxInput } from '@excited-live/tax'

export const Route = createFileRoute('/')({
	component: IndexComponent,
})

function IndexComponent() {
	const [grossIncome, setGrossIncome] = useState<number>(600000)

	// Demonstration of TanStack Query loading tax engine metadata
	const { data: systemMeta, isLoading } = useQuery({
		queryKey: ['tax-system-meta', 'TH', 2026],
		queryFn: async () => {
			const system = getTaxSystem('TH', 2026)
			return {
				country: system.country,
				taxYear: system.taxYear,
				bracketCount: system.config?.brackets.length ?? 7,
				currency: 'THB',
			}
		},
	})

	const thaiSystem = useMemo(() => getTaxSystem('TH', 2026), [])

	const result = useMemo(() => {
		const input: TaxInput = {
			incomes: [{ categoryCode: 'employment', amount: grossIncome || 0 }],
			allowances: { personal: 1, spouse: 0, children: 0, parents: 0, disabled: 0 },
			deductions: {
				insurance: 0,
				mortgageInterest: 0,
				donations: 0,
				retirementSavings: { ssf: 0, rmf: 0, provident: 0 },
			},
			withheld: 0,
			estimatedPaid: 0,
			filingStatus: 'single',
		}
		return thaiSystem.compute(input)
	}, [thaiSystem, grossIncome])

	return (
		<div>
			<div className="placeholder-badge">
				Setup verification only — this placeholder UI will be replaced.
			</div>

			<div className="setup-card">
				<div className="query-status">
					<span className="dot online" />
					<small>
						{isLoading
							? 'Query loading...'
							: `TanStack Query synced: ${systemMeta?.country} ${systemMeta?.taxYear} (${systemMeta?.bracketCount} brackets)`}
					</small>
				</div>

				<div className="setup-input-group">
					<label htmlFor="income-input">Annual Employment Income (THB)</label>
					<input
						id="income-input"
						type="number"
						inputMode="decimal"
						className="setup-input"
						value={grossIncome || ''}
						placeholder="0"
						onChange={(e) => setGrossIncome(Number(e.target.value) || 0)}
					/>
				</div>

				<div className="metric-grid">
					<div className="metric-box">
						<span className="label">Taxable Income</span>
						<span className="value">
							฿{result.taxableIncome.toLocaleString('en-US')}
						</span>
					</div>
					<div className="metric-box highlight">
						<span className="label">Estimated Net Tax</span>
						<span className="value">
							฿{result.netTax.toLocaleString('en-US')}
						</span>
					</div>
					<div className="metric-box">
						<span className="label">Effective Rate</span>
						<span className="value">
							{(result.effectiveRate * 100).toFixed(1)}%
						</span>
					</div>
					<div className="metric-box">
						<span className="label">Marginal Rate</span>
						<span className="value">
							{(result.marginalRate * 100).toFixed(0)}%
						</span>
					</div>
				</div>
			</div>
		</div>
	)
}
