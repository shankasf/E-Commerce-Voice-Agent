import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // Clear auth for login tests

  test('should display login page', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByText('PG Admin')).toBeVisible();
    await expect(page.getByLabel(/username/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/username/i).fill('wronguser');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show error message
    await expect(page.getByText(/invalid|error|failed/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/settings');

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/username/i).fill(process.env.TEST_USERNAME || 'admin');
    await page.getByLabel(/password/i).fill(process.env.TEST_PASSWORD || 'admin');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should navigate to dashboard
    await expect(page).toHaveURL('/');
  });
});
