import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('should display all setting sections', async ({ page }) => {
    // Main heading
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();

    // SQL Editor section
    await expect(page.getByText('SQL Editor')).toBeVisible();

    // Display section
    await expect(page.getByText('Display')).toBeVisible();

    // About section
    await expect(page.getByText('About')).toBeVisible();
  });

  test('should change font size setting', async ({ page }) => {
    // Find and change font size
    const fontSizeSelect = page.locator('select').first();
    await fontSizeSelect.selectOption('18');

    // Verify the selection
    await expect(fontSizeSelect).toHaveValue('18');
  });

  test('should toggle word wrap', async ({ page }) => {
    // Find word wrap toggle
    const wordWrapToggle = page.locator('input[type="checkbox"]').first();

    // Get initial state
    const initialState = await wordWrapToggle.isChecked();

    // Click to toggle
    await wordWrapToggle.click();

    // Verify toggle changed
    const newState = await wordWrapToggle.isChecked();
    expect(newState).toBe(!initialState);
  });

  test('should change rows per page', async ({ page }) => {
    // Find rows per page select (it's in the Display section)
    const selects = page.locator('select');

    // Find the select with rows per page options
    for (let i = 0; i < await selects.count(); i++) {
      const select = selects.nth(i);
      const options = await select.locator('option').allTextContents();
      if (options.some(opt => opt.includes('50') || opt.includes('100'))) {
        await select.selectOption('100');
        await expect(select).toHaveValue('100');
        break;
      }
    }
  });

  test('should reset settings to defaults', async ({ page }) => {
    // Change a setting first
    const fontSizeSelect = page.locator('select').first();
    await fontSizeSelect.selectOption('20');

    // Click reset button
    await page.getByRole('button', { name: /reset to defaults/i }).click();

    // Font size should be back to default (14)
    await expect(fontSizeSelect).toHaveValue('14');
  });

  test('should display app info in About section', async ({ page }) => {
    await expect(page.getByText('PG Admin Dashboard')).toBeVisible();
    await expect(page.getByText('1.0.0')).toBeVisible();
    await expect(page.getByText('MIT')).toBeVisible();
  });

  test('should persist settings after page reload', async ({ page }) => {
    // Change a setting
    const fontSizeSelect = page.locator('select').first();
    await fontSizeSelect.selectOption('18');

    // Reload page
    await page.reload();

    // Setting should persist
    await expect(fontSizeSelect).toHaveValue('18');
  });
});
