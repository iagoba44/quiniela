import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const apiCalls = [];
  page.on('response', async response => {
    if (response.url().includes('quinielista') || response.url().includes('eduardolosilla')) {
      apiCalls.push(response.url());
      if (response.url().includes('json') || response.url().includes('jornada')) {
        console.log('Intercepted:', response.url());
        try {
          const json = await response.json();
          console.log(JSON.stringify(json).substring(0, 200));
        } catch (e) {}
      }
    }
  });
  try {
    await page.goto('https://www.eduardolosilla.es/quiniela/ayudas/proximas', { waitUntil: 'networkidle' });
  } catch (e) {
    console.error(e);
  } finally {
    console.log(apiCalls.slice(0, 20));
    await browser.close();
  }
})();
