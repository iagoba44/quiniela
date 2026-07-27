import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto('https://www.eduardolosilla.es/quiniela/ayudas/proximas', { waitUntil: 'networkidle' });
    const content = await page.evaluate(() => {
      return document.querySelector('app-root, body').innerText.split('\n').filter(l => l.trim().length > 3).slice(0, 100);
    });
    console.log(content);
  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
