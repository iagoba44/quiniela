import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto('https://www.eduardolosilla.es/quiniela', { waitUntil: 'networkidle' });
    const content = await page.evaluate(() => {
      // Dump all divs that have a hyphen to find matches
      const elements = Array.from(document.querySelectorAll('div, span, td'));
      return elements.map(e => e.innerText).filter(t => t && t.includes('-')).slice(0, 50);
    });
    console.log(content.slice(0, 10));
  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
