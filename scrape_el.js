import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto('https://www.eduardolosilla.es/quiniela/historico', { waitUntil: 'networkidle' });
    const content = await page.evaluate(() => {
      // Find historical matches
      return document.body.innerText.substring(0, 500);
    });
    console.log(content);
  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
