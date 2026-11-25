// save-and-export.spec.ts - "Can I save the edited PDF?"
// The app's Save button downloads a file named "<original>-edited.pdf"
// (see cleanName() in pdf-editor.html). Playwright captures the download
// event instead of letting the browser save to disk, so we can check the
// suggested filename. This test needs the pdf-lib CDN, like the app itself.
import { test, expect } from '@playwright/test';
import { PdfEditorPage } from '../pages/PdfEditorPage';

const SAMPLE_PDF = 'tests/fixtures/sample-2-pages.pdf';

test('Save PDF is disabled before opening, enabled after opening', async ({ page }) => {
  const editor = new PdfEditorPage(page);
  await editor.goto();
  await expect(editor.saveButton).toBeDisabled();

  await editor.openPdf(SAMPLE_PDF);
  await expect(editor.saveButton).toBeEnabled();
});

test('clicking Save PDF downloads the edited file', async ({ page }) => {
  const editor = new PdfEditorPage(page);
  await editor.goto();
  await editor.openPdf(SAMPLE_PDF);

  // Start waiting for the download BEFORE clicking, or we may miss it.
  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
  await editor.saveButton.click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('sample-2-pages-edited.pdf');
  // Sanity check: the downloaded file is a real, non-empty PDF.
  const path = await download.path();
  expect(path).toBeTruthy();
});
test('saving after drawing downloads the edited file', async ({ page }) => {
  const editor = new PdfEditorPage(page);
  await editor.goto();
  await editor.openPdf(SAMPLE_PDF);

  await editor.selectTool('Draw');
  await editor.drawStroke();

  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
  await editor.saveButton.click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('sample-2-pages-edited.pdf');
});
