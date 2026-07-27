import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto('https://www.eduardolosilla.es/quiniela/historico', { waitUntil: 'networkidle' });
    const content = await page.evaluate(() => {
      // Find historical matches
      const rows = Array.from(document.querySelectorAll('tr'));
      return rows.map(r => r.innerText.replace(/\n/g, ' ')).filter(r => r.length > 5);
    });
    console.log(content.slice(0, 30));
  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
