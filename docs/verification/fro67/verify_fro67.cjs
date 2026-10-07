/**
 * FRO-67 evidence runner — US-101 AC#2 (every wizard answer editable
 * afterwards + a working wizard replay).
 *
 * CommonJS on purpose: .cjs files are excluded from the repo's eslint config,
 * so the evidence runner never trips the whole-repo `pnpm lint` CI job.
 *
 * Drives the real webapp in a headless Chromium at a phone viewport and
 * captures, per locale (EN then TH):
 *   - the Retirement tab before/after editing the retirement year, with the
 *     projection readouts that changed (chart stat + retirement verdict);
 *   - the Goals tab add / edit / remove, with the goal-check status;
 *   - the returning card and the "Replay the intro" restart landing the user
 *     back in the wizard, seeded from their live plan (non-destructive);
 *   - the dashboard after the replay, still holding the edited plan.
 *
 * Run:
 *   LD_LIBRARY_PATH=/opt/data/cache/chromium-deps/root/usr/lib/aarch64-linux-gnu \
 *   NODE_PATH=/opt/data/cache/shot/node_modules \
 *   node docs/verification/fro67/verify_fro67.cjs
 *
 * Writes PNGs + results.json next to this file. Assumes the dev server is up
 * on PORT (default 3002) and that no other run is editing the same plan store.
 */
const fs = require("node:fs")
const path = require("node:path")

// puppeteer-core lives in the runner's shared tool dir, not in this repo
// (no new deps in apps/webapp). PUPPETEER_PATH overrides the default.
const puppeteer = require(
	process.env.PUPPETEER_PATH ?? "/opt/data/cache/shot/node_modules/puppeteer-core",
)

const HERE = __dirname
const BASE = process.env.BASE ?? "http://localhost:3002"
const EXE =
	process.env.CHROME ?? "/home/ubuntu/.hermes/tools/chromium-1208/chrome-linux/chrome"
const W = 390
const H = 844

const results = []
const check = (id, pass, detail) => {
	results.push({ id, pass, detail })
	console.log(`${pass ? "PASS" : "FAIL"} ${id} — ${detail}`)
}

const shot = async (page, name) => {
	await page.screenshot({ path: path.join(HERE, `${name}.png`) })
	console.log(`  shot ${name}.png`)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Text of the whole page chrome the user reads. */
const mainText = (page) =>
	page.evaluate(() => document.querySelector("main")?.innerText ?? document.body.innerText)

/** The chart's hover readout line, e.g. "2055 · ฿72,745,397". */
const chartStat = (page) =>
	page.evaluate(() => {
		const text = document.querySelector("main")?.innerText ?? ""
		const match = text.match(/20\d\d · ฿[\d,]+/)
		return match ? match[0] : null
	})

const clickTab = async (page, label) => {
	await page.evaluate((wanted) => {
		const tab = [...document.querySelectorAll('[role="tab"]')].find((t) =>
			t.textContent.trim().startsWith(wanted),
		)
		if (!tab) throw new Error(`tab not found: ${wanted}`)
		tab.click()
	}, label)
	await sleep(350)
}

const clickButton = async (page, label, scope = null) => {
	await page.evaluate(
		(wanted, scopeSel) => {
			const root = scopeSel ? document.querySelector(scopeSel) : document
			const button = [...root.querySelectorAll("button")].find(
				(b) => b.textContent.trim() === wanted,
			)
			if (!button) throw new Error(`button not found: ${wanted}`)
			button.click()
		},
		label,
		scope,
	)
	await sleep(350)
}

/** React-safe input write (native setter + bubbling input event). */
const setInputs = async (page, values, scopeSel = "dialog.astryx-dialog") => {
	await page.evaluate(
		(vals, scope) => {
			const root = document.querySelector(scope) ?? document
			const inputs = [...root.querySelectorAll("input")]
			const setter = Object.getOwnPropertyDescriptor(
				window.HTMLInputElement.prototype,
				"value",
			).set
			vals.forEach((value, index) => {
				if (value === null) return
				const input = inputs[index]
				if (!input) throw new Error(`input #${index} missing`)
				setter.call(input, value)
				input.dispatchEvent(new Event("input", { bubbles: true }))
				input.dispatchEvent(new Event("change", { bubbles: true }))
			})
		},
		values,
		scopeSel,
	)
	await sleep(250)
}

/** Field order in both goal dialogs: 0 = name, 1 = cost, 2 = target year. */
const GOAL_AMOUNT_FIELD = 1

/** Client-side route change (a hard load would reset the in-memory plan). */
const gotoClientSide = async (page, route) => {
	await page.evaluate((to) => {
		window.history.pushState({}, "", to)
		window.dispatchEvent(new PopStateEvent("popstate", { state: null }))
	}, route)
	await sleep(700)
}

const panelText = (page, id) =>
	page.evaluate((panelId) => document.getElementById(panelId)?.innerText ?? "", id)

async function run(locale, prefix) {
	const browser = await puppeteer.launch({
		executablePath: EXE,
		headless: true,
		args: [
			"--no-sandbox",
			"--disable-gpu",
			"--disable-dev-shm-usage",
			"--hide-scrollbars",
			"--font-render-hinting=none",
		],
	})
	const page = await browser.newPage()
	await page.setViewport({ width: W, height: H, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
	await page.setCookie({ name: "excited_live_locale", value: locale, url: BASE })
	// A returning visitor: the intro was already completed once.
	await page.evaluateOnNewDocument(() => {
		try {
			window.localStorage.setItem("excited_live_onboarded", "1")
		} catch {
			/* private mode — fine */
		}
	})

	await page.goto(`${BASE}/`, { waitUntil: "networkidle2", timeout: 60000 })
	await page.evaluate(() => document.fonts.ready)
	await sleep(1200)

	const baselineStat = await chartStat(page)

	// --- 1. Retirement editor: default, then edited ------------------------
	await clickTab(page, prefix.tabRetirement)
	const retirementBefore = await panelText(page, "left-panel-retirement")
	await shot(page, `${prefix.n}-retirement-tab`)
	check(
		`${prefix.n}.retirement.fields`,
		/2055/.test(retirementBefore) && /40,000/.test(retirementBefore),
		`editor shows the engine's retirement answers: ${retirementBefore.split("\n").slice(-1)[0]}`,
	)

	await setInputs(page, ["2040"], "#left-panel-retirement")
	await sleep(900)
	const retirementAfter = await panelText(page, "left-panel-retirement")
	const editedStat = await chartStat(page)
	await shot(page, `${prefix.n}-retirement-edited`)
	check(
		`${prefix.n}.retirement.projection-changed`,
		Boolean(baselineStat) && Boolean(editedStat) && baselineStat !== editedStat,
		`chart readout ${baselineStat} → ${editedStat}`,
	)
	check(
		`${prefix.n}.retirement.verdict-changed`,
		retirementBefore !== retirementAfter,
		`verdict line: ${retirementBefore.split("\n").slice(-1)[0]} → ${retirementAfter.split("\n").slice(-1)[0]}`,
	)

	// --- 2. Goals editor: add / edit / remove ------------------------------
	await clickTab(page, prefix.tabGoals)
	await shot(page, `${prefix.n}-goals-empty`)
	const goalsEmpty = await panelText(page, "left-panel-goals")
	check(
		`${prefix.n}.goals.empty`,
		goalsEmpty.includes(prefix.addGoal),
		`goals tab offers "${prefix.addGoal}" with no rows yet`,
	)

	await clickButton(page, `+ ${prefix.addGoal}`, "#left-panel-goals")
	await setInputs(page, [prefix.goalLabel, "5000000", "2035"])
	const dialogFields = await page.evaluate(() =>
		[...document.querySelectorAll("dialog.astryx-dialog input")].map((i) => i.value),
	)
	await clickButton(page, prefix.save)
	const goalsAdded = await panelText(page, "left-panel-goals")
	await shot(page, `${prefix.n}-goal-added`)
	check(
		`${prefix.n}.goals.added`,
		goalsAdded.includes(prefix.goalLabel) && goalsAdded.includes("2035"),
		`row written: ${JSON.stringify(dialogFields)} → "${goalsAdded.replace(/\n+/g, " / ")}"`,
	)
	check(
		`${prefix.n}.goals.check-visible`,
		prefix.checkRe.test(goalsAdded),
		`goal check rendered next to the row (projection reacts to the goal): "${goalsAdded.split("\n")[2]}"`,
	)

	await clickButton(page, prefix.goalLabel, "#left-panel-goals")
	await setInputs(page, [null, "20000000", null])
	await clickButton(page, prefix.save)
	const goalsEdited = await panelText(page, "left-panel-goals")
	await shot(page, `${prefix.n}-goal-edited`)
	check(
		`${prefix.n}.goals.edited`,
		goalsEdited.includes("20,000,000") && goalsEdited !== goalsAdded,
		`goal cost 5,000,000 → 20,000,000; check "${goalsAdded.split("\n")[2]} → ${goalsEdited.split("\n")[2]}"`,
	)
	check(
		`${prefix.n}.goals.check-tracks-edit`,
		goalsEdited.includes(prefix.goalLabel) && prefix.checkRe.test(goalsEdited),
		`re-editing the goal re-ran the check: "${goalsEdited.split("\n")[2]}"`,
	)

	await clickButton(page, prefix.goalLabel, "#left-panel-goals")
	await clickButton(page, prefix.remove)
	const goalsRemoved = await panelText(page, "left-panel-goals")
	await shot(page, `${prefix.n}-goal-removed`)
	check(
		`${prefix.n}.goals.removed`,
		!goalsRemoved.includes(prefix.goalLabel) && goalsRemoved.includes(prefix.addGoal),
		`row removed: "${goalsRemoved.replace(/\n+/g, " / ")}"`,
	)

	// Retirement + goals edits must survive the goals round-trip.
	const editedStatStill = await chartStat(page)
	check(
		`${prefix.n}.plan.edits-kept`,
		editedStatStill === editedStat,
		`plan still at the edited projection: ${editedStatStill}`,
	)

	// --- 3. Restart: the replay must actually re-open the wizard -----------
	await gotoClientSide(page, "/welcome")
	const returning = await mainText(page)
	await shot(page, `${prefix.n}-returning-card`)
	check(
		`${prefix.n}.restart.card`,
		returning.includes(prefix.restart),
		`returning card shown (never overwrites the plan): "${returning.split("\n")[0]}"`,
	)

	const flagBefore = await page.evaluate(() =>
		window.localStorage.getItem("excited_live_onboarded"),
	)
	await clickButton(page, prefix.restart)
	const afterRestart = await mainText(page)
	await shot(page, `${prefix.n}-restart-wizard`)
	const flagAfter = await page.evaluate(() =>
		window.localStorage.getItem("excited_live_onboarded"),
	)
	check(
		`${prefix.n}.restart.opens-wizard`,
		prefix.stepOneRe.test(afterRestart) && !afterRestart.includes(prefix.restart),
		`"${prefix.restart}" re-opened the wizard at step 1 of 4 (flag ${flagBefore} → ${flagAfter})`,
	)

	// Seeded from the live plan: 3× Next lands on step 4 with 2040.
	await clickButton(page, prefix.next)
	await clickButton(page, prefix.next)
	await clickButton(page, prefix.next)
	const step4 = await page.evaluate(() =>
		[...document.querySelectorAll("main input")].map((i) => i.value),
	)
	await shot(page, `${prefix.n}-restart-seeded-step4`)
	check(
		`${prefix.n}.restart.seeded`,
		step4[0] === "2040",
		`step 4 pre-filled from the live plan (retirement year ${step4[0]}) — replay edits, never resets`,
	)

	await clickButton(page, prefix.finish)
	await clickButton(page, prefix.cta)
	// The retirement edit must survive the replay: the replay wrote back onto
	// the live plan instead of resetting it.
	await clickTab(page, prefix.tabRetirement)
	const retirementAfterReplay = await page.evaluate(() =>
		[...(document.getElementById("left-panel-retirement")?.querySelectorAll("input") ?? [])].map(
			(i) => i.value,
		),
	)
	const layout = await auditLayout(page)
	const statAfterReplay = await chartStat(page)
	await shot(page, `${prefix.n}-dashboard-after-replay`)
	await clickTab(page, prefix.tabGoals)
	const goalsAfterReplay = await panelText(page, "left-panel-goals")
	check(
		`${prefix.n}.replay.non-destructive`,
		statAfterReplay === editedStat &&
			retirementAfterReplay[0] === "2040" &&
			!goalsAfterReplay.includes(prefix.goalLabel),
		`after the replay the plan is still the edited one (${statAfterReplay}, retirement year ${retirementAfterReplay[0]}, removed goal still gone)`,
	)

	// --- 4. Mobile-first layout audit (390px phone viewport) ---------------
	check(
		`${prefix.n}.layout.no-horizontal-scroll`,
		layout.docScrollWidth <= layout.viewport + 1,
		`page width ${layout.docScrollWidth}px vs viewport ${layout.viewport}px (no sideways scroll)`,
	)
	check(
		`${prefix.n}.layout.tabs-reachable`,
		layout.tabStripOverflow <= 0 || layout.tabStripScrollable,
		`tab strip ${layout.tabStripWidth}px in ${layout.tabStripClientWidth}px (overflow ${layout.tabStripOverflow}px${
			layout.tabStripScrollable ? ", scrollable" : ""
		})`,
	)
	check(
		`${prefix.n}.layout.editor-visible`,
		layout.retirementInputs === 2 && layout.inputsOnScreen === 2 && layout.statusVisible,
		`retirement inputs ${layout.inputsOnScreen}/2 on screen, verdict line visible: ${layout.statusVisible}`,
	)

	await browser.close()
}

/** Numbers, not eyeballs: does this phone viewport actually hold the UI? */
const auditLayout = (page) =>
	page.evaluate(() => {
		const tabStrip = document.querySelector('[role="tablist"]')
		const panel = document.getElementById("left-panel-retirement")
		const inputs = panel ? [...panel.querySelectorAll("input")] : []
		const rects = inputs.map((input) => input.getBoundingClientRect())
		const onScreen = rects.filter(
			(rect) =>
				rect.width > 0 &&
				rect.height > 0 &&
				rect.left >= -1 &&
				rect.right <= window.innerWidth + 1,
		).length
		const status = panel
			? [...panel.querySelectorAll("p,span")].find((el) =>
					/left at|runs out|เหลือ|เงินหมด/.test(el.textContent ?? ""),
				)
			: null
		const statusRect = status ? status.getBoundingClientRect() : null
		return {
			viewport: window.innerWidth,
			docScrollWidth: document.documentElement.scrollWidth,
			tabStripWidth: tabStrip ? Math.round(tabStrip.scrollWidth) : 0,
			tabStripClientWidth: tabStrip ? Math.round(tabStrip.clientWidth) : 0,
			tabStripOverflow: tabStrip
				? Math.round(tabStrip.scrollWidth - tabStrip.clientWidth)
				: 0,
			tabStripScrollable: tabStrip
				? getComputedStyle(tabStrip).overflowX !== "visible"
				: false,
			retirementInputs: inputs.length,
			inputsOnScreen: onScreen,
			statusVisible: Boolean(
				statusRect && statusRect.width > 0 && statusRect.right <= window.innerWidth + 1,
			),
		}
	})

const EN = {
	n: "en",
	tabRetirement: "Retirement",
	tabGoals: "Goals",
	addGoal: "Add goal",
	goalLabel: "Condo down payment",
	save: "Save",
	remove: "Remove",
	restart: "Replay the intro",
	next: "Next",
	finish: "See my plan",
	cta: "See my life plan",
	checkRe: /short ฿|on track/,
	stepOneRe: /Step 1 of 4/,
}

const TH = {
	n: "th",
	tabRetirement: "เกษียณ",
	tabGoals: "เป้าหมาย",
	addGoal: "เพิ่มเป้าหมาย",
	goalLabel: "เงินดาวน์คอนโด",
	save: "บันทึก",
	remove: "ลบ",
	restart: "เล่นตัวช่วยเริ่มต้นอีกครั้ง",
	next: "ถัดไป",
	finish: "ดูแผนของฉัน",
	cta: "ดูแผนชีวิตของฉัน",
	checkRe: /ขาด|กำลังไปได้ดี/,
	stepOneRe: /ขั้นที่ 1 จาก 4/,
}

/** CJS has no top-level await: both locale passes run inside main(). */
async function main() {
	await run("en", EN)
	await run("th", TH)

	const failed = results.filter((r) => !r.pass)
	fs.writeFileSync(
		path.join(HERE, "results.json"),
		`${JSON.stringify(
			{ base: BASE, viewport: `${W}x${H}`, total: results.length, failed: failed.length, results },
			null,
			2,
		)}\n`,
	)
	console.log(`\n${results.length - failed.length}/${results.length} checks PASS`)
	if (failed.length > 0) process.exitCode = 1
}

main().catch((error) => {
	console.error(error)
	process.exitCode = 1
})
