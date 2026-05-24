import { test, expect } from '@playwright/test';

const hasDb = !!process.env.TEST_DATABASE_URL;
const hasSeedCreds = !!process.env.SEED_PASSWORD;

test.describe('password reset flow', () => {
  test('forgot-password page is accessible without auth', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page).toHaveURL(/\/forgot-password/);
    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
  });

  test('reset-password page without token shows invalid-link error', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page.getByRole('alert')).toContainText('invalid');
  });

  test('reset-password page with a token shows password form', async ({ page }) => {
    await page.goto('/reset-password?token=faketoken');
    await expect(page.getByRole('heading', { name: 'Set new password' })).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();
  });

  test('submitting reset form with invalid token shows error', async ({ page }) => {
    test.skip(!hasDb, 'TEST_DATABASE_URL not set');

    await page.goto('/reset-password?token=invalidtoken');
    await page.fill('#password', 'newpassword123');
    await page.fill('#confirmPassword', 'newpassword123');
    await page.getByRole('button', { name: 'Set new password' }).click();
    await expect(page.getByRole('alert')).toContainText('invalid or has expired');
  });

  test('full reset flow: request → visit link → set password → sign in', async ({ page }) => {
    test.skip(!hasDb || !hasSeedCreds, 'TEST_DATABASE_URL or SEED_PASSWORD not set');

    const seedEmail = process.env.SEED_EMAIL ?? '';
    const seedPassword = process.env.SEED_PASSWORD ?? '';
    const newPassword = `newpass-${Date.now()}`;

    await page.goto('/forgot-password');
    await page.fill('#email', seedEmail);
    await page.getByRole('button', { name: 'Send reset link' }).click();

    await expect(page.getByText("If that email is registered")).toBeVisible();

    const resetLink = await page.locator('[data-testid="test-reset-link"]').getAttribute('href');
    expect(resetLink).toBeTruthy();

    await page.goto(resetLink!);
    await expect(page.getByRole('heading', { name: 'Set new password' })).toBeVisible();

    await page.fill('#password', newPassword);
    await page.fill('#confirmPassword', newPassword);
    await page.getByRole('button', { name: 'Set new password' }).click();

    await expect(page.getByText('Your password has been updated')).toBeVisible();

    await page.goto('/login');
    await page.fill('#username', process.env.SEED_USERNAME ?? 'admin');
    await page.fill('#password', newPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/board/);

    // Restore original password so other tests still work
    await page.goto('/forgot-password');
    await page.fill('#email', seedEmail);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    const restoreLink = await page.locator('[data-testid="test-reset-link"]').getAttribute('href');
    await page.goto(restoreLink!);
    await page.fill('#password', seedPassword);
    await page.fill('#confirmPassword', seedPassword);
    await page.getByRole('button', { name: 'Set new password' }).click();
    await expect(page.getByText('Your password has been updated')).toBeVisible();
  });

  test('used reset link is rejected on second attempt', async ({ page }) => {
    test.skip(!hasDb || !hasSeedCreds, 'TEST_DATABASE_URL or SEED_PASSWORD not set');

    const seedEmail = process.env.SEED_EMAIL ?? '';

    await page.goto('/forgot-password');
    await page.fill('#email', seedEmail);
    await page.getByRole('button', { name: 'Send reset link' }).click();

    const resetLink = await page.locator('[data-testid="test-reset-link"]').getAttribute('href');

    // First use
    await page.goto(resetLink!);
    await page.fill('#password', 'firstuse-pass-123');
    await page.fill('#confirmPassword', 'firstuse-pass-123');
    await page.getByRole('button', { name: 'Set new password' }).click();
    await expect(page.getByText('Your password has been updated')).toBeVisible();

    // Second attempt with the same link
    await page.goto(resetLink!);
    await page.fill('#password', 'seconduse-pass-456');
    await page.fill('#confirmPassword', 'seconduse-pass-456');
    await page.getByRole('button', { name: 'Set new password' }).click();
    await expect(page.getByRole('alert')).toContainText('invalid or has expired');

    // Restore password
    await page.goto('/forgot-password');
    await page.fill('#email', seedEmail);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    const restoreLink = await page.locator('[data-testid="test-reset-link"]').getAttribute('href');
    await page.goto(restoreLink!);
    await page.fill('#password', process.env.SEED_PASSWORD!);
    await page.fill('#confirmPassword', process.env.SEED_PASSWORD!);
    await page.getByRole('button', { name: 'Set new password' }).click();
    await expect(page.getByText('Your password has been updated')).toBeVisible();
  });
});
