// Tiny static file server for the PDF Editor app under test.
//
// It serves the app/ folder inside this repo on port 4173 - that folder
// holds Patrick's exported app (pdf-editor.html), the vendored libraries
// (vendor/), and the generated test copy (pdf-editor.local.html, built by
// scripts/prepare-app.mjs). This server uses only Node's built-in `http`
// module - no extra dependency.
//
// Playwright starts it automatically via `webServer` in
// playwright.config.ts, so you normally never run this file by hand.
// To try it manually:
//   npm run serve
// then open http://localhost:4173/pdf-editor.local.html in your browser.
import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', 'app');
const PORT = Number(process.env.PORT ?? 4173);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const filePath = join(root, urlPath === '/' ? 'pdf-editor.local.html' : urlPath);
  if (!filePath.startsWith(root) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found: ' + urlPath);
    return;
  }
  res.writeHead(200, { 'content-type': mime[extname(filePath)] ?? 'application/octet-stream' });
  createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`PDF Editor test server: http://localhost:${PORT}/pdf-editor.local.html`);
  console.log(`Serving files from: ${root}`);
});
