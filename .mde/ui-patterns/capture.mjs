import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlFile = path.join(__dirname, 'patterns-preview.html');

const patterns = [
  'stat-cards',
  'tabs-layout',
  'detail-page',
  'approval-queue',
  'audit-trail',
  'status-stepper',
  'form-page',
  'confirmation-dialog',
  'notification-toast',
  'search-results',
  'breadcrumb-nav',
  'split-master-detail',
];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(`file:///${htmlFile.replace(/\\/g, '/')}`);

for (const id of patterns) {
  const el = page.locator(`#${id}`);
  await el.screenshot({ path: path.join(__dirname, `${id}.png`) });
  console.log(`  captured ${id}.png`);
}

await browser.close();
console.log('Done.');
