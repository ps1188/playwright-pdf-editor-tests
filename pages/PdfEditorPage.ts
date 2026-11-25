// Page Object Model (POM) for the PDF Editor app.
//
// What is a Page Object? Instead of repeating selectors in every test,
// we put them in ONE class. Each test calls a plain-English method like
// `page.openPdf(...)` or `page.selectTool('draw')`.
//
// Why it helps a learner:
// - If the app changes a button label, you fix ONE place (here), not 10 tests.
// - Tests read like a manual test case: "open the PDF, go to page 2,
//   check the page number says 2 / 2" - the HOW lives here, the WHAT in tests.
//
// Selector choices (all verified against the real pdf-editor.html):
// - Visible buttons are found by their accessible name with getByRole().
//   That is the most user-like way: it finds what a user sees/hears.
//   Example: the toolbar "Open" button contains an icon + the text "Open".
// - Icon-only buttons (Undo, Clear, Previous/Next page) have no visible
//   text, but they DO have a `title` attribute in the HTML, e.g.
//   title="Undo annotation". Playwright uses that title as the button's
//   accessible name, so getByRole('button', { name: 'Undo annotation' }) works.
// - The hidden file input (#pdfInput) has no role at all - it is
//   `<input type="file" style="display:none">` - so we use its #id.
//   That is the standard Playwright way to upload a file: setInputFiles()
//   works even on a hidden input.
// - The annotation tools are <button class="tool-tile" data-tool="draw">
//   etc. in the sidebar. They are found by their visible text (Draw,
//   Highlight, Text, Erase, Move). Note: there is a second copy of these
//   tools in the mobile bottom bar, but it is `display:none` on a desktop
//   viewport, so getByRole() ignores it.
import { expect, type Locator, type Page } from '@playwright/test';

export type ToolName = 'pan' | 'draw' | 'highlight' | 'text' | 'erase';

export class PdfEditorPage {
  readonly page: Page;

  // --- Toolbar (top of the app) ---
  readonly openButton: Locator; // "Open" - opens the file picker
  readonly scanButton: Locator; // "Scan" - opens the camera/image picker
  readonly saveButton: Locator; // "Save PDF" - disabled until a PDF is open
  readonly undoButton: Locator; // icon button, title="Undo annotation"
  readonly clearButton: Locator; // icon button, title="Clear annotations on this page"

  // --- Sidebar (left) ---
  readonly docName: Locator; // #docName - "No PDF open" until a file loads
  readonly docMeta: Locator; // #docMeta - e.g. "2 pages · changes stay..."
  readonly textInput: Locator; // "Text to place" - only visible with Text tool

  // --- Viewer (centre) ---
  readonly emptyHeading: Locator; // "Edit a PDF, right here"
  readonly pageIndicator: Locator; // #pageNum - "— / —" before open, "1 / 2" after
  readonly prevButton: Locator; // icon button, title="Previous page"
  readonly nextButton: Locator; // icon button, title="Next page"
  readonly pdfCanvas: Locator; // #pdfCanvas - the rendered PDF page
  readonly inkCanvas: Locator; // #inkCanvas - the drawing layer on top
  readonly toast: Locator; // #toast - short messages like "PDF ready to edit"

  // --- Hidden file input (no visible button - the Open button clicks it) ---
  readonly pdfInput: Locator; // #pdfInput, accept="application/pdf"
  readonly scanInput: Locator; // #scanInput, accept="image/jpeg,image/png,image/webp", multiple

  constructor(page: Page) {
    this.page = page;
    this.openButton = page.getByRole('button', { name: 'Open', exact: true });
    this.scanButton = page.getByRole('button', { name: 'Scan', exact: true });
    this.saveButton = page.getByRole('button', { name: 'Save PDF' });
    this.undoButton = page.getByRole('button', { name: 'Undo annotation' });
    this.clearButton = page.getByRole('button', { name: 'Clear annotations on this page' });
    this.docName = page.locator('#docName');
    this.docMeta = page.locator('#docMeta');
    this.textInput = page.getByLabel('Text to place');
    this.emptyHeading = page.getByRole('heading', { name: 'Edit a PDF, right here' });
    this.pageIndicator = page.locator('#pageNum');
    this.prevButton = page.getByRole('button', { name: 'Previous page' });
    this.nextButton = page.getByRole('button', { name: 'Next page' });
    this.pdfCanvas = page.locator('#pdfCanvas');
    this.inkCanvas = page.locator('#inkCanvas');
    this.toast = page.locator('#toast');
    this.pdfInput = page.locator('#pdfInput');
    this.scanInput = page.locator('#scanInput');
  }

  /** Open the app at its start page (the empty state, no PDF loaded). */
  async goto() {
    await this.page.goto('/pdf-editor.local.html');
    await expect(this.emptyHeading).toBeVisible();
  }

  /**
   * Upload a PDF file and wait until it is rendered.
   * `fixturePath` is a path on disk, e.g. 'tests/fixtures/sample-2-pages.pdf'.
   * Playwright sets the hidden file input directly - no file-picker dialog.
   * Loading needs the pdf.js CDN, so this waits up to 30 seconds.
   */
  async openPdf(fixturePath: string) {
    await this.pdfInput.setInputFiles(fixturePath);
    await expect(this.pageIndicator).not.toHaveText('— / —', { timeout: 30_000 });
    await expect(this.pdfCanvas).toBeVisible();
  }

  /**
   * Upload image file(s) through the hidden Scan input and wait until the
   * app has built a PDF from them. The app names it 'scanned-pages.pdf'
   * and shows a toast like '1 scanned page ready' / '2 scanned pages ready'.
   * Same setInputFiles() trick as openPdf() - no camera or file picker needed.
   */
  async scanImages(...imagePaths: string[]) {
    await this.scanInput.setInputFiles(imagePaths);
    await expect(this.docName).toHaveText('scanned-pages.pdf', { timeout: 30_000 });
    await expect(this.pdfCanvas).toBeVisible();
  }

  /** Click an annotation tool in the sidebar: Move, Draw, Highlight, Text, Erase. */
  async selectTool(tool: 'Move' | 'Draw' | 'Highlight' | 'Text' | 'Erase') {
    await this.page.getByRole('button', { name: tool, exact: true }).click();
  }

  /** Is the given sidebar tool currently active (highlighted)? */
  toolTile(tool: ToolName) {
    return this.page.locator(`.tool-tile[data-tool="${tool}"]`);
  }

  /**
   * Draw a short diagonal stroke on the PDF page with the mouse.
   * Only works after selectTool('Draw') (or Highlight/Erase) - with the
   * Move tool the ink canvas ignores pointer input, by design of the app.
   */
  async drawStroke() {
    const box = await this.inkCanvas.boundingBox();
    if (!box) throw new Error('Ink canvas has no visible box - is a PDF open?');
    const startX = box.x + box.width * 0.3;
    const startY = box.y + box.height * 0.3;
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(startX + 120, startY + 60, { steps: 10 });
    await this.page.mouse.up();
  }
}
