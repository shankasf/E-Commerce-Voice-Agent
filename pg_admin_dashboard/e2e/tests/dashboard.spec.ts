import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('should display dashboard with database list', async ({ page }) => {
    await page.goto('/');

    // Check for dashboard elements
    await expect(page.getByText(/databases/i)).toBeVisible();

    // Should have sidebar
    await expect(page.locator('aside')).toBeVisible();
  });

  test('should navigate to database when clicked', async ({ page }) => {
    await page.goto('/');

    // Wait for databases to load
    await page.waitForSelector('[data-testid="database-list"], .sidebar-item');

    // Click on first database link in sidebar (if exists)
    const dbLink = page.locator('a[href^="/db/"]').first();
    if (await dbLink.count() > 0) {
      await dbLink.click();
      await expect(page).toHaveURL(/\/db\//);
    }
  });

  test('should have working navigation links', async ({ page }) => {
    await page.goto('/');

    // Test Performance link
    const perfLink = page.getByRole('link', { name: /performance/i });
    if (await perfLink.count() > 0) {
      await perfLink.click();
      await expect(page).toHaveURL('/performance');
    }

    // Test Settings link
    await page.getByRole('link', { name: /settings/i }).click();
    await expect(page).toHaveURL('/settings');

    // Test Users link
    await page.getByRole('link', { name: /users/i }).click();
    await expect(page).toHaveURL('/users');
  });
});

test.describe('Database View', () => {
  test('should display database info and tables', async ({ page }) => {
    // Navigate to a database (assuming test_db exists)
    await page.goto('/db/postgres');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Should show database name
    await expect(page.getByRole('heading').first()).toBeVisible();
  });

  test('should show SQL Editor link', async ({ page }) => {
    await page.goto('/db/postgres');

    // Should have SQL Editor link
    const sqlEditorLink = page.getByRole('link', { name: /sql editor/i });
    await expect(sqlEditorLink).toBeVisible();
  });
});
