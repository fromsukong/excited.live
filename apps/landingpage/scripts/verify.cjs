/* Visual verification for the excited.live landing page. */
const puppeteer = require('puppeteer-core');

const EXE = '/opt/hermes/.playwright/chromium_headless_shell-1234/chrome-linux/headless_shell';
const BASE = 'http://localhost:4321';

async function safe(name, fn) {
  try {
    return await fn();
  } catch (e) {
    console.log(`STEP_FAIL ${name}: ${e.message}`);
    return null;
  }
}

(async () => {
  const b = await puppeteer.launch({
    executablePath: EXE,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const p = await b.newPage();
  p.setDefaultTimeout(15000);
  p.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  p.on('console', (m) => {
    if (m.type() === 'error') console.log('CONSOLE_ERROR:', m.text().slice(0, 200));
  });

  // ---------- Desktop landing ----------
  await p.setViewport({ width: 1440, height: 1200, deviceScaleFactor: 1 });
  await safe('goto-landing', () => p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 }));
  await new Promise((r) => setTimeout(r, 2000));

  await safe('styles', () =>
    p.evaluate(() => {
      const cs = getComputedStyle(document.body);
      const h1 = document.querySelector('.hero h1');
      const btn = document.querySelector('.waitlist-row .btn-ink');
      return {
        bodyBg: cs.backgroundColor,
        bodyFont: cs.fontFamily.slice(0, 60),
        h1Size: h1 && getComputedStyle(h1).fontSize,
        btnRadius: btn && getComputedStyle(btn).borderRadius,
        langEn: document.documentElement.dataset.lang,
      };
    }).then((r) => console.log('STYLES', JSON.stringify(r))),
  );

  await safe('shot-desktop', () => p.screenshot({ path: '/tmp/shot/landing-desktop.png', fullPage: true }));

  // ---------- TH toggle ----------
  await safe('click-th', () => p.click('.nav-actions [data-set-lang="th"]'));
  await new Promise((r) => setTimeout(r, 800));
  await safe('th-state', () =>
    p.evaluate(() => ({
      lang: document.documentElement.dataset.lang,
      stored: localStorage.getItem('exl-lang'),
      heroVisible: !!document.querySelector('.hero h1 [data-lang-th]'),
      enHidden: getComputedStyle(document.querySelector('.hero h1 [data-lang-en]')).display === 'none',
    })).then((r) => console.log('TH_STATE', JSON.stringify(r))),
  );
  await safe('shot-th', () => p.screenshot({ path: '/tmp/shot/landing-th.png', fullPage: true }));

  // ---------- Form interaction: invalid then valid ----------
  await safe('click-en', () => p.click('.nav-actions [data-set-lang="en"]'));
  await new Promise((r) => setTimeout(r, 400));
  await safe('type-invalid', async () => {
    await p.click('.waitlist-row input[name="email"]');
    await p.type('.waitlist-row input[name="email"]', 'not-an-email');
    await p.click('.waitlist-row .btn-ink');
    await new Promise((r) => setTimeout(r, 500));
    const err = await p.evaluate(() => document.querySelector('.waitlist-error')?.textContent || 'NO_ERROR_SHOWN');
    console.log('INVALID_MSG:', err.trim().slice(0, 80));
  });
  await safe('type-valid', async () => {
    await p.click('.waitlist-row input[name="email"]');
    await p.keyboard.down('Control');
    await p.keyboard.press('KeyA');
    await p.keyboard.up('Control');
    await p.type('.waitlist-row input[name="email"]', 'verify@test.dev');
    await p.click('.waitlist-row .btn-ink');
    await new Promise((r) => setTimeout(r, 4000)); // webhook will fail (inactive) -> fallback path
    const state = await p.evaluate(() => ({
      success: !!document.querySelector('.waitlist-success'),
      error: !!document.querySelector('.waitlist-error'),
      localSaved: localStorage.getItem('exl-waitlist-local'),
    }));
    console.log('FORM_RESULT', JSON.stringify(state));
  });
  await safe('shot-form-error', () => p.screenshot({ path: '/tmp/shot/landing-form.png', fullPage: false }));

  // ---------- Mobile ----------
  const pm = await b.newPage();
  pm.setDefaultTimeout(15000);
  await pm.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await safe('goto-mobile', () => pm.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 }));
  await new Promise((r) => setTimeout(r, 1500));
  await safe('mobile-overflow', () =>
    pm.evaluate(() => ({ sw: document.body.scrollWidth, vw: window.innerWidth })).then((r) =>
      console.log('MOBILE_OVERFLOW', JSON.stringify(r)),
    ),
  );
  await safe('shot-mobile', () => pm.screenshot({ path: '/tmp/shot/landing-mobile.png', fullPage: true }));

  // ---------- Docs page ----------
  await safe('goto-docs', () => p.goto(BASE + '/docs/privacy', { waitUntil: 'domcontentloaded', timeout: 30000 }));
  await new Promise((r) => setTimeout(r, 2500));
  await safe('docs-state', () =>
    p.evaluate(() => ({
      hasSidebar: !!document.querySelector('[class*="sidebar"]'),
      title: document.querySelector('h1')?.textContent,
      bg: getComputedStyle(document.body).backgroundColor,
    })).then((r) => console.log('DOCS_STATE', JSON.stringify(r))),
  );
  await safe('shot-docs', () => p.screenshot({ path: '/tmp/shot/docs-privacy.png', fullPage: false }));

  await b.close();
  console.log('DONE');
})();
