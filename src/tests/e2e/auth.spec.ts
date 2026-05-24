import { test, expect } from '@playwright/test';

test.describe('authentication flow', () => {
  test('unauthenticated visit to / redirects to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated visit to /board redirects to /login', async ({ page }) => {
    await page.goto('/board');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated visit to /settings redirects to /login', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page is accessible without auth', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('invalid credentials show error message', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#username', 'wronguser');
    await page.fill('#password', 'wrongpass');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toContainText('Invalid username or password');
  });

  test('valid credentials redirect to /board', async ({ page }) => {
    const username = process.env.SEED_USERNAME ?? 'admin';
    const password = process.env.SEED_PASSWORD ?? '';

    test.skip(!password, 'SEED_PASSWORD not set — skipping login test');

    await page.goto('/login');
    await page.fill('#username', username);
    await page.fill('#password', password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/board/);
  });

  test('logout clears session and redirects to /login', async ({ page }) => {
    const username = process.env.SEED_USERNAME ?? 'admin';
    const password = process.env.SEED_PASSWORD ?? '';

    test.skip(!password, 'SEED_PASSWORD not set — skipping logout test');

    await page.goto('/login');
    await page.fill('#username', username);
    await page.fill('#password', password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/board/);

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/board');
    await expect(page).toHaveURL(/\/login/);
  });

  test('settings link navigates to /settings', async ({ page }) => {
    const username = process.env.SEED_USERNAME ?? 'admin';
    const password = process.env.SEED_PASSWORD ?? '';

    test.skip(!password, 'SEED_PASSWORD not set');

    await page.goto('/login');
    await page.fill('#username', username);
    await page.fill('#password', password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/board/);

    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL(/\/settings/);
  });
});
