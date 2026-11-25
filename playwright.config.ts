// Playwright configuration for the PDF Editor tests.
//
// Beginner notes:
// - `testDir` is where the test files live.
// - `baseURL` is the local address of the PDF Editor app. Playwright
//   starts that server for us (see `webServer` below), so `npm test`
//   works with no manual step. The app served is the copy in app/:
//   Patrick's real exported HTML, with its libraries vendored locally
//   (see scripts/prepare-app.mjs) so the tests work fully offline.
// - Chromium only, to keep the first run fast. Add firefox/webkit later.
// - `trace: 'on-first-retry'` + screenshots on failure: when a test fails,
//   Playwright saves a screenshot and a trace you can open with
//   `npx playwright show-trace <file>` to see exactly what happened.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    // Build the offline test copy of the app first, then serve it.
    command: 'node scripts/prepare-app.mjs && node scripts/serve.mjs',
    url: 'http://localhost:4173/pdf-editor.local.html',
    reuseExistingServer: !process.env.CI,
    timeout: 30 * 1000,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
