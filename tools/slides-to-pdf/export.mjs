#!/usr/bin/env node
/*
 * slides-to-pdf
 *
 * Exports every reveal.js deck in slides/<deck>/index.html to
 * slides/pdf/<deck>.pdf using a headless Chromium-based browser
 * (Chrome, Edge or Chromium already installed on the machine).
 *
 * Usage (from this folder):
 *   npm install
 *   npm run export                 # all decks
 *   npm run export -- p20 e1       # only decks whose name contains "p20" or "e1"
 *
 * Options (environment variables):
 *   CHROME_PATH   Path to the browser executable (auto-detected otherwise).
 *   SEPARATE_FRAGMENTS=1   One PDF page per fragment step instead of one per slide.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const SLIDES_DIR = path.join(REPO, 'slides');
const OUT_DIR = path.join(SLIDES_DIR, 'pdf');
const WIDTH = 1280;   // must match Reveal.initialize({ width, height })
const HEIGHT = 720;
const SEPARATE = process.env.SEPARATE_FRAGMENTS === '1';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2'
};

function findBrowser() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'
  ];
  const found = candidates.find(p => fs.existsSync(p));
  if (!found) throw new Error('No Chrome/Edge/Chromium found. Set CHROME_PATH.');
  return found;
}

/* Minimal static server rooted at the repo, so relative paths and CDN
   assets behave exactly as they do on GitHub Pages. */
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(REPO, urlPath);
    if (!file.startsWith(REPO)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function listDecks(filters) {
  return fs.readdirSync(SLIDES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && fs.existsSync(path.join(SLIDES_DIR, d.name, 'index.html')))
    .map(d => d.name)
    .filter(name => filters.length === 0 || filters.some(f => name.toLowerCase().includes(f.toLowerCase())))
    .sort();
}

async function exportDeck(browser, baseUrl, deck) {
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT });
  const query = `print-pdf${SEPARATE ? '' : '&pdfSeparateFragments=false'}`;
  await page.goto(`${baseUrl}/slides/${deck}/index.html?${query}`, { waitUntil: 'networkidle0', timeout: 120000 });

  // Wait for reveal.js to finish laying out the print view.
  await page.waitForFunction(
    () => window.Reveal && Reveal.isReady() && document.querySelector('.pdf-page'),
    { timeout: 60000 }
  );
  await page.evaluate(() => document.fonts.ready);

  if (!SEPARATE) {
    // SVG step animations (.anim-step) follow the current slide's fragments,
    // which never happens in print mode. Show each diagram in its final state.
    await page.evaluate(() => {
      document.querySelectorAll('.reveal .slides section').forEach(slide => {
        const total = slide.querySelectorAll('.fragment').length;
        slide.querySelectorAll('.anim-step').forEach(el => {
          const on = Number(el.dataset.step) <= total;
          const off = el.dataset.stepOff !== undefined && Number(el.dataset.stepOff) <= total;
          el.classList.toggle('on', on && !off);
        });
      });
    });
  }
  // Let transitions/opacity animations settle.
  await new Promise(r => setTimeout(r, 1500));

  const out = path.join(OUT_DIR, `${deck}.pdf`);
  await page.pdf({
    path: out,
    width: `${WIDTH}px`,
    height: `${HEIGHT}px`,
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });
  const pages = await page.evaluate(() => document.querySelectorAll('.pdf-page').length);
  await page.close();
  return { out, pages };
}

async function main() {
  const decks = listDecks(process.argv.slice(2));
  if (decks.length === 0) { console.error('No decks matched.'); process.exit(1); }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const server = await startServer();
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const browser = await puppeteer.launch({ executablePath: findBrowser(), headless: true, args: ['--no-sandbox'] });

  let failed = 0;
  try {
    for (const deck of decks) {
      process.stdout.write(`- ${deck} ... `);
      try {
        const { out, pages } = await exportDeck(browser, baseUrl, deck);
        console.log(`${pages} pages -> ${path.relative(REPO, out)}`);
      } catch (e) {
        failed++;
        console.log(`FAILED: ${e.message}`);
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  process.exit(failed ? 1 : 0);
}

main();
