import { expect, test } from '@playwright/test';

test.describe('unauthenticated', () => {
   test.use({ storageState: { cookies: [], origins: [] } });

   test('redirects to login when not authenticated', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveURL(/\/login/);
   });

   test('shows error with invalid credentials', async ({ page }) => {
      await page.goto('/login');
      await page.getByPlaceholder('Username').first().fill('no-such-user');
      await page.getByPlaceholder('Password').first().fill('WrongPassword1!');
      await page.getByRole('button', { name: /Sign In/ }).click();
      await expect(page.getByRole('alert').filter({ hasText: /invalid|password|username/i })).toBeVisible();
      await expect(page).toHaveURL(/\/login/);
   });

   test('signup validates the Yuniko flow', async ({ page }) => {
      await page.goto('/login');
      await page.getByRole('button', { name: 'Sign Up' }).first().click();
      await expect(page.getByText('Create account')).toBeVisible();
      await page.getByPlaceholder('Username').fill('x');
      await page.getByPlaceholder(/Password \(min 6/).fill('123');
      await page.getByPlaceholder('Confirm password').fill('123');
      await page.getByRole('button', { name: /Continue/ }).click();
      await expect(page.getByRole('alert')).toContainText(/3 characters|6 characters/i);
   });
});

test.describe('authenticated', () => {
   test.use({ storageState: 'playwright/.auth/user2.json' });

   test('logout redirects to login', async ({ page }, testInfo) => {
      test.skip(testInfo.project.name === 'mobile-chrome', 'Logout lives in the desktop-only More menu');
      await page.goto('/');
      await page.getByRole('button', { name: 'More' }).click();
      await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
      await page.getByRole('button', { name: 'Log out' }).click();
      await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
   });
});
