// app-loads.spec.ts - "Does the app open at all, and does it look right?"
// These are smoke tests: if any of these fail, nothing else can work.
// They run WITHOUT opening a PDF, so they also check the empty state.
import { test, expect } from '@playwright/test';
import { PdfEditorPage } from '../pages/PdfEditorPage';

test.beforeEach(async ({ page }) => {
  // Every test in this file starts from a fresh load of the app.
  const editor = new PdfEditorPage(page);
  await editor.goto();
});

test('app loads with the title "PDF Editor"', async ({ page }) => {
  await expect(page).toHaveTitle('PDF Editor');
});

test('empty state invites the user to open a PDF', async ({ page }) => {
  const editor = new PdfEditorPage(page);
  await expect(editor.emptyHeading).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open PDF' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Scan pages' })).toBeVisible();
  await expect(page.getByText('Drop a PDF or image files anywhere in this window.')).toBeVisible();
});

test('toolbar shows Open, Scan and Save PDF; Save is disabled before a file is open', async ({ page }) => {
  const editor = new PdfEditorPage(page);
  await expect(editor.openButton).toBeVisible();
  await expect(editor.scanButton).toBeVisible();
  await expect(editor.saveButton).toBeVisible();
  // Save must be disabled with no document - there is nothing to save yet.
  await expect(editor.saveButton).toBeDisabled();
  await expect(editor.undoButton).toBeDisabled();
});

test('sidebar shows "No PDF open" and all five annotation tools', async ({ page }) => {
  const editor = new PdfEditorPage(page);
  await expect(editor.docName).toHaveText('No PDF open');
  await expect(editor.docMeta).toHaveText('Open a file or scan pages to begin.');
  for (const tool of ['Move', 'Draw', 'Highlight', 'Text', 'Erase'] as const) {
    await expect(page.getByRole('button', { name: tool, exact: true })).toBeVisible();
  }
  // Move is the default tool when the app loads.
  await expect(editor.toolTile('pan')).toHaveClass(/active/);
});

test('page indicator is empty and navigation is disabled before a file is open', async ({ page }) => {
  const editor = new PdfEditorPage(page);
  await expect(editor.pageIndicator).toHaveText('— / —');
  await expect(editor.prevButton).toBeDisabled();
  await expect(editor.nextButton).toBeDisabled();
});
test('Clear button is disabled before a file is open', async ({ page }) => {
  const editor = new PdfEditorPage(page);
  await expect(editor.clearButton).toBeDisabled();
});