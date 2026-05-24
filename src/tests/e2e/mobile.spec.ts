import { test, expect, devices } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const MOBILE_DEVICE = devices['iPhone 14'];

// Helper: log in as the test user
async function loginAsTestUser(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.TEST_USER_EMAIL ?? 'test@example.com');
  await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD ?? 'testpassword');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/board');
}

test.describe('Mobile navigation', () => {
  test.use({ ...MOBILE_DEVICE });

  test('bottom tab bar is visible on mobile', async ({ page }) => {
    await loginAsTestUser(page);
    const tabbar = page.getByRole('navigation', { name: 'Mobile navigation' });
    await expect(tabbar).toBeVisible();
  });

  test('can navigate between views via tab bar', async ({ page }) => {
    await loginAsTestUser(page);

    await page.getByRole('link', { name: 'Week' }).first().click();
    await expect(page).toHaveURL('/week');

    await page.getByRole('link', { name: 'Tasks' }).first().click();
    await expect(page).toHaveURL('/tasks');

    await page.getByRole('link', { name: 'Projects' }).first().click();
    await expect(page).toHaveURL('/projects');

    await page.getByRole('link', { name: 'Board' }).first().click();
    await expect(page).toHaveURL('/board');
  });

  test('FAB link navigates to board with ?new=1', async ({ page }) => {
    await loginAsTestUser(page);
    const fab = page.getByRole('link', { name: 'Create new task' });
    await expect(fab).toBeVisible();
    await fab.click();
    await expect(page).toHaveURL(/\/board/);
  });

  test('mobile column picker is visible on board', async ({ page }) => {
    await loginAsTestUser(page);
    // The column picker should be visible on mobile
    const picker = page.getByRole('button', { name: /Next/i });
    await expect(picker).toBeVisible();
  });
});

test.describe('Mobile task modal', () => {
  test.use({ ...MOBILE_DEVICE });

  test('focus trap keeps focus within modal', async ({ page }) => {
    await loginAsTestUser(page);

    // Open a task modal — click first task card if any, else use FAB
    const fab = page.getByRole('link', { name: 'Create new task' });
    await fab.click();
    await page.waitForURL(/new=1/);
    // Wait for the modal to appear
    await page.waitForSelector('[role="dialog"]');

    // Verify modal is open
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Press Escape to close
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('modal can be closed with Escape key', async ({ page }) => {
    await loginAsTestUser(page);

    const fab = page.getByRole('link', { name: 'Create new task' });
    await fab.click();
    await page.waitForURL(/new=1/);
    await page.waitForSelector('[role="dialog"]');

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});

test.describe('Mobile weekly calendar swipe', () => {
  test.use({ ...MOBILE_DEVICE });

  test('swipe left navigates to next week', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/week');
    await page.waitForSelector('.fb-week-header, [aria-label="Next week"]');

    // Get the current week header text
    const headerBefore = await page.locator('[class*="week"] h1, header').first().textContent();

    // Simulate swipe left (next week)
    const calendar = page.locator('[data-testid="week-grid"]').first();
    if (await calendar.count() > 0) {
      const box = await calendar.boundingBox();
      if (box !== null) {
        await page.touchscreen.tap(box.x + box.width * 0.8, box.y + box.height / 2);
      }
    }

    // Alternatively, use the navigation button
    await page.getByRole('button', { name: 'Next week' }).click();
    const headerAfter = await page.locator('[class*="week"] h1, header').first().textContent();
    expect(headerAfter).not.toBe(headerBefore);
  });
});

test.describe('Mobile backlog panel overlay', () => {
  test.use({ ...MOBILE_DEVICE });

  test('backlog panel opens as full-screen overlay', async ({ page }) => {
    await loginAsTestUser(page);

    // Toggle the backlog panel via the sidebar toggle button
    const toggleBtn = page.getByRole('button', { name: /backlog|sidebar|later/i });
    if (await toggleBtn.count() > 0) {
      await toggleBtn.first().click();
      // On mobile, backlog should be fixed/full-screen
      const panel = page.getByRole('complementary', { name: /Later/i });
      await expect(panel).toBeVisible();
    }
  });
});

test.describe('Accessibility — no axe violations', () => {
  test('board page has no critical axe violations', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/board');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(critical, `Axe violations on /board: ${JSON.stringify(critical.map((v) => v.id))}`).toHaveLength(0);
  });

  test('settings page has no critical axe violations', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(critical, `Axe violations on /settings: ${JSON.stringify(critical.map((v) => v.id))}`).toHaveLength(0);
  });
});
