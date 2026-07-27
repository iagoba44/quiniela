import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto('https://www.eduardolosilla.es/quiniela', { waitUntil: 'networkidle' });
    const content = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.partido, tr, .u-table'));
      return rows.map(r => r.innerText.replace(/\n/g, ' ')).filter(text => text.includes('-') || text.includes('vs'));
    });
    console.log(content.slice(0, 20));
  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
