import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  availableTaxSystems,
  getTaxSystem,
  type BracketBreakdown,
  type TaxCountry,
  type TaxInput,
  type TaxResult,
  type TaxSystem,
} from '@excited-live/tax'
import { Badge } from '@astryxdesign/core/Badge'
import { Banner } from '@astryxdesign/core/Banner'
import { Card } from '@astryxdesign/core/Card'
import { NumberInput } from '@astryxdesign/core/NumberInput'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { Text } from '@astryxdesign/core/Text'
import { Theme } from '@astryxdesign/core/theme'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'
import { LocaleProvider, useLocale, type Locale } from '~/i18n'

export const Route = createFileRoute('/')({
  component: () => (
    <LocaleProvider>
      <TaxPage />
    </LocaleProvider>
  ),
})

/* ------------------------------------------------------------------ */
/* Static copy (EN-first; the engine's labels carry the Thai text).    */
/* ------------------------------------------------------------------ */

const COPY = {
  en: {
    brand: 'excited.live',
    appName: 'Tax',
    heroTitle: 'How much income tax will you pay?',
    heroSubtitle: 'Estimate your individual income tax — live, in your browser.',
    langLabel: 'Language',
    countryLabel: 'Country',
    filingStatusLabel: 'Filing status',
    incomeTitle: 'Income',
    incomeHint: 'Gross amounts per income type. Expense deductions are applied automatically.',
    deductionsTitle: 'Deductions & savings',
    deductionsHint: 'Caps are applied automatically — enter what you actually paid.',
    allowancesTitle: 'Family allowances',
    withheldTitle: 'Tax already paid',
    withheldHint: 'Withheld by the payer or paid in advance.',
    withheld: 'Withheld at source',
    estimatedPaid: 'Paid in advance',
    self: 'You',
    spouse: 'Spouse',
    children: 'Children',
    disabled: 'Disabled dependents',
    people: 'people',
    resultsTitle: 'Your result',
    netTax: 'Net tax',
    refund: 'Refund',
    extraToPay: 'To pay',
    allSettled: 'Fully settled',
    grossIncome: 'Gross income',
    assessableIncome: 'Assessable income',
    expenseDeductions: 'Expense deductions',
    itemizedDeductions: 'Itemized deductions',
    allowancesTotal: 'Allowances',
    taxableIncome: 'Taxable income',
    taxLiability: 'Tax liability',
    credits: 'Credits',
    effectiveRate: 'Effective rate',
    marginalRate: 'Marginal rate',
    bracketsTitle: 'Brackets',
    bracketColumn: 'Bracket',
    taxableColumn: 'Taxable',
    taxColumn: 'Tax',
    rateColumn: 'Rate',
    reset: 'Reset',
    assumptionsTitle: 'Assumptions & simplifications',
    placeholderBanner:
      'This jurisdiction is a structural placeholder — values are stand-ins, not for real use.',
    localeNote: 'Language preference is saved on this device.',
    engineNote: 'Powered by the excited.live tax engine.',
  },
  th: {
    brand: 'excited.live',
    appName: 'ภาษี',
    heroTitle: 'คุณจะจ่ายภาษีเท่าไหร่?',
    heroSubtitle: 'คำนวณภาษีเงินได้บุคคลธรรมดา — คำนวณสดในเบราว์เซอร์ของคุณ',
    langLabel: 'ภาษา',
    countryLabel: 'ประเทศ',
    filingStatusLabel: 'สถานะการยื่น',
    incomeTitle: 'รายได้',
    incomeHint: 'กรอกรายได้ขั้นต้นของแต่ละประเภท ระบบจะหักค่าใช้จ่ายให้อัตโนมัติ',
    deductionsTitle: 'ค่าลดหย่อนและการออม',
    deductionsHint: 'ระบบจะจำกัดตามเพดานให้อัตโนมัติ — กรอกตามที่จ่ายจริง',
    allowancesTitle: 'ค่าลดหย่อนครอบครัว',
    withheldTitle: 'ภาษีที่จ่ายไปแล้ว',
    withheldHint: 'ภาษีที่หัก ณ ที่จ่าย หรือจ่ายล่วงหน้า',
    withheld: 'หัก ณ ที่จ่าย',
    estimatedPaid: 'จ่ายล่วงหน้า',
    self: 'ผู้มีรายได้',
    spouse: 'คู่สมรส',
    children: 'บุตร',
    disabled: 'ผู้พิการ',
    people: 'คน',
    resultsTitle: 'ผลลัพธ์',
    netTax: 'ภาษีที่ต้องชำระ',
    refund: 'เงินคืน',
    extraToPay: 'ต้องชำระเพิ่ม',
    allSettled: 'ชำระครบแล้ว',
    grossIncome: 'รายได้รวม',
    assessableIncome: 'รายได้หลังหักค่าใช้จ่าย',
    expenseDeductions: 'ค่าใช้จ่ายหักได้',
    itemizedDeductions: 'ค่าลดหย่อน',
    allowancesTotal: 'ค่าลดหย่อนครอบครัว',
    taxableIncome: 'รายได้สุทธิ (ฐานภาษี)',
    taxLiability: 'ภาษีตามขั้นบันได',
    credits: 'เครดิตภาษี',
    effectiveRate: 'อัตราภาษีเฉลี่ย',
    marginalRate: 'อัตราภาษีขั้นสูงสุด',
    bracketsTitle: 'ขั้นบันไดภาษี',
    bracketColumn: 'ขั้น',
    taxableColumn: 'ฐานภาษี',
    taxColumn: 'ภาษี',
    rateColumn: 'อัตรา',
    reset: 'รีเซ็ต',
    assumptionsTitle: 'ข้อสมมติและข้อจำกัด',
    placeholderBanner:
      'ระบบภาษีนี้เป็นโครงร่างเริ่มต้น — ค่าทั้งหมดเป็นค่าแทน ยังไม่ใช้สำหรับการคำนวณจริง',
    localeNote: 'บันทึกภาษาไว้บนอุปกรณ์นี้',
    engineNote: 'ขับเคลื่อนด้วย tax engine ของ excited.live',
  },
} as const

/* ------------------------------------------------------------------ */
/* Formatters                                                          */
/* ------------------------------------------------------------------ */

const currencyFormatters: Record<string, Record<Locale, Intl.NumberFormat>> = {}

function formatMoney(value: number, currency: string, locale: Locale): string {
  currencyFormatters[currency] ??= {
    en: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }),
    th: new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }),
  }
  return currencyFormatters[currency][locale].format(value)
}

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(rate === 0 ? 0 : 1).replace(/\.0$/, '')}%`
}

function formatBracket(bounds: { from: number; to: number }, currency: string, locale: Locale): string {
  const toLabel = Number.isFinite(bounds.to) ? formatMoney(bounds.to, currency, locale) : '∞'
  return `${formatMoney(bounds.from, currency, locale)} – ${toLabel}`
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function TaxPage() {
  const { locale, setLocale, t } = useLocale()
  const copy = COPY[locale]

  const systems = useMemo(() => availableTaxSystems(), [])
  const [country, setCountry] = useState<TaxCountry>(() => systems[0]?.country ?? 'TH')
  const system: TaxSystem = useMemo(() => getTaxSystem(country as 'TH' | 'US', 2026), [country])

  const [input, setInput] = useState<TaxInput>(() => defaultInput(system))

  const switchCountry = (next: TaxCountry) => {
    const nextSystem = getTaxSystem(next as 'TH' | 'US', 2026)
    setCountry(next)
    setInput(defaultInput(nextSystem))
  }

  const result: TaxResult = useMemo(() => {
    const problems = system.validate(input)
    if (problems.length > 0) return zeroResult(system, problems)
    return system.compute(input)
  }, [system, input])

  const isPlaceholder = system.country === 'US'

  return (
    <Theme theme={neutralTheme} mode="dark">
      <TaxContent
        copy={copy}
        locale={locale}
        setLocale={setLocale}
        t={t}
        systems={systems}
        country={country}
        switchCountry={switchCountry}
        system={system}
        input={input}
        setInput={setInput}
        result={result}
        isPlaceholder={isPlaceholder}
      />
    </Theme>
  )
}

/* ------------------------------------------------------------------ */
/* Default / zero results                                              */
/* ------------------------------------------------------------------ */

function defaultInput(system: TaxSystem): TaxInput {
  const categories = system.config?.incomeCategories ?? []
  const hasEmployment = categories.some((category) => category.code === 'employment')
  const hasWages = categories.some((category) => category.code === 'wages')
  const employmentCode = hasEmployment ? 'employment' : hasWages ? 'wages' : categories[0]?.code ?? 'other'
  return {
    incomes: [{ categoryCode: employmentCode, amount: 900_000 }],
    allowances: { personal: 1, spouse: 0, children: 0, disabled: 0 },
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
}

function zeroResult(system: TaxSystem, warnings: string[]): TaxResult {
  return {
    country: system.country,
    taxYear: system.taxYear,
    currency: system.config?.currency ?? 'THB',
    grossIncome: 0,
    assessableIncome: 0,
    expenseDeductions: 0,
    itemizedDeductions: 0,
    allowancesTotal: 0,
    taxableIncome: 0,
    taxLiability: 0,
    credits: 0,
    netTax: 0,
    marginalRate: 0,
    effectiveRate: 0,
    balance: 0,
    brackets: (system.config?.brackets ?? []).map((bracket, index) => {
      const prev = index === 0 ? undefined : system.config?.brackets[index - 1]
      const from = index === 0 ? 0 : (prev?.upTo ?? 0)
      return { index, from, to: bracket.upTo, rate: bracket.rate, taxableInBracket: 0, tax: 0 }
    }),
    warnings,
  }
}

/* ------------------------------------------------------------------ */
/* Content (kept outside <Theme> switch to avoid remounts)             */
/* ------------------------------------------------------------------ */

interface TaxContentProps {
  copy: (typeof COPY)['en'] | (typeof COPY)['th']
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (label: { en: string; th: string }) => string
  systems: TaxSystem[]
  country: string
  switchCountry: (country: TaxCountry) => void
  system: TaxSystem
  input: TaxInput
  setInput: (input: TaxInput) => void
  result: TaxResult
  isPlaceholder: boolean
}

function TaxContent({
  copy,
  locale,
  setLocale,
  t,
  systems,
  country,
  switchCountry,
  system,
  input,
  setInput,
  result,
  isPlaceholder,
}: TaxContentProps) {
  const currency = result.currency
  const categories = system.config?.incomeCategories ?? []
  const filingStatuses =
    (system.config?.options?.filingStatuses as { code: string; label: { en: string; th: string } }[] | undefined) ??
    null

  const patchIncome = (code: string, amount: number | null) => {
    const incomes = input.incomes.filter((line) => line.categoryCode !== code)
    if (amount !== null && amount > 0) {
      incomes.push({ categoryCode: code, amount })
    }
    // Keep a stable order matching the category list.
    incomes.sort((a, b) => {
      const ai = categories.findIndex((category) => category.code === a.categoryCode)
      const bi = categories.findIndex((category) => category.code === b.categoryCode)
      return ai - bi
    })
    setInput({ ...input, incomes })
  }

  const incomeFor = (code: string): number | null =>
    input.incomes.find((line) => line.categoryCode === code)?.amount ?? null

  const patchDeduction = (key: keyof TaxInput['deductions'], value: number | null) => {
    setInput({
      ...input,
      deductions: { ...input.deductions, [key]: value ?? 0 },
    })
  }

  const patchRetirement = (key: keyof TaxInput['deductions']['retirementSavings'], value: number | null) => {
    setInput({
      ...input,
      deductions: {
        ...input.deductions,
        retirementSavings: { ...input.deductions.retirementSavings, [key]: value ?? 0 },
      },
    })
  }

  const patchAllowance = (key: keyof TaxInput['allowances'], value: number | null) => {
    setInput({
      ...input,
      allowances: { ...input.allowances, [key]: Math.max(0, Math.round(value ?? 0)) },
    })
  }

  const balanceLabel =
    result.balance < 0 ? copy.refund : result.balance > 0 ? copy.extraToPay : copy.allSettled

  return (
    <div className="tax-shell">
      <header className="tax-header">
        <span className="tax-brand">
          <span className="tax-brand__mark">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5V4.5M4 19.5h16" />
              <path d="m7 15 3-3 2.2 1.7 4.8-6.2" />
            </svg>
          </span>
          {copy.brand} <Text color="secondary">{copy.appName}</Text>
        </span>
        <div className="tax-lang-switch">
          <SegmentedControl
            value={locale}
            onChange={(value) => setLocale(value as Locale)}
            label={copy.langLabel}
            size="sm"
          >
            <SegmentedControlItem value="en" label="EN" />
            <SegmentedControlItem value="th" label="ไทย" />
          </SegmentedControl>
        </div>
      </header>

      <main className="tax-main">
        <section className="tax-hero">
          <h1>{copy.heroTitle}</h1>
          <p>{copy.heroSubtitle}</p>
        </section>

        {isPlaceholder && (
          <Banner status="warning" title={copy.placeholderBanner} />
        )}

        <div className="tax-grid">
          {/* ------------------------- LEFT: inputs ------------------------ */}
          <div className="tax-form-stack">
            <Card padding={6}>
              <SectionHeading title={copy.countryLabel} />
              <div className="tax-section__grid tax-allow-wrap">
                <SegmentedControl
                  value={country}
                  onChange={(value) => switchCountry(value as TaxCountry)}
                  label={copy.countryLabel}
                  layout="fill"
                >
                  {systems
                    .filter((item, index, all) => all.findIndex((other) => other.country === item.country) === index)
                    .map((item) => (
                      <SegmentedControlItem
                        key={item.country}
                        value={item.country}
                        label={item.country === 'TH' ? '🇹🇭 Thailand' : item.country === 'US' ? '🇺🇸 United States' : item.country}
                      />
                    ))}
                </SegmentedControl>
              </div>
              {filingStatuses && (
                <div className="tax-section__grid tax-allow-wrap" style={{ marginTop: 14 }}>
                  <SegmentedControl
                    value={input.filingStatus ?? 'single'}
                    onChange={(value) => setInput({ ...input, filingStatus: value })}
                    label={copy.filingStatusLabel}
                    layout="fill"
                  >
                    {filingStatuses.map((status) => (
                      <SegmentedControlItem key={status.code} value={status.code} label={status.label[locale]} />
                    ))}
                  </SegmentedControl>
                </div>
              )}
            </Card>

            <Card padding={6}>
              <SectionHeading title={copy.incomeTitle} hint={copy.incomeHint} />
              <div className="tax-section__grid">
                {categories.map((category) => (
                  <NumberInput
                    key={category.code}
                    label={t(category.label)}
                    value={incomeFor(category.code)}
                    onChange={(value) => patchIncome(category.code, value)}
                    min={0}
                    placeholder="0"
                    units={currency}
                    hasClear
                    size="md"
                  />
                ))}
              </div>
            </Card>

            <Card padding={6}>
              <SectionHeading title={copy.deductionsTitle} hint={copy.deductionsHint} />
              <div className="tax-section__grid">
                <NumberInput
                  label={locale === 'en' ? 'Insurance premiums' : 'เบี้ยประกัน'}
                  value={input.deductions.insurance}
                  onChange={(value) => patchDeduction('insurance', value)}
                  min={0}
                  placeholder="0"
                  units={currency}
                  hasClear
                  size="md"
                />
                <NumberInput
                  label={locale === 'en' ? 'Mortgage interest' : 'ดอกเบี้ยบ้าน'}
                  value={input.deductions.mortgageInterest}
                  onChange={(value) => patchDeduction('mortgageInterest', value)}
                  min={0}
                  placeholder="0"
                  units={currency}
                  hasClear
                  size="md"
                />
                <NumberInput
                  label={locale === 'en' ? 'Donations' : 'เงินบริจาค'}
                  value={input.deductions.donations}
                  onChange={(value) => patchDeduction('donations', value)}
                  min={0}
                  placeholder="0"
                  units={currency}
                  hasClear
                  size="md"
                />
              </div>
              <div className="tax-section__grid tax-section__grid--three" style={{ marginTop: 14 }}>
                <NumberInput
                  label={locale === 'en' ? 'SSF' : 'กองทุน SSF'}
                  value={input.deductions.retirementSavings.ssf}
                  onChange={(value) => patchRetirement('ssf', value)}
                  min={0}
                  placeholder="0"
                  units={currency}
                  hasClear
                  size="md"
                />
                <NumberInput
                  label={locale === 'en' ? 'RMF' : 'กองทุน RMF'}
                  value={input.deductions.retirementSavings.rmf}
                  onChange={(value) => patchRetirement('rmf', value)}
                  min={0}
                  placeholder="0"
                  units={currency}
                  hasClear
                  size="md"
                />
                <NumberInput
                  label={locale === 'en' ? 'Provident fund' : 'กองทุนสำรองเลี้ยงชีพ'}
                  value={input.deductions.retirementSavings.provident}
                  onChange={(value) => patchRetirement('provident', value)}
                  min={0}
                  placeholder="0"
                  units={currency}
                  hasClear
                  size="md"
                />
              </div>
            </Card>

            <Card padding={6}>
              <SectionHeading title={copy.allowancesTitle} />
              <div className="tax-section__grid tax-section__grid--three">
                <NumberInput
                  label={copy.self}
                  value={input.allowances.personal}
                  onChange={(value) => patchAllowance('personal', value)}
                  min={0}
                  isIntegerOnly
                  hasClear
                  size="md"
                />
                <NumberInput
                  label={copy.spouse}
                  value={input.allowances.spouse}
                  onChange={(value) => patchAllowance('spouse', value)}
                  min={0}
                  isIntegerOnly
                  hasClear
                  size="md"
                />
                <NumberInput
                  label={copy.children}
                  value={input.allowances.children}
                  onChange={(value) => patchAllowance('children', value)}
                  min={0}
                  isIntegerOnly
                  hasClear
                  size="md"
                />
                <NumberInput
                  label={copy.disabled}
                  value={input.allowances.disabled}
                  onChange={(value) => patchAllowance('disabled', value)}
                  min={0}
                  isIntegerOnly
                  hasClear
                  size="md"
                />
              </div>
            </Card>

            <Card padding={6}>
              <SectionHeading title={copy.withheldTitle} hint={copy.withheldHint} />
              <div className="tax-section__grid">
                <NumberInput
                  label={copy.withheld}
                  value={input.withheld}
                  onChange={(value) => setInput({ ...input, withheld: value ?? 0 })}
                  min={0}
                  placeholder="0"
                  units={currency}
                  hasClear
                  size="md"
                />
                <NumberInput
                  label={copy.estimatedPaid}
                  value={input.estimatedPaid}
                  onChange={(value) => setInput({ ...input, estimatedPaid: value ?? 0 })}
                  min={0}
                  placeholder="0"
                  units={currency}
                  hasClear
                  size="md"
                />
              </div>
            </Card>
          </div>

          {/* ------------------------ RIGHT: results ----------------------- */}
          <div className="tax-results-stack">
            <Card padding={6}>
              <div className="tax-net-row">
                <div>
                  <Text size="sm" color="secondary">{copy.resultsTitle} · {system.country} {system.taxYear}</Text>
                  <div className="tax-net-value">{formatMoney(result.netTax, currency, locale)}</div>
                  <Text size="sm" color="secondary">
                    {balanceLabel}: <strong>{formatMoney(Math.abs(result.balance), currency, locale)}</strong>
                  </Text>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {isPlaceholder && <Badge label={locale === 'en' ? 'Placeholder' : 'ยังไม่ใช้จริง'} variant="warning" />}
                  <Badge label={copy.netTax} variant={result.netTax === 0 ? 'success' : 'neutral'} />
                </div>
              </div>
              <div className="tax-metrics" style={{ marginTop: 16 }}>
                <MetricRow label={copy.grossIncome} value={formatMoney(result.grossIncome, currency, locale)} />
                <MetricRow label={copy.expenseDeductions} value={`− ${formatMoney(result.expenseDeductions, currency, locale)}`} />
                <MetricRow label={copy.assessableIncome} value={formatMoney(result.assessableIncome, currency, locale)} />
                <MetricRow label={copy.itemizedDeductions} value={`− ${formatMoney(result.itemizedDeductions, currency, locale)}`} />
                <MetricRow label={copy.allowancesTotal} value={`− ${formatMoney(result.allowancesTotal, currency, locale)}`} />
                <MetricRow label={copy.taxableIncome} value={formatMoney(result.taxableIncome, currency, locale)} />
                {'standardDeduction' in result && (result as { standardDeduction: number }).standardDeduction > 0 && (
                  <MetricRow
                    label={locale === 'en' ? 'Standard deduction' : 'ค่าลดหย่อนมาตรฐาน'}
                    value={`− ${formatMoney((result as { standardDeduction: number }).standardDeduction, currency, locale)}`}
                  />
                )}
                <MetricRow label={copy.taxLiability} value={formatMoney(result.taxLiability, currency, locale)} />
                {result.credits > 0 && (
                  <MetricRow label={copy.credits} value={`− ${formatMoney(result.credits, currency, locale)}`} />
                )}
                <MetricRow label={copy.effectiveRate} value={formatRate(result.effectiveRate)} />
                <MetricRow label={copy.marginalRate} value={formatRate(result.marginalRate)} />
              </div>
            </Card>

            <Card padding={6}>
              <SectionHeading title={copy.bracketsTitle} />
              <table className="tax-bracket-table">
                <thead>
                  <tr>
                    <th>{copy.bracketColumn}</th>
                    <th>{copy.rateColumn}</th>
                    <th>{copy.taxableColumn}</th>
                    <th>{copy.taxColumn}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.brackets.map((bracket) => (
                    <BracketRow
                      key={bracket.index}
                      bracket={bracket}
                      currency={currency}
                      locale={locale}
                    />
                  ))}
                </tbody>
              </table>
            </Card>

            <Card padding={6}>
              <SectionHeading title={copy.assumptionsTitle} />
              {result.warnings.length > 0 && (
                <ul style={{ margin: '0 0 12px', paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: 'var(--color-warning, #e6b450)' }}>
                  {result.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              )}
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
                {system.assumptions.map((assumption, index) => (
                  <li key={index}>{t(assumption)}</li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </main>

      <footer className="tax-footer">
        {copy.engineNote}
      </footer>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <Text weight="semibold">{title}</Text>
      {hint && (
        <div>
          <Text size="sm" color="secondary">{hint}</Text>
        </div>
      )}
    </div>
  )
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="tax-metric-row">
      <span className="tax-metric-row__label">{label}</span>
      <span className="tax-metric-row__value">{value}</span>
    </div>
  )
}

function BracketRow({
  bracket,
  currency,
  locale,
}: {
  bracket: BracketBreakdown
  currency: string
  locale: Locale
}) {
  const empty = bracket.taxableInBracket === 0
  return (
    <tr className={`${empty ? 'tax-bracket-row--empty' : 'tax-bracket-row--active'}`}>
      <td>{formatBracket({ from: bracket.from, to: bracket.to }, currency, locale)}</td>
      <td>{formatRate(bracket.rate)}</td>
      <td>{empty ? '—' : formatMoney(bracket.taxableInBracket, currency, locale)}</td>
      <td>{empty ? '—' : formatMoney(bracket.tax, currency, locale)}</td>
    </tr>
  )
}
