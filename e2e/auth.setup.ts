import { expect, test as setup } from '@playwright/test';

const API = (process.env.NEXT_PUBLIC_YUNIKO_API_URL ?? 'https://yuniko-api.lafatriniainaallane.workers.dev').replace(/\/+$/, '');
const suffix = Date.now().toString(36);

const TEST_USER_1 = { username: `e2euser1_${suffix}`, password: 'MySecureP@ssw0rd123!', displayName: 'E2E User 1', country: 'Madagascar', age: 17 };
const TEST_USER_2 = { username: `e2euser2_${suffix}`, password: 'MySecureP@ssw0rd123!', displayName: 'E2E User 2', country: 'Madagascar', age: 17 };

async function register(user: typeof TEST_USER_1) {
   const response = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
   });
   if (!response.ok) throw new Error(`Failed to create E2E user: ${await response.text()}`);
}

async function authenticate(page: Parameters<Parameters<typeof setup>[1]>[0]['page'], user: typeof TEST_USER_1) {
   await page.goto('/login');
   await page.getByPlaceholder('Username').first().fill(user.username);
   await page.getByPlaceholder('Password').first().fill(user.password);
   await page.getByRole('button', { name: /Sign In/ }).click();
   await page.waitForURL('/', { timeout: 30000 });
}

setup('authenticate', async ({ page }) => {
   await register(TEST_USER_1);
   await register(TEST_USER_2);

   page.on('console', msg => {
      if (msg.type() === 'error') console.error('Browser error:', msg.text());
   });
   page.on('pageerror', err => console.error('Page error:', err.message));

   await authenticate(page, TEST_USER_1);
   await page.context().storageState({ path: 'playwright/.auth/user1.json' });

   await page.context().clearCookies();
   await authenticate(page, TEST_USER_2);
   await page.context().storageState({ path: 'playwright/.auth/user2.json' });
});
