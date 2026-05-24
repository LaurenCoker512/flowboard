import { test, expect } from '@playwright/test';

test('unauthenticated visit to / redirects to /login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
});
