import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  try {
    await page.goto('https://www.loteriasyapuestas.es/es/la-quiniela', { waitUntil: 'domcontentloaded' });
    const content = await page.evaluate(() => document.body.innerText);
    console.log(content.substring(0, 300));
  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
