# PlanInput reference: rows, type IDs, default frequencies, wallets

Companion to the `simulation_engine` skill. Every number here was read from
`packages/sim/src/index.ts` on current main at authoring time; if this file and
`index.ts` disagree, `index.ts` wins.

## PeriodRow (incomes and expenses)

| Field | Type | Notes |
|---|---|---|
| id | string | Stable key for React lists, UI-generated (row-1, row-2, ...) |
| typeId | IncomeTypeId / ExpenseTypeId | Drives the grouped tables in the UI |
| frequency | "monthly" / "yearly" | Engine normalizes monthly by x12 (`yearlyAmount`) |
| label | string | UI display |
| startYear / startMonth | number | First calendar year, month 0 = Jan |
| endYear / endMonth | number / null | endYear null = open-ended; endMonth 0..11 |
| amount | number | Yearly amount in the FIRST active year, THB |
| growthMode | "inflation" / "fixed" / "override" | US-001/002 |
| growthRate | number | 0..1, used only when growthMode = "override" |
| deductible | "none" / "mortgageInterest" (expenses only) | US-005, feeds the TH tax calc |

## Type-ID lists

Income (9): salary, hourlyWage, rsuGrant, inheritance, sideHustle, taxCredit,
taxDeduction, pensionIncome, customIncome.

Expenses (14): livingExpenses, rent, debt, studentLoans, dependent, education,
healthCare, vacation, wedding, charity, travel, medicalExpenses, emergency,
customExpense.

Assets (18): stock, mutualFundNonDeductible, mutualFundDeductible, crypto, house,
car, rentalProperty, commercialProperty, land, building, motorcycle, boat, jewelry,
preciousMetals, furniture, instrument, machinery, customAsset.

Liabilities (4): debt, studentLoans, medicalDebt, creditCardDebt.

## Default frequencies

`INCOME_TYPE_DEFAULT_FREQUENCY`: salary, hourlyWage, sideHustle, pensionIncome are
monthly; rsuGrant, inheritance, taxCredit, taxDeduction, customIncome are yearly.

`EXPENSE_TYPE_DEFAULT_FREQUENCY`: livingExpenses, rent, debt, studentLoans, dependent,
customExpense are monthly; education, healthCare, vacation, wedding, charity, travel,
medicalExpenses, emergency are yearly.

## Wallets (WALLET_IDS in this exact order)

1. emergency, "Emergency fund" / "เงินสำรองฉุกเฉิน", defaultRate 0.015,
   monthsOfExpenses 6.
2. goal, "Goal savings" / "เงินออมเป้าหมาย", defaultRate 0.015.
3. nontax, "Investments (non-tax)" / "การลงทุน (เงินถูกภาษี)", defaultRate 0.07
   ("S&P 500 long-run average, editable").
4. taxAdvantaged, "ThaiESG / RMF", defaultRate 0.07. Note records the caps:
   ThaiESG cap 200k (min 100k year one), RMF <= 30% of income, combined 500k.

## defaultPlanInput(now) numbers

Salary 100,000/month (yearly 1.2M) with override growth 3%/year until
startYear + 29; living expenses 40,000/month following inflation; retirement at
startYear + 29 with pension 40,000/month in today's money; savingsSplit
emergency 0.1, goal 0.2, nontax 0.5, taxAdvantaged 0.2; walletRates as the wallet
defaults (0.015/0.015/0.07/0.07); startingWallets emergency 100,000, nontax 300,000,
others 0; efMonths 6; insurance 25,000; personalAllowances 1; annualWithholding 0;
horizonYears 50; milestones: one "Retire" marker at (startYear + 29, January).

Derived constants used by tests: the default plan's projected years are
startYear .. startYear + 49.
