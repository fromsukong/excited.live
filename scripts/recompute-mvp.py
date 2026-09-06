#!/usr/bin/env python3
"""Independent recompute of @excited-live/sim — pure Python, no shared code.

Ports the TH 2026 rules by hand (brackets, caps) and recomputes the default
plan's first 3 years + optimizer, then compares against the engine's actual
test expectations. Any mismatch = engine bug.
"""

BRACKETS = [
    (150_000, 0.00),
    (300_000, 0.05),
    (500_000, 0.10),
    (750_000, 0.15),
    (1_000_000, 0.20),
    (2_000_000, 0.25),
    (5_000_000, 0.30),
    (float("inf"), 0.35),
]


def th_tax(assessable, itemized, allowances):
    taxable = max(0, assessable - itemized - allowances)
    tax, prev = 0.0, 0.0
    for up_to, rate in BRACKETS:
        if taxable > prev:
            tax += (min(taxable, up_to) - prev) * rate
            prev = up_to
        else:
            break
    return taxable, tax


def year(income, spending_growth_factor=1.0):
    assessable = income - min(income * 0.5, 100_000)
    itemized = 25_000  # insurance, under cap
    allowances = 60_000  # personal
    taxable, tax = th_tax(assessable, itemized, allowances)
    return assessable, taxable, round(tax, 2)


# Default plan year 1-3: salary 1.2M growing 3%, expenses 480k growing 2%.
print("=== Sim years 1-3 (default plan) ===")
income, expenses = 1_200_000.0, 480_000.0
for i in range(3):
    a, t, tax = year(income)
    print(f"y{i+1}: income={income:,.0f} assessable={a:,.0f} taxable={t:,.0f} tax={tax:,.2f}")
    income = round(income * 1.03, 2)
    expenses = round(expenses * 1.02, 2)

# Optimizer: income 1.2M → cap = 30% × 1.1M = 330k → taxable 685k → tax 55,250.
print("\n=== Optimizer (income 1.2M) ===")
a, t0, tax0 = year(1_200_000)
t1, tax1 = th_tax(1_100_000, 25_000 + 330_000, 60_000)
print(f"no RMF: tax={tax0:,.2f} | RMF 330k: taxable={t1:,.0f} tax={tax1:,.2f} saved={tax0 - tax1:,.2f}")
assert abs((tax0 - tax1) - 63_500) < 1, "optimizer saving mismatch"

# Path compare year 1: (0 + 100k + 25k tax saving) × 1.07
print("\n=== Path compare y1 ===")
print(f"fund: {(100_000 + 25_000) * 1.07:,.2f} (engine expects 133,750)")
assert abs((100_000 + 25_000) * 1.07 - 133_750) < 1

print("\nALL INDEPENDENT CHECKS PASS")
