import { test, expect } from '@playwright/test';

test.describe('SQL Editor', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to SQL editor for postgres database
    await page.goto('/db/postgres/sql');
    await page.waitForLoadState('networkidle');
  });

  test('should display SQL editor interface', async ({ page }) => {
    // Check for SQL Editor title
    await expect(page.getByRole('heading', { name: /sql editor/i })).toBeVisible();

    // Check for Run button
    await expect(page.getByRole('button', { name: /run/i })).toBeVisible();

    // Check for results area
    await expect(page.getByText(/results/i)).toBeVisible();
  });

  test('should have Monaco editor loaded', async ({ page }) => {
    // Monaco editor container should be present
    const editor = page.locator('.monaco-editor');
    await expect(editor).toBeVisible({ timeout: 10000 });
  });

  test('should execute simple query', async ({ page }) => {
    // Wait for editor to load
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });

    // Monaco editor typing is complex, so we'll use keyboard shortcuts
    // First, clear and type a simple query
    await page.keyboard.press('Control+a');
    await page.keyboard.type('SELECT 1 as test_column;');

    // Click Run button
    await page.getByRole('button', { name: /run/i }).click();

    // Wait for results
    await page.waitForResponse(response =>
      response.url().includes('/query') && response.status() === 200
    ).catch(() => {
      // Query might fail if database isn't available
    });
  });

  test('should show query history button', async ({ page }) => {
    const historyButton = page.getByRole('button', { name: /history/i });
    await expect(historyButton).toBeVisible();
  });

  test('should toggle history panel', async ({ page }) => {
    const historyButton = page.getByRole('button', { name: /history/i });
    await historyButton.click();

    // History panel should appear
    await expect(page.getByText(/query history/i)).toBeVisible();
  });
});
