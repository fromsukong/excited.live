import { useState, type ComponentType, type ReactNode, type SVGProps } from 'react'
import { Badge } from '@astryxdesign/core/Badge'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { IconButton } from '@astryxdesign/core/IconButton'
import { Theme } from '@astryxdesign/core/theme'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>
type Period = '1M' | '3M' | 'YTD' | '1Y' | '2Y'
type Metric = 'Net worth' | 'Cash flow'

interface FinancialMetric {
  label: string
  value: string
}

interface PlanAction {
  label: string
  description: string
  Icon: IconComponent
}

const periods: Period[] = ['1M', '3M', 'YTD', '1Y', '2Y']

const financialMetrics: FinancialMetric[] = [
  { label: 'Net Worth', value: 'THB 178,619,297' },
  { label: 'Change in Net Worth', value: 'THB 10,251,288' },
  { label: 'Liquid Net Worth', value: 'THB 171,565,977' },
  { label: 'Withdrawals', value: 'THB 755,985' },
  { label: 'Withdrawal Rate', value: '0.47%' },
  { label: 'Income', value: 'THB 737,645' },
  { label: 'Taxable Income', value: 'THB 737,645' },
  { label: 'Taxes', value: 'THB 198,049' },
  { label: 'Effective Tax Rate', value: '15.00%' },
  { label: 'Spending', value: 'THB 646,632' },
  { label: 'Expenses', value: 'THB 682,225' },
  { label: 'Savings Rate', value: '0.00%' },
  { label: 'Tax Balance', value: 'THB 36,893' },
]

const planActions: PlanAction[] = [
  { label: 'Update plan', description: 'Refresh assumptions and projections', Icon: SettingsIcon },
  { label: 'Add income', description: 'Record a new source of cash flow', Icon: ChartIcon },
  { label: 'Review spending', description: 'Reconcile your latest expenses', Icon: CalendarIcon },
  { label: 'Update tax details', description: 'Check taxable income and balance', Icon: PresentationIcon },
  { label: 'Adjust savings goal', description: 'Change the next milestone', Icon: CompassIcon },
  { label: 'Manage accounts', description: 'Connect or edit linked accounts', Icon: LinkIcon },
]

function SvgIcon({
  children,
  ...props
}: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  )
}

function FeyMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M16.74 2.76c1.46 1.46 1.46 3.82 0 5.28l-6.9 6.9-2.32-2.32 6.9-6.9a3.73 3.73 0 0 1 2.32-1.09Z" />
      <path d="M17.38 8.88c1.18 1.18 1.18 3.1 0 4.28l-5.82 5.82-2.32-2.32 5.82-5.82a3.02 3.02 0 0 1 2.32-1.96Z" />
      <path d="M14.34 15.62c.92.92.92 2.41 0 3.33l-2.29 2.29-2.32-2.32 2.29-2.29c.64-.64 1.68-.99 2.32-1.01Z" />
    </svg>
  )
}

function MoonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M20.4 15.1A8.2 8.2 0 0 1 8.9 3.6 8.2 8.2 0 1 0 20.4 15.1Z" />
    </SvgIcon>
  )
}

function SunIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="3.4" />
      <path d="M12 2.4v2M12 19.6v2M21.6 12h-2M4.4 12h-2M18.79 5.21l-1.42 1.42M6.63 17.37l-1.42 1.42M18.79 18.79l-1.42-1.42M6.63 6.63 5.21 5.21" />
    </SvgIcon>
  )
}

function LinkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="m9.5 14.5 5-5" />
      <path d="M7.3 17.1H6a3.5 3.5 0 0 1 0-7h3.2M16.7 6.9H18a3.5 3.5 0 0 1 0 7h-3.2" />
    </SvgIcon>
  )
}

function CompassIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="8.2" />
      <path d="m15.6 8.4-1.9 5.3-5.3 1.9 1.9-5.3 5.3-1.9Z" />
    </SvgIcon>
  )
}

function CalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <rect x="4" y="5.5" width="16" height="14" rx="1.8" />
      <path d="M8 3.5v4M16 3.5v4M4 9.5h16M8.1 13h.01M12 13h.01M15.9 13h.01M8.1 16.4h.01M12 16.4h.01" />
    </SvgIcon>
  )
}

function BookmarkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M6.5 4.2c0-.66.54-1.2 1.2-1.2h8.6c.66 0 1.2.54 1.2 1.2v16l-5.5-3.5-5.5 3.5v-16Z" />
    </SvgIcon>
  )
}

function ChartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M4 19.5V4.5M4 19.5h16" />
      <path d="m7 15 3-3 2.2 1.7 4.8-6.2" />
    </SvgIcon>
  )
}

function PresentationIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <rect x="4" y="4" width="16" height="11.5" rx="1.6" />
      <path d="M12 15.5v4M8.5 19.5h7M8 8.2h8M12 8.2v4.1M9.8 12.3h4.4" />
    </SvgIcon>
  )
}

function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="2.5" />
      <path d="m19.1 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1A1.7 1.7 0 0 1 5 15l.1-.1a1.7 1.7 0 0 0-1.2-2.9h-.2a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9L5 5.6A1.7 1.7 0 0 1 7.4 3.2l.1.1a1.7 1.7 0 0 0 2.9-1.2v-.2a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 0 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z" />
    </SvgIcon>
  )
}

function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M4 12h15M13.5 6.5 19 12l-5.5 5.5" />
    </SvgIcon>
  )
}

function FinancialMetricRow({
  metric,
  isSelected,
  onSelect,
}: {
  metric: FinancialMetric
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      className={`financial-row ${isSelected ? 'is-selected' : ''}`}
      type="button"
      aria-pressed={isSelected}
      onClick={onSelect}
    >
      <span className="financial-row__label">{metric.label}</span>
      <span className="financial-row__value">{metric.value}</span>
    </button>
  )
}

function PlanActionRow({
  action,
  isSelected,
  onSelect,
}: {
  action: PlanAction
  isSelected: boolean
  onSelect: () => void
}) {
  const ActionIcon = action.Icon

  return (
    <button
      className={`plan-action ${isSelected ? 'is-selected' : ''}`}
      type="button"
      aria-pressed={isSelected}
      onClick={onSelect}
    >
      <span className="plan-action__icon"><ActionIcon aria-hidden="true" width={18} height={18} /></span>
      <span className="plan-action__copy">
        <span className="plan-action__label">{action.label}</span>
        <span className="plan-action__description">{action.description}</span>
      </span>
      <span className="plan-action__arrow" aria-hidden="true"><ArrowRightIcon width={17} height={17} /></span>
    </button>
  )
}

function MarketChart({ metric }: { metric: Metric }) {
  return (
    <div className="chart-canvas">
      <svg className="market-chart" viewBox="0 0 720 340" preserveAspectRatio="none" role="img" aria-label={`${metric} performance chart`}>
        <line className="chart-guide chart-guide--top" x1="0" y1="70" x2="720" y2="70" />
        <line className="chart-guide chart-guide--middle" x1="0" y1="250" x2="720" y2="250" />
        <line className="chart-guide chart-guide--bottom" x1="0" y1="294" x2="720" y2="294" />
        <path
          className="chart-line chart-line--main"
          d="M0 212 L8 208 L13 214 L19 202 L25 207 L31 198 L38 205 L44 190 L50 183 L56 193 L62 185 L68 188 L75 185 L82 197 L88 204 L95 235 L101 246 L108 233 L114 239 L121 218 L128 207 L134 210 L141 194 L148 202 L155 181 L161 174 L168 180 L175 164 L182 168 L189 155 L196 162 L203 149 L210 142 L217 130 L224 132 L231 118 L238 125 L245 111 L252 116 L259 109 L266 133 L273 146 L280 195 L287 184 L294 131 L301 124 L308 130 L315 111 L322 118 L329 108 L336 125 L343 104 L350 97 L357 109 L364 102 L371 91 L378 95 L385 84 L392 89 L399 74 L406 79 L413 68 L420 78 L427 64 L434 54 L441 60 L448 48 L455 54 L462 45 L469 48 L476 43 L483 49 L490 46 L497 31 L504 40 L511 60 L518 65 L525 50 L532 74 L539 67 L546 94 L553 82 L560 69 L567 86 L574 97 L581 91 L588 102 L595 86 L602 79 L609 62 L616 58 L623 40 L630 42 L637 28 L644 44 L651 31 L658 35 L665 45 L672 41 L679 34 L686 42 L693 20 L700 46 L707 34 L714 39 L720 30"
        />
        <path
          className="chart-line chart-line--secondary"
          d="M0 289 L12 286 L24 290 L36 286 L48 288 L60 285 L72 287 L84 284 L96 287 L108 278 L120 283 L132 280 L144 285 L156 285 L168 284 L180 285 L192 281 L204 285 L216 284 L228 285 L240 285 L252 283 L264 284 L276 280 L288 282 L300 281 L312 279 L324 283 L336 280 L348 281 L360 279 L372 277 L384 279 L396 275 L408 280 L420 276 L432 275 L444 281 L456 273 L468 277 L480 271 L492 276 L504 272 L516 279 L528 275 L540 278 L552 269 L564 279 L576 277 L588 274 L600 276 L612 273 L624 277 L636 272 L648 275 L660 274 L672 267 L684 277 L696 273 L708 276 L720 274"
        />
      </svg>
      <span className="chart-value chart-value--top">{metric === 'Net worth' ? '+6.10%' : '+3.42%'}</span>
      <span className="chart-value chart-value--bottom">{metric === 'Net worth' ? 'THB 178.6M' : 'THB 737.6K'}</span>
    </div>
  )
}

function Home() {
  const [period, setPeriod] = useState<Period>('1Y')
  const [metric, setMetric] = useState<Metric>('Net worth')
  const [selectedMetric, setSelectedMetric] = useState('Taxable Income')
  const [accountsConnected, setAccountsConnected] = useState(false)
  const [selectedAction, setSelectedAction] = useState('Update plan')
  const [planUpdated, setPlanUpdated] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true)

  const selectAction = (label: string) => {
    setSelectedAction(label)
    setPlanUpdated(false)
  }

  return (
    <Theme theme={neutralTheme} mode={isDarkMode ? 'dark' : 'light'}>
      <div className="dashboard-shell">
        <header className="topbar">
          <div className="brand-lockup">
            <span className="brand-lockup__mark"><FeyMark size={23} /></span>
            <span>Hello, Sam</span>
          </div>
          <div className="market-status">
            <span>Your plan is synced</span>
            <IconButton
              label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              icon={isDarkMode ? <MoonIcon /> : <SunIcon />}
              variant="ghost"
              size="sm"
              className="theme-button"
              onClick={() => setIsDarkMode((current) => !current)}
            />
          </div>
        </header>

        <main className="dashboard-main">
          <div className="dashboard-grid">
            <Card className="chart-panel" variant="transparent" padding={0}>
              <div className="chart-panel__inner">
                <div className="panel-heading">
                  <span className="panel-heading__date">Plan snapshot · Tuesday, February 25</span>
                  <h1>Your plan is <span>on track</span></h1>
                </div>

                <MarketChart metric={metric} />

                <div className="chart-toolbar">
                  <div className="metric-switch" role="group" aria-label="Chart metric">
                    <button
                      className={`metric-switch__item ${metric === 'Net worth' ? 'is-active' : ''}`}
                      type="button"
                      onClick={() => setMetric('Net worth')}
                    >
                      <span className="metric-indicator metric-indicator--white" aria-hidden="true" />
                      Net worth
                    </button>
                    <button
                      className={`metric-switch__item ${metric === 'Cash flow' ? 'is-active' : ''}`}
                      type="button"
                      onClick={() => setMetric('Cash flow')}
                    >
                      <span className="metric-indicator metric-indicator--purple" aria-hidden="true" />
                      Cash flow
                    </button>
                  </div>
                  <Button
                    label={accountsConnected ? 'Accounts connected' : 'Connect accounts'}
                    variant="ghost"
                    size="sm"
                    icon={<LinkIcon />}
                    className={`portfolio-button ${accountsConnected ? 'is-connected' : ''}`}
                    onClick={() => setAccountsConnected((current) => !current)}
                  />
                  <div className="period-switch" role="group" aria-label="Chart period">
                    {periods.map((item) => (
                      <button
                        className={`period-switch__item ${period === item ? 'is-active' : ''}`}
                        type="button"
                        key={item}
                        aria-pressed={period === item}
                        onClick={() => setPeriod(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="financial-list" aria-label="Financial snapshot">
                  {financialMetrics.map((item) => (
                    <FinancialMetricRow
                      key={item.label}
                      metric={item}
                      isSelected={selectedMetric === item.label}
                      onSelect={() => setSelectedMetric(item.label)}
                    />
                  ))}
                </div>
              </div>
            </Card>

            <section className="plan-column" aria-label="Plan actions">
              <Card className="plan-summary-card" variant="transparent" padding={0}>
                <div className="plan-summary-card__inner">
                  <div className="plan-summary-card__meta">
                    <Badge label={planUpdated ? 'Plan updated' : 'Plan actions'} variant="neutral" icon={<FeyMark size={14} />} className="plan-badge" />
                    <span className="plan-summary-card__timestamp">{planUpdated ? 'Saved just now' : 'Last synced today'}</span>
                  </div>
                  <div className="plan-summary-card__body">
                    <h2>Keep your plan current</h2>
                    <p>Update the details behind your forecast, reconcile new activity, and keep every number ready for your next decision.</p>
                  </div>
                  <div className="plan-summary-card__footer">
                    <Button
                      label={planUpdated ? 'Plan updated' : 'Update plan'}
                      variant="primary"
                      size="md"
                      icon={<SettingsIcon />}
                      className="plan-primary-button"
                      onClick={() => {
                        setSelectedAction('Update plan')
                        setPlanUpdated(true)
                      }}
                    />
                    <span>{selectedAction} selected</span>
                  </div>
                </div>
              </Card>

              <Card className="actions-card" variant="transparent" padding={0}>
                <div className="actions-card__inner">
                  <div className="actions-card__heading">
                    <div>
                      <span className="actions-card__eyebrow">Quick actions</span>
                      <h2>What would you like to update?</h2>
                    </div>
                    <span className="actions-card__count">6 tools</span>
                  </div>
                  <div className="plan-actions-list">
                    {planActions.map((action) => (
                      <PlanActionRow
                        key={action.label}
                        action={action}
                        isSelected={selectedAction === action.label}
                        onSelect={() => selectAction(action.label)}
                      />
                    ))}
                  </div>
                  <button className="export-action" type="button" onClick={() => selectAction('Export snapshot')}>
                    <span className="export-action__icon"><BookmarkIcon aria-hidden="true" width={17} height={17} /></span>
                    <span>Export plan snapshot</span>
                    <ArrowRightIcon aria-hidden="true" width={17} height={17} />
                  </button>
                </div>
              </Card>
            </section>
          </div>
        </main>

      </div>
    </Theme>
  )
}
