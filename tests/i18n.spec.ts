import { test, expect } from '@playwright/test';

/**
 * i18n E2E Tests
 *
 * Tests locale switching, persistence, and that localized strings render.
 * These tests use role-based and data-testid selectors where possible
 * to avoid coupling to specific locale text.
 */

test.describe('i18n - Locale Management', () => {
  test.beforeEach(async ({ page }) => {
    // Clear locale preference before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('sts-locale'));
    await page.reload();
  });

  test('should default to English locale', async ({ page }) => {
    // The main heading should be in English
    await expect(page.locator('h1')).toContainText('Slay the Spire Stats');
  });

  test('should have a language selector in settings', async ({ page }) => {
    // Open settings panel
    const settingsButton = page.getByRole('button', { name: /settings/i });
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
    }

    // Look for language select
    const languageSelect = page.locator('#language-select');
    await expect(languageSelect).toBeVisible();

    // Should have English as an option
    const options = languageSelect.locator('option');
    await expect(options.first()).toContainText('English');
  });

  test('should persist locale preference across reloads', async ({ page }) => {
    // Set locale via localStorage (simulating locale switch)
    await page.evaluate(() => localStorage.setItem('sts-locale', 'en'));
    await page.reload();

    // Verify it persists
    const storedLocale = await page.evaluate(() => localStorage.getItem('sts-locale'));
    expect(storedLocale).toBe('en');
  });

  test('should render all UI sections with localized text', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Verify key UI sections have text content (not raw translation keys)
    const heading = await page.locator('h1').textContent();
    expect(heading).not.toContain('dashboard.page_title');

    // Character tabs should have text (not keys)
    const tabs = page.getByRole('button');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(tabCount, 5); i++) {
      const text = await tabs.nth(i).textContent();
      expect(text).not.toMatch(/^[a-z_]+\.[a-z_]+$/);
    }
  });

  test('should not show raw translation keys in the UI', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Raw keys look like "namespace.key_name" - these should never appear
    const rawKeyPattern = /(?:common|dashboard|settings|graphs|errors|update_manager|game_terms)\.\w+/;

    // Filter out any CSS class names or code that might match
    const visibleTextElements = page.locator('h1, h2, h3, button, label, p, span, a, td, th');
    const count = await visibleTextElements.count();

    for (let i = 0; i < Math.min(count, 50); i++) {
      const text = await visibleTextElements.nth(i).textContent();
      if (text && text.trim()) {
        expect(
          rawKeyPattern.test(text.trim()),
          `Found raw i18n key in UI: "${text.trim()}"`
        ).toBe(false);
      }
    }
  });
});

test.describe('i18n - English Baseline', () => {
  test('should display English character names', async ({ page }) => {
    await page.goto('/');

    // These use role-based selectors (resilient to locale changes)
    await expect(page.getByRole('button', { name: 'Ironclad' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Silent' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Defect' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Watcher' })).toBeVisible();
  });
});
