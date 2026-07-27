import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto('https://www.marca.com/apuestas-deportivas/quiniela.html', { waitUntil: 'networkidle' });
    const content = await page.evaluate(() => {
      const teams = [];
      document.querySelectorAll('tr').forEach(tr => {
         teams.push(tr.innerText.replace(/\n/g, ' '));
      });
      return teams;
    });
    console.log(content.slice(0, 30));
  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
