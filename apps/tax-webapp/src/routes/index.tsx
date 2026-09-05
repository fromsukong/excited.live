import { useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  availableTaxSystems,
  getTaxSystem,
  type AllowanceDef,
  type BracketBreakdown,
  type DeductionLine,
  type TaxCountry,
  type TaxInput,
  type TaxResult,
  type TaxSystem,
} from '@excited-live/tax'
import { Badge } from '@astryxdesign/core/Badge'
import { Banner } from '@astryxdesign/core/Banner'
import { Card } from '@astryxdesign/core/Card'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { Text } from '@astryxdesign/core/Text'
import { Theme } from '@astryxdesign/core/theme'
import { mastercardTheme } from '@excited-live/design-system'
import { LocaleProvider, useLocale, type Locale } from '~/i18n'

export const Route = createFileRoute('/')({
  component: () => (
    <LocaleProvider>
      <TaxPage />
    </LocaleProvider>
  ),
})

/* ------------------------------------------------------------------ */
/* Static copy (EN-first; engine labels carry bilingual text).          */
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
    householdTitle: 'Your household',
    householdHint: 'Pre-fills the common setup — fine-tune below.',
    householdSingle: 'Single',
    householdCouple: 'Married',
    householdCoupleKids: 'Married + kids',
    householdElderly: 'With parents',
    personalIncluded: 'You (taxpayer allowance) — always included',
    withheldTitle: 'Tax already paid',
    withheldHint: 'Withheld by the payer or paid in advance.',
    withheld: 'Withheld at source',
    estimatedPaid: 'Paid in advance',
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
    savingsTitle: 'What your deductions save you',
    savingsHint: 'Tax you pay without deductions vs with — exact saving per line below.',
    withoutDeductions: 'Without deductions',
    withDeductions: 'With deductions',
    youSave: 'You save',
    savedPrefix: 'saves',
    capBite: 'Capped',
    capCounted: 'counted',
    capOf: 'of',
    savedTotal: 'Total saved by deductions',
    noAllowances: 'This jurisdiction has no family allowances.',
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
    householdTitle: 'ครอบครัวของคุณ',
    householdHint: 'เลือกแบบที่ใกล้เคียง — ปรับรายละเอียดด้านล่างได้',
    householdSingle: 'โสด',
    householdCouple: 'สมรส',
    householdCoupleKids: 'สมรส + บุตร',
    householdElderly: 'ดูแลบิดามารดา',
    personalIncluded: 'ผู้มีเงินได้ (ค่าลดหย่อนส่วนตัว) — รวมอยู่เสมอ',
    withheldTitle: 'ภาษีที่จ่ายไปแล้ว',
    withheldHint: 'ภาษีที่หัก ณ ที่จ่าย หรือจ่ายล่วงหน้า',
    withheld: 'หัก ณ ที่จ่าย',
    estimatedPaid: 'จ่ายล่วงหน้า',
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
    savingsTitle: 'ค่าลดหย่อนช่วยคุณประหยัดได้เท่าไหร่',
    savingsHint: 'ภาษีที่ต้องจ่ายเมื่อไม่มีค่าลดหย่อน เทียบกับเมื่อมี — ยอดประหยัดจริงอยู่ในแต่ละรายการด้านล่าง',
    withoutDeductions: 'ไม่มีค่าลดหย่อน',
    withDeductions: 'มีค่าลดหย่อน',
    youSave: 'คุณประหยัดได้',
    savedPrefix: 'ประหยัดให้',
    capBite: 'เกินเพดาน',
    capCounted: 'ถูกนับ',
    capOf: 'จาก',
    savedTotal: 'ค่าลดหย่อนช่วยประหยัดทั้งหมด',
    noAllowances: 'ระบบภาษีนี้ไม่มีค่าลดหย่อนครอบครัว',
    assumptionsTitle: 'ข้อสมมติและข้อจำกัด',
    placeholderBanner:
      'ระบบภาษีนี้เป็นโครงร่างเริ่มต้น — ค่าทั้งหมดเป็นค่าแทน ยังไม่ใช้สำหรับการคำนวณจริง',
    localeNote: 'บันทึกภาษาไว้บนอุปกรณ์นี้',
    engineNote: 'ขับเคลื่อนด้วย tax engine ของ excited.live',
  },
} as const

type Copy = (typeof COPY)['en'] | (typeof COPY)['th']

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
/* MoneyInput — live thousand separators, empty by default             */
/* ------------------------------------------------------------------ */

/**
 * Groups integer digits with commas: "900000" → "900,000".
 * Also returns a map from each character position in the OUTPUT to its
 * origin position in the INPUT, so the caret can be preserved across
 * re-grouping (commas added/removed shift positions).
 */
function groupDigitsDetailed(text: string): { grouped: string; map: number[] } {
  const [intPart = '', ...rest] = text.split('.')
  let grouped = ''
  const map: number[] = []
  for (let i = 0; i < intPart.length; i++) {
    const remaining = intPart.length - i
    if (remaining > 1 && remaining % 3 === 0 && i > 0) {
      grouped += ','
      map.push(i - 1) // comma inserted before this digit maps back
    }
    grouped += intPart[i]
    map.push(i)
  }
  return {
    grouped: rest.length > 0 ? `${grouped}.${rest.join('.')}` : grouped,
    map,
  }
}

/** Groups integer digits with commas: "900000" → "900,000". */
function groupDigits(text: string): string {
  return groupDigitsDetailed(text).grouped
}

/**
 * Parse typed text into a value class:
 *  - 'empty'   → user cleared the field (commit null)
 *  - 'partial' → mid-edit fragment like "1," or "12." (keep local, don't commit)
 *  - 'ok'      → complete number (commit)
 * Non-numeric junk is treated as partial so it reverts on blur.
 */
function classifyMoneyText(text: string): { kind: 'empty' | 'partial' | 'ok'; value: number } {
  const compact = text.replace(/[,\s]/g, '')
  if (compact === '') return { kind: 'empty', value: 0 }
  if (!/^\d+(\.\d*)?$/.test(compact)) return { kind: 'partial', value: 0 }
  return { kind: 'ok', value: Number(compact) }
}

interface MoneyInputProps {
  label: string
  value: number | null
  onChange: (value: number | null) => void
  currency: string
}

function MoneyInput({ label, value, onChange, currency }: MoneyInputProps) {
  // draft === null → not being edited, show the grouped committed value.
  // While editing, the display is ALWAYS the grouped form of the typed
  // digits (commas stripped before parsing), so separators appear live.
  const [draft, setDraft] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingCaret = useRef<number | null>(null)
  const lastDisplay = useRef('')

  const display =
    draft !== null
      ? groupDigits(draft.replace(/[,\s]/g, ''))
      : value == null
        ? ''
        : groupDigits(String(value))

  // After each re-render, restore the caret to the position matching where
  // the user was typing (the comma count between old/new display shifts it).
  useEffect(() => {
    const input = inputRef.current
    if (!input || pendingCaret.current === null || lastDisplay.current === display) {
      if (input && pendingCaret.current === null) lastDisplay.current = display
      return
    }
    // Map caret from the previous display's digit stream to the new one.
    const digitsBefore = lastDisplay.current.slice(0, pendingCaret.current).replace(/[,\s]/g, '').length
    let count = 0
    let next = display.length
    for (let i = 0; i < display.length; i++) {
      if (display[i] !== ',' && display[i] !== ' ') {
        count++
        if (count === digitsBefore) {
          next = i + 1
          break
        }
      }
    }
    if (digitsBefore === 0) next = 0
    pendingCaret.current = null
    lastDisplay.current = display
    requestAnimationFrame(() => input.setSelectionRange(next, next))
  }, [display])

  const handleChange = (next: string) => {
    const input = inputRef.current
    if (input) {
      pendingCaret.current = input.selectionStart ?? null
      lastDisplay.current = input.value
    }
    setDraft(next)
    const { kind, value: parsed } = classifyMoneyText(next)
    if (kind === 'empty') {
      onChange(null)
    } else if (kind === 'ok') {
      onChange(parsed)
    }
    // 'partial': keep the text local until it parses (typing "1," / "12.").
  }

  const handleBlur = () => {
    if (draft !== null) {
      const { kind } = classifyMoneyText(draft)
      if (kind === 'partial') {
        onChange(null) // junk or half-typed → revert to empty
      }
      setDraft(null) // show the grouped committed value again
    }
  }

  return (
    <div className="tax-money">
      <span className="tax-money__label">
        <span className="tax-money__name">{label}</span>
        <span className="tax-money__currency">{currency}</span>
      </span>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        className="tax-money__input"
        value={display}
        placeholder="0"
        aria-label={label}
        onFocus={(event) => {
          // Select everything so typing replaces the whole amount.
          requestAnimationFrame(() => event.target.select())
        }}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={handleBlur}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* CountStepper — integer count control for family members             */
/* ------------------------------------------------------------------ */

interface CountStepperProps {
  label: string
  hint?: string
  value: number
  onChange: (value: number) => void
  max?: number
}

function CountStepper({ label, hint, value, onChange, max = 20 }: CountStepperProps) {
  return (
    <div className="tax-count">
      <div className="tax-count__row">
        <div className="tax-count__text">
          <span className="tax-count__label">{label}</span>
          {hint && <span className="tax-count__hint">{hint}</span>}
        </div>
        <div className="tax-count__controls">
          <button
            type="button"
            className="tax-count__btn"
            aria-label={`Remove one ${label}`}
            disabled={value <= 0}
            onClick={() => onChange(Math.max(0, value - 1))}
          >
            −
          </button>
          <span className="tax-count__value" aria-live="polite">
            {value}
          </span>
          <button
            type="button"
            className="tax-count__btn"
            aria-label={`Add one ${label}`}
            disabled={value >= max}
            onClick={() => onChange(Math.min(max, value + 1))}
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
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

  // Untouched MoneyInputs hold null; the engine contract requires finite
  // numbers, so nulls → 0 strictly for the engine round-trip. State keeps
  // null so untouched fields stay visibly empty.
  const engineInput = useMemo(() => {
    const num = (n: number | null | undefined): number => (typeof n === 'number' && Number.isFinite(n) ? n : 0)
    return {
      ...input,
      incomes: input.incomes.map((line) => ({ ...line, amount: num(line.amount) })),
      deductions: {
        insurance: num(input.deductions.insurance),
        mortgageInterest: num(input.deductions.mortgageInterest),
        donations: num(input.deductions.donations),
        retirementSavings: {
          ssf: num(input.deductions.retirementSavings.ssf),
          rmf: num(input.deductions.retirementSavings.rmf),
          provident: num(input.deductions.retirementSavings.provident),
        },
      },
      withheld: num(input.withheld),
      estimatedPaid: num(input.estimatedPaid),
    }
  }, [input])

  const result: TaxResult = useMemo(() => {
    const problems = system.validate(engineInput)
    if (problems.length > 0) return zeroResult(system, problems)
    return system.compute(engineInput)
  }, [system, engineInput])

  const isPlaceholder = system.country === 'US'

  // With/without comparison: same input, itemized deductions zeroed. Engines
  // are pure and cheap — recompute beats duplicating bracket logic in the UI.
  const withoutDeductionsResult: TaxResult | null = useMemo(() => {
    if (system.validate(engineInput).length > 0) return null
    return system.compute({ ...engineInput, deductions: zeroDeductions() })
  }, [system, engineInput])

  return (
    <Theme theme={mastercardTheme} mode="light">
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
        withoutDeductionsResult={withoutDeductionsResult}
        isPlaceholder={isPlaceholder}
      />
    </Theme>
  )
}

/* ------------------------------------------------------------------ */
/* Default / zero results                                              */
/* ------------------------------------------------------------------ */

function zeroDeductions(): TaxInput['deductions'] {
  return {
    insurance: 0,
    mortgageInterest: 0,
    donations: 0,
    retirementSavings: { ssf: 0, rmf: 0, provident: 0 },
  }
}

function defaultInput(system: TaxSystem): TaxInput {
  const categories = system.config?.incomeCategories ?? []
  const hasEmployment = categories.some((category) => category.code === 'employment')
  const hasWages = categories.some((category) => category.code === 'wages')
  const employmentCode = hasEmployment ? 'employment' : hasWages ? 'wages' : categories[0]?.code ?? 'other'
  // Issue #14: untouched fields must be VISIBLY untouched — all numeric
  // inputs start empty (nulls render as empty strings with a 0 placeholder).
  return {
    incomes: [{ categoryCode: employmentCode, amount: null as unknown as number }],
    allowances: { personal: 1, spouse: 0, children: 0, parents: 0, disabled: 0 },
    deductions: zeroDeductions(),
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
    deductionLines: [],
  }
}

/* ------------------------------------------------------------------ */
/* Household presets (TH-flavoured; generic across systems)            */
/* ------------------------------------------------------------------ */

type HouseholdPreset = 'single' | 'couple' | 'couple_kids' | 'elderly'

function householdPreset(preset: HouseholdPreset): { spouse: number; children: number; parents: number } {
  switch (preset) {
    case 'single':
      return { spouse: 0, children: 0, parents: 0 }
    case 'couple':
      return { spouse: 1, children: 0, parents: 0 }
    case 'couple_kids':
      return { spouse: 1, children: 2, parents: 0 }
    case 'elderly':
      return { spouse: 1, children: 0, parents: 2 }
  }
}

function householdPresetOf(allowances: TaxInput['allowances']): HouseholdPreset {
  const { spouse, children, parents } = allowances
  if (children > 0 && spouse > 0) return 'couple_kids'
  if (parents > 0) return 'elderly'
  if (spouse > 0) return 'couple'
  return 'single'
}

/* ------------------------------------------------------------------ */
/* Savings model (view-model over deductionLines + counterfactual)     */
/* ------------------------------------------------------------------ */

interface SavingsModel {
  baseNet: number
  withNet: number
  totalSaved: number
  lines: { line: DeductionLine; saved: number }[]
  hasAnyDeduction: boolean
}

function buildSavingsModel(base: TaxResult, withDeductions: TaxResult): SavingsModel {
  const totalSaved = Math.max(0, base.netTax - withDeductions.netTax)
  const relevant = withDeductions.deductionLines.filter((line) => line.entered > 0 || line.applied > 0)
  const naiveTotal =
    relevant.reduce((acc, line) => acc + line.applied, 0) * withDeductions.marginalRate
  const lines = relevant.map((line) => {
    // Naive attribution: applied × the WITH-deductions marginal rate, scaled
    // proportionally so per-line savings always sum EXACTLY to the headline
    // total (base.netTax − with.netTax), which absorbs bracket movement.
    const naive = line.applied * withDeductions.marginalRate
    const scaled = naiveTotal > 0 ? (naive / naiveTotal) * totalSaved : 0
    return { line, saved: scaled }
  })
  return {
    baseNet: base.netTax,
    withNet: withDeductions.netTax,
    totalSaved,
    lines,
    hasAnyDeduction: withDeductions.itemizedDeductions > 0,
  }
}

/* ------------------------------------------------------------------ */
/* Content (kept outside <Theme> switch to avoid remounts)             */
/* ------------------------------------------------------------------ */

interface TaxContentProps {
  copy: Copy
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
  withoutDeductionsResult: TaxResult | null
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
  withoutDeductionsResult,
  isPlaceholder,
}: TaxContentProps) {
  const currency = result.currency
  const categories = system.config?.incomeCategories ?? []
  const allowanceDefs: AllowanceDef[] = system.allowanceDefs ?? []
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

  const patchAllowance = (key: keyof TaxInput['allowances'], value: number) => {
    setInput({
      ...input,
      allowances: { ...input.allowances, [key]: Math.max(0, Math.round(value)) },
    })
  }

  const applyHousehold = (preset: HouseholdPreset) => {
    setInput({ ...input, allowances: { ...input.allowances, ...householdPreset(preset) } })
  }

  const savings: SavingsModel | null =
    withoutDeductionsResult !== null ? buildSavingsModel(withoutDeductionsResult, result) : null

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

        {isPlaceholder && <Banner status="warning" title={copy.placeholderBanner} />}

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
                  <MoneyInput
                    key={category.code}
                    label={t(category.label)}
                    value={incomeFor(category.code)}
                    onChange={(value) => patchIncome(category.code, value)}
                    currency={currency}
                  />
                ))}
              </div>
            </Card>

            <Card padding={6}>
              <SectionHeading title={copy.deductionsTitle} hint={copy.deductionsHint} />
              <div className="tax-section__grid">
                <MoneyInput
                  label={locale === 'en' ? 'Insurance premiums' : 'เบี้ยประกันภัย'}
                  value={deductionOrNull(input.deductions.insurance)}
                  onChange={(value) => patchDeduction('insurance', value)}
                  currency={currency}
                />
                <MoneyInput
                  label={locale === 'en' ? 'Mortgage interest' : 'ดอกเบี้ยบ้าน'}
                  value={deductionOrNull(input.deductions.mortgageInterest)}
                  onChange={(value) => patchDeduction('mortgageInterest', value)}
                  currency={currency}
                />
                <MoneyInput
                  label={locale === 'en' ? 'Donations' : 'เงินบริจาค'}
                  value={deductionOrNull(input.deductions.donations)}
                  onChange={(value) => patchDeduction('donations', value)}
                  currency={currency}
                />
              </div>
              <div className="tax-section__grid tax-section__grid--three" style={{ marginTop: 14 }}>
                <MoneyInput
                  label={locale === 'en' ? 'SSF' : 'กองทุน SSF'}
                  value={deductionOrNull(input.deductions.retirementSavings.ssf)}
                  onChange={(value) => patchRetirement('ssf', value)}
                  currency={currency}
                />
                <MoneyInput
                  label={locale === 'en' ? 'RMF' : 'กองทุน RMF'}
                  value={deductionOrNull(input.deductions.retirementSavings.rmf)}
                  onChange={(value) => patchRetirement('rmf', value)}
                  currency={currency}
                />
                <MoneyInput
                  label={locale === 'en' ? 'Provident fund' : 'กองทุนสำรองเลี้ยงชีพ'}
                  value={deductionOrNull(input.deductions.retirementSavings.provident)}
                  onChange={(value) => patchRetirement('provident', value)}
                  currency={currency}
                />
              </div>
            </Card>

            <Card padding={6}>
              <SectionHeading title={copy.allowancesTitle} />
              {allowanceDefs.length > 0 ? (
                <AllowanceSection
                  defs={allowanceDefs}
                  input={input}
                  patchAllowance={patchAllowance}
                  applyHousehold={applyHousehold}
                  copy={copy}
                  locale={locale}
                />
              ) : (
                <Text color="secondary">{copy.noAllowances}</Text>
              )}
            </Card>

            <Card padding={6}>
              <SectionHeading title={copy.withheldTitle} hint={copy.withheldHint} />
              <div className="tax-section__grid">
                <MoneyInput
                  label={copy.withheld}
                  value={deductionOrNull(input.withheld)}
                  onChange={(value) => setInput({ ...input, withheld: value ?? 0 })}
                  currency={currency}
                />
                <MoneyInput
                  label={copy.estimatedPaid}
                  value={deductionOrNull(input.estimatedPaid)}
                  onChange={(value) => setInput({ ...input, estimatedPaid: value ?? 0 })}
                  currency={currency}
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

            {savings !== null && savings.lines.length > 0 && (
              <SavingsPanel savings={savings} copy={copy} currency={currency} locale={locale} />
            )}

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

      <footer className="tax-footer">{copy.engineNote}</footer>
    </div>
  )
}

/** 0 reads as "untouched" → show an empty field instead. */
function deductionOrNull(value: number): number | null {
  return value === 0 ? null : value
}

/* ------------------------------------------------------------------ */
/* Allowance section (household picker + steppers)                     */
/* ------------------------------------------------------------------ */

function AllowanceSection({
  defs,
  input,
  patchAllowance,
  applyHousehold,
  copy,
  locale,
}: {
  defs: AllowanceDef[]
  input: TaxInput
  patchAllowance: (key: keyof TaxInput['allowances'], value: number) => void
  applyHousehold: (preset: HouseholdPreset) => void
  copy: Copy
  locale: Locale
}) {
  const personalDef = defs.find((def) => def.code === 'personal')
  const familyDefs = defs.filter((def) => def.code !== 'personal')

  return (
    <div>
      <div className="tax-household">
        <Text size="sm" weight="semibold">{copy.householdTitle}</Text>
        <Text size="sm" color="secondary">{copy.householdHint}</Text>
      </div>
      <div className="tax-section__grid tax-allow-wrap">
        <SegmentedControl
          value={householdPresetOf(input.allowances)}
          onChange={(value) => applyHousehold(value as HouseholdPreset)}
          label={copy.householdTitle}
          layout="fill"
        >
          <SegmentedControlItem value="single" label={copy.householdSingle} />
          <SegmentedControlItem value="couple" label={copy.householdCouple} />
          <SegmentedControlItem value="couple_kids" label={copy.householdCoupleKids} />
          <SegmentedControlItem value="elderly" label={copy.householdElderly} />
        </SegmentedControl>
      </div>

      {personalDef && (
        <div className="tax-personal-row">
          <span>{copy.personalIncluded}</span>
          <span className="tax-personal-row__amount">
            {personalDef.amountPerPerson.toLocaleString()} {input.allowances.personal > 0 ? '✓' : ''}
          </span>
        </div>
      )}

      {familyDefs.map((def) => (
        <div key={def.code} className="tax-count-wrap">
          <CountStepper
            label={def.label[locale]}
            hint={def.condition[locale]}
            value={input.allowances[def.code]}
            onChange={(value) => patchAllowance(def.code, value)}
            max={def.code === 'parents' ? 4 : 20}
          />
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Savings panel                                                       */
/* ------------------------------------------------------------------ */

function SavingsPanel({
  savings,
  copy,
  currency,
  locale,
}: {
  savings: SavingsModel
  copy: Copy
  currency: string
  locale: Locale
}) {
  return (
    <Card padding={6}>
      <SectionHeading title={copy.savingsTitle} hint={copy.savingsHint} />
      <div className="tax-compare">
        <div className="tax-compare__cell">
          <span className="tax-compare__label">{copy.withoutDeductions}</span>
          <span className="tax-compare__value">{formatMoney(savings.baseNet, currency, locale)}</span>
        </div>
        <div className="tax-compare__cell">
          <span className="tax-compare__label">{copy.withDeductions}</span>
          <span className="tax-compare__value tax-compare__value--good">{formatMoney(savings.withNet, currency, locale)}</span>
        </div>
        <div className="tax-compare__cell tax-compare__cell--save">
          <span className="tax-compare__label">{copy.youSave}</span>
          <span className="tax-compare__value tax-compare__value--save">{formatMoney(savings.totalSaved, currency, locale)}</span>
        </div>
      </div>

      <div className="tax-savings-lines">
        {savings.lines.map(({ line, saved }) => (
          <div key={line.code} className="tax-savings-line">
            <div className="tax-savings-line__head">
              <span className="tax-savings-line__label">{line.label[locale]}</span>
              <span className="tax-savings-line__value">
                {line.applied > 0
                  ? `${formatMoney(line.applied, currency, locale)} → ${copy.savedPrefix} ~${formatMoney(saved, currency, locale)}`
                  : copy.capBite}
              </span>
            </div>
            {line.capped && (
              <div className="tax-savings-line__cap">
                {copy.capBite}: {copy.capCounted} {formatMoney(line.applied, currency, locale)} {copy.capOf}{' '}
                {formatMoney(line.entered, currency, locale)}
              </div>
            )}
          </div>
        ))}
        <div className="tax-savings-total">
          {copy.savedTotal}: <strong>~{formatMoney(savings.totalSaved, currency, locale)}</strong>
        </div>
      </div>
    </Card>
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
    <tr className={empty ? 'tax-bracket-row--empty' : 'tax-bracket-row--active'}>
      <td>{formatBracket({ from: bracket.from, to: bracket.to }, currency, locale)}</td>
      <td>{formatRate(bracket.rate)}</td>
      <td>{empty ? '—' : formatMoney(bracket.taxableInBracket, currency, locale)}</td>
      <td>{empty ? '—' : formatMoney(bracket.tax, currency, locale)}</td>
    </tr>
  )
}
