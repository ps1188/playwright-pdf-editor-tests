// Builds the testable copy of the PDF Editor app.
//
// The app normally loads pdf.js and pdf-lib from a CDN (cdnjs). That is
// fine in a browser, but it makes tests depend on the network - and in
// this VM, headless Chromium cannot reach the internet through the egress
// proxy at all (curl works, Chromium's CONNECT tunnel fails), so the PDF
// would never load and every upload test would fail.
//
// Fix: vendor the libraries. The three files in app/vendor/ are the exact
// same versions the app already uses (pdf.js 3.11.174, pdf-lib 1.17.1),
// downloaded once with curl. This script copies Patrick's real export and
// rewrites only the three CDN URLs to those local files:
//
//   pdf.min.js        -> vendor/pdf.min.js
//   pdf.worker.min.js -> vendor/pdf.worker.min.js
//   pdf-lib.min.js    -> vendor/pdf-lib.min.js
//
// The app's own code is NOT changed - only where it loads its libraries
// from. The output is app/pdf-editor.local.html, which is what the tests
// open. Run it with:
//   node scripts/prepare-app.mjs
// (Playwright runs it automatically before starting the server.)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '..');

// Source: Patrick's real export, if it sits next to this project...
const localExport = resolve(projectRoot, '..', 'your_files', 'pdf-editor', 'pdf-editor.html');
// ...otherwise the pristine copy bundled in this repo.
const bundledCopy = join(projectRoot, 'app', 'pdf-editor.html');
const source = existsSync(localExport) ? localExport : bundledCopy;

const out = join(projectRoot, 'app', 'pdf-editor.local.html');

let html = readFileSync(source, 'utf8');
const replacements = [
  ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'vendor/pdf.min.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js', 'vendor/pdf.worker.min.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js', 'vendor/pdf-lib.min.js'],
];
for (const [from, to] of replacements) {
  if (!html.includes(from)) throw new Error(`Expected CDN URL not found in source HTML: ${from}`);
  html = html.replaceAll(from, to);
}
writeFileSync(out, html);
console.log(`Built ${out} from ${source}`);
