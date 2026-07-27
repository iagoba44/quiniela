import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  try {
    await page.goto('https://www.eduardolosilla.es/quiniela/ayudas/proximas', { waitUntil: 'networkidle' });
    const content = await page.evaluate(() => {
      // Find the upcoming matches
      const rows = Array.from(document.querySelectorAll('.u-table tbody tr'));
      return rows.map(r => r.innerText);
    });
    console.log(content);
  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
