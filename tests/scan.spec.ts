// scan.spec.ts - "Can I turn photos into a PDF with Scan?"
// The app's Scan button opens a hidden file input (#scanInput) that takes
// JPG / PNG / WebP images. The app builds a PDF from them, names it
// 'scanned-pages.pdf', and shows a toast like '1 scanned page ready'.
// Playwright sets the hidden input directly with setInputFiles() - the
// same trick as openPdf() - so no camera or file-picker dialog is needed.
// Fixtures are two small PNGs made for this test, not real photos.
import { test, expect } from '@playwright/test';
import { PdfEditorPage } from '../pages/PdfEditorPage';

const SCAN_1 = 'tests/fixtures/sample-scan-1.png';
const SCAN_2 = 'tests/fixtures/sample-scan-2.png';

test('scanning one image builds a 1-page PDF called scanned-pages.pdf', async ({ page }) => {
  const editor = new PdfEditorPage(page);
  await editor.goto();

  await editor.scanImages(SCAN_1);

  await expect(editor.pageIndicator).toHaveText('1 / 1');
  await expect(editor.toast).toHaveText('1 scanned page ready');
  // A scanned document is a real document: Save is now enabled.
  await expect(editor.saveButton).toBeEnabled();
});

test('scanning two images builds a 2-page PDF you can navigate', async ({ page }) => {
  const editor = new PdfEditorPage(page);
  await editor.goto();

  await editor.scanImages(SCAN_1, SCAN_2);

  await expect(editor.pageIndicator).toHaveText('1 / 2');
  await expect(editor.toast).toHaveText('2 scanned pages ready');
  await editor.nextButton.click();
  await expect(editor.pageIndicator).toHaveText('2 / 2');
});

test('saving a scanned PDF downloads scanned-pages-edited.pdf', async ({ page }) => {
  const editor = new PdfEditorPage(page);
  await editor.goto();
  await editor.scanImages(SCAN_1);

  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
  await editor.saveButton.click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('scanned-pages-edited.pdf');
  const path = await download.path();
  expect(path).toBeTruthy();
});
test('scanning three images builds a 3-page PDF', async ({ page }) => {
  const editor = new PdfEditorPage(page);
  await editor.goto();

  await editor.scanImages(SCAN_1, SCAN_2, SCAN_1);

  await expect(editor.pageIndicator).toHaveText('1 / 3');
  await expect(editor.toast).toHaveText('3 scanned pages ready');
  await editor.nextButton.click();
  await editor.nextButton.click();
  await expect(editor.pageIndicator).toHaveText('3 / 3');
});
