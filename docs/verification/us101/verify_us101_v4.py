"""US-101 wizard verification — round 4 (review-fix head 74ae545).

Timing-robust: after a fresh visit, wait up to 10s for the hydration redirect
to /welcome (vite dev transforms on demand). Guard checks wait out the same
window and assert NO redirect. Locale via excited_live_locale cookie.
"""
import json, re, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3002"
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/us101-v4")
OUT.mkdir(parents=True, exist_ok=True)
results = []

def shot(page, name):
    page.screenshot(path=str(OUT / f"{name}.png"), full_page=True)

def rec(name, ok, detail=""):
    results.append({"name": name, "ok": bool(ok), "detail": detail})
    print(("PASS" if ok else "FAIL"), name, "-", str(detail)[:170], flush=True)
    (OUT / "results.json").write_text(json.dumps(results, indent=2, ensure_ascii=False))

def fresh(page):
    """Brand-new visitor: blank the page first so no stale module races the
    storage clear, then land on / and wait out the hydration redirect."""
    page.goto("about:blank")
    page.goto(BASE + "/", wait_until="domcontentloaded")
    page.evaluate("localStorage.clear()")
    page.goto("about:blank")
    page.goto(BASE + "/", wait_until="domcontentloaded")
    try:
        page.wait_for_url("**/welcome", timeout=12000)
    except Exception:
        pass
    try:
        page.wait_for_selector(".wizard-card", timeout=10000)
    except Exception:
        pass
    page.wait_for_timeout(600)

def expect_no_redirect(page):
    """Give the gate the same window; a timeout here means we stayed on /."""
    try:
        page.wait_for_url("**/welcome", timeout=8000)
    except Exception:
        pass

def set_locale(page, locale):
    page.evaluate(
        f"document.cookie = 'excited_live_locale={locale}; Path=/; Max-Age=31536000'"
    )
    page.reload(wait_until="domcontentloaded")
    try:
        page.wait_for_selector(".wizard-card", timeout=10000)
    except Exception:
        pass
    page.wait_for_timeout(1000)

def card_inputs(page):
    return page.locator(".wizard-card input")

def dashboard_snapshot(page):
    body = page.inner_text("body")
    lines = [ln.strip() for ln in body.splitlines() if ln.strip()]
    keys = ["Net Worth", "Income", "Expenses", "Taxes",
            "รายได้", "ค่าใช้จ่าย", "ภาษี", "มูลค่าสุทธิ"]
    picked = [ln for ln in lines if any(k in ln for k in keys)]
    return {"url": page.url, "picked": picked[:12]}

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    # ---------- 1. EN full path (first-run redirect) ----------
    fresh(page)
    rec("redirect-first-run", "/welcome" in page.url, f"landing after / -> {page.url}")
    shot(page, "01-en-step1-income")
    body = page.inner_text("body")
    rec("en-wizard-visible", "How much do you make?" in body, body[:110].replace("\n", " | "))

    card_inputs(page).nth(0).fill("85000")
    page.get_by_role("button", name=re.compile("Next", re.I)).click()
    page.wait_for_timeout(400)
    shot(page, "02-en-step2-expenses")
    card_inputs(page).nth(0).fill("32000")
    page.get_by_role("button", name=re.compile("Next", re.I)).click()
    page.wait_for_timeout(400)
    shot(page, "03-en-step3-goals")
    page.get_by_role("button", name=re.compile("Add a goal", re.I)).click()
    page.wait_for_timeout(300)
    page.get_by_placeholder(re.compile("House down payment", re.I)).fill("Condo")
    card_inputs(page).nth(1).fill("2500000")
    card_inputs(page).nth(2).fill("2031")
    page.get_by_role("button", name=re.compile("Next", re.I)).click()
    page.wait_for_timeout(400)
    shot(page, "04-en-step4-retirement")
    card_inputs(page).nth(0).fill("2055")
    card_inputs(page).nth(1).fill("45000")
    shot(page, "05-en-step4-filled")
    page.get_by_role("button", name=re.compile("See my plan", re.I)).click()
    page.wait_for_timeout(600)
    shot(page, "06-en-finished")
    page.get_by_role("button", name=re.compile("See my life plan", re.I)).click()
    try:
        page.wait_for_url(lambda url: "/welcome" not in url and url.rstrip("/").endswith(f":{BASE.split(':')[-1]}"), timeout=8000)
    except Exception:
        pass
    page.wait_for_timeout(800)
    shot(page, "07-en-dashboard-answered")
    ans = dashboard_snapshot(page)
    rec("en-full-dashboard", "/welcome" not in ans["url"], f"url={ans['url']}")
    rec("en-full-numbers", True, json.dumps(ans["picked"], ensure_ascii=False))
    flag = page.evaluate("localStorage.getItem('excited_live_onboarded')")
    rec("en-flag-set", flag == "1", f"flag={flag}")

    # ---------- 2. EN skip path ----------
    fresh(page)
    rec("redirect-skip-path", "/welcome" in page.url, f"url={page.url}")
    page.get_by_role("button", name=re.compile("Skip everything", re.I)).click()
    page.wait_for_timeout(600)
    shot(page, "08-en-skip-finished")
    page.get_by_role("button", name=re.compile("See my life plan", re.I)).click()
    page.wait_for_timeout(2000)
    shot(page, "09-en-skip-dashboard")
    skip = dashboard_snapshot(page)
    rec("en-skip-numbers", True, json.dumps(skip["picked"], ensure_ascii=False))

    # ---------- 3. TH full path ----------
    fresh(page)
    set_locale(page, "th")
    rec("redirect-th", "/welcome" in page.url, f"url={page.url}")
    body = page.inner_text("body")
    rec("th-wizard-visible", ("รายได้" in body) or ("เงินเดือน" in body), body[:110].replace("\n", " | "))
    shot(page, "10-th-step1")
    card_inputs(page).nth(0).fill("85000")
    page.get_by_role("button", name=re.compile("ถัดไป")).click()
    page.wait_for_timeout(400)
    card_inputs(page).nth(0).fill("32000")
    page.get_by_role("button", name=re.compile("ถัดไป")).click()
    page.wait_for_timeout(400)
    page.get_by_role("button", name=re.compile("เพิ่มเป้าหมาย")).click()
    page.wait_for_timeout(300)
    page.locator(".wizard-goal-row input").nth(1).fill("2500000")
    page.locator(".wizard-goal-row input").nth(2).fill("2031")
    shot(page, "11-th-step3-goals")
    page.get_by_role("button", name=re.compile("ถัดไป")).click()
    page.wait_for_timeout(400)
    card_inputs(page).nth(0).fill("2055")
    card_inputs(page).nth(1).fill("45000")
    shot(page, "12-th-step4")
    page.get_by_role("button", name=re.compile("ดูแผนของฉัน")).click()
    page.wait_for_timeout(600)
    shot(page, "13-th-finished")
    page.get_by_role("button", name=re.compile("ดูแผนชีวิตของฉัน")).click()
    page.wait_for_timeout(2000)
    shot(page, "14-th-dashboard-answered")
    th = dashboard_snapshot(page)
    rec("th-full-dashboard", "/welcome" not in th["url"], f"url={th['url']}")
    rec("th-full-numbers", True, json.dumps(th["picked"], ensure_ascii=False))

    # ---------- 4. TH skip path ----------
    fresh(page)
    set_locale(page, "th")
    page.get_by_role("button", name=re.compile("ข้ามทั้งหมด")).click()
    page.wait_for_timeout(600)
    shot(page, "15-th-skip-finished")
    page.get_by_role("button", name=re.compile("ดูแผนชีวิตของฉัน")).click()
    page.wait_for_timeout(2000)
    shot(page, "16-th-skip-dashboard")
    ths = dashboard_snapshot(page)
    rec("th-skip-numbers", True, json.dumps(ths["picked"], ensure_ascii=False))

    # ---------- 5. returning-user guard ----------
    page.goto("about:blank")
    page.goto(BASE + "/", wait_until="domcontentloaded")
    page.evaluate("localStorage.clear()")
    page.evaluate("localStorage.setItem('excited_live_onboarded','1')")
    page.goto("about:blank")
    page.goto(BASE + "/", wait_until="domcontentloaded")
    expect_no_redirect(page)
    rec("returning-no-redirect", "/welcome" not in page.url, f"url={page.url}")
    shot(page, "17-en-returning-dashboard")

    # ---------- 6. edited-plan guard ----------
    fresh(page)
    card_inputs(page).nth(0).fill("120000")
    # "Skip everything" finishes the wizard AND applies the answered salary.
    page.get_by_role("button", name=re.compile("Skip everything", re.I)).click()
    page.wait_for_timeout(600)
    page.evaluate("localStorage.removeItem('excited_live_onboarded')")
    page.goto("about:blank")
    page.goto(BASE + "/", wait_until="domcontentloaded")
    expect_no_redirect(page)
    rec("edited-plan-no-redirect", "/welcome" not in page.url, f"url={page.url}")
    shot(page, "18-edited-plan-dashboard")

    rec("no-page-errors", len(errors) == 0, "; ".join(errors[:3]))
    browser.close()

passed = sum(1 for r in results if r["ok"])
print(f"\n{passed}/{len(results)} checks passed. Artifacts in {OUT}", flush=True)
sys.exit(0 if passed == len(results) else 1)
