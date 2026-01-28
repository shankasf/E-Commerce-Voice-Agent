import { test as setup, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

// Ensure auth directory exists before saving state
const authDir = path.dirname(authFile);
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

setup('authenticate', async ({ page }) => {
  // Go to login page
  await page.goto('/login');

  // Wait for login form to be visible
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

  // Fill in credentials
  await page.getByLabel(/username/i).fill(process.env.TEST_USERNAME || 'admin');
  await page.getByLabel(/password/i).fill(process.env.TEST_PASSWORD || 'admin');

  // Submit form
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for navigation to dashboard
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: /dashboard|databases/i })).toBeVisible({
    timeout: 10000,
  });

  // Save authentication state
  await page.context().storageState({ path: authFile });
});
