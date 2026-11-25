// annotate.spec.ts - "Can I pick a tool and mark up the page?"
// These tests check tool selection and the undo state - the visible,
// testable behaviour of annotating. They do NOT try to read pixels off
// the canvas (that is brittle); instead they check the app's own state:
// which tool is active, and whether Undo becomes available after a stroke.
import { test, expect } from '@playwright/test';
import { PdfEditorPage } from '../pages/PdfEditorPage';

const SAMPLE_PDF = 'tests/fixtures/sample-2-pages.pdf';

test.beforeEach(async ({ page }) => {
  const editor = new PdfEditorPage(page);
  await editor.goto();
  await editor.openPdf(SAMPLE_PDF);
});

test('selecting Draw marks Draw active and Move inactive', async ({ page }) => {
  const editor = new PdfEditorPage(page);
  await editor.selectTool('Draw');
  await expect(editor.toolTile('draw')).toHaveClass(/active/);
  await expect(editor.toolTile('pan')).not.toHaveClass(/active/);
});

test('selecting Highlight marks Highlight active', async ({ page }) => {
  const editor = new PdfEditorPage(page);
  await editor.selectTool('Highlight');
  await expect(editor.toolTile('highlight')).toHaveClass(/active/);
});

test('selecting Text reveals the text input, and it accepts text', async ({ page }) => {
  const editor = new PdfEditorPage(page);
  // Before picking Text, the input is hidden by the app (CSS display:none).
  await expect(editor.textInput).toBeHidden();

  await editor.selectTool('Text');
  await expect(editor.textInput).toBeVisible();
  await editor.textInput.fill('Check this paragraph');
  await expect(editor.textInput).toHaveValue('Check this paragraph');
});

test('drawing a stroke enables Undo; Undo is disabled before any annotation', async ({ page }) => {
  const editor = new PdfEditorPage(page);
  await expect(editor.undoButton).toBeDisabled();

  await editor.selectTool('Draw');
  await editor.drawStroke();

  // The app pushes the pre-stroke canvas onto the undo stack when a
  // stroke starts, so Undo must become enabled after drawing.
  await expect(editor.undoButton).toBeEnabled();
});

test('Clear button is enabled once a PDF is open', async ({ page }) => {
  const editor = new PdfEditorPage(page);
  await expect(editor.clearButton).toBeEnabled();
});

test('selecting Erase marks Erase active and Draw inactive', async ({ page }) => {
  const editor = new PdfEditorPage(page);
  await editor.selectTool('Erase');
  await expect(editor.toolTile('erase')).toHaveClass(/active/);
  await expect(editor.toolTile('draw')).not.toHaveClass(/active/);
});