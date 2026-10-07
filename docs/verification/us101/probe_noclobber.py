"""US-101 no-clobber guard — IN-SESSION (SPA navigation, no reload).

Reloads re-seed the baseline plan in mock mode (nothing persists), so the
only real clobber risk is in-session: answered plan in memory + flag lost +
user reaches /welcome via client-side navigation.
"""
import re
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3002"

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()

    # 1. fresh visitor -> wizard
    page.goto(BASE + "/", wait_until="domcontentloaded")
    page.evaluate("localStorage.clear()")
    page.goto("about:blank")
    page.goto(BASE + "/", wait_until="domcontentloaded")
    page.wait_for_url("**/welcome", timeout=15000)
    page.wait_for_selector(".wizard-card", timeout=10000)
    print("1 ok: fresh visitor -> /welcome")

    # 2. answer salary 120k, finish -> dashboard with answered plan
    page.locator(".wizard-card input").nth(0).fill("120000")
    page.get_by_role("button", name=re.compile("Skip everything", re.I)).click()
    page.wait_for_timeout(800)
    page.get_by_role("button", name=re.compile("See my life plan", re.I)).click()
    page.wait_for_timeout(2000)
    assert "1,440,000" in page.inner_text("body")
    print("2 ok: answered plan on dashboard (Income 1,440,000)")

    # 3. flag lost + client-side nav to /welcome (same JS session, plan intact)
    page.evaluate("localStorage.removeItem('excited_live_onboarded')")
    page.evaluate(
        "window.history.pushState({}, '', '/welcome');"
        "window.dispatchEvent(new PopStateEvent('popstate'));"
    )
    page.wait_for_timeout(1500)
    assert page.url.endswith("/welcome"), f"nav failed: {page.url}"
    body = page.inner_text("body")
    assert "Welcome back" in body, f"expected welcome-back card, got: {body[:200]}"
    assert "Step 1" not in body and "How much do you make" not in body, "WIZARD SHOWED -> clobber risk"
    print("3 ok: in-session /welcome shows Welcome-back card (no wizard, no clobber)")
    page.screenshot(path="/tmp/us101-final/19-welcome-back-in-session.png", full_page=True)

    # 4. plan still intact on home
    page.evaluate(
        "window.history.pushState({}, '', '/');"
        "window.dispatchEvent(new PopStateEvent('popstate'));"
    )
    page.wait_for_timeout(1500)
    assert "1,440,000" in page.inner_text("body"), "plan lost"
    print("4 ok: answered plan intact on home")
    page.screenshot(path="/tmp/us101-final/20-edited-plan-dashboard.png", full_page=True)
    browser.close()
print("ALL GUARD CHECKS PASS")
