// Generates the sample PDF used by the upload tests.
//
// Why a script instead of a hand-written file? A valid PDF is fiddly to
// write by hand, and this way anyone can regenerate the fixture with:
//   npm run generate-fixture
// It uses pdf-lib - the same library the PDF Editor app itself uses to save.
//
// The fixture is a simple 2-page PDF:
//   Page 1: "Sample PDF - Page 1"  (big text, easy to see in screenshots)
//   Page 2: "Sample PDF - Page 2"
// Two pages matter: the navigation tests need a "next page" to go to.
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const outPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..', 'tests', 'fixtures', 'sample-2-pages.pdf',
);

const doc = await PDFDocument.create();
const font = await doc.embedFont(StandardFonts.HelveticaBold);
for (const pageNum of [1, 2]) {
  const page = doc.addPage([612, 792]); // US Letter, in points
  page.drawText(`Sample PDF - Page ${pageNum}`, {
    x: 72,
    y: 700,
    size: 28,
    font,
    color: rgb(0, 0.1, 0.3),
  });
  page.drawText('Created for Playwright tests. Do not edit by hand - regenerate with npm run generate-fixture.', {
    x: 72,
    y: 660,
    size: 11,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });
}
writeFileSync(outPath, await doc.save());
console.log('Wrote', outPath);
