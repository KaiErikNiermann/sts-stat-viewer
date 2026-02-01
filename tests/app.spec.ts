import { test, expect } from '@playwright/test';

test.describe('STS Stat Viewer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the main header', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Slay the Spire Stats');
  });

  test('should have all character tabs', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ironclad' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Silent' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Defect' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Watcher' })).toBeVisible();
  });

  test('should show overview by default', async ({ page }) => {
    // Overview tab should be active
    const overviewButton = page.getByRole('button', { name: 'Overview' });
    await expect(overviewButton).toHaveClass(/active/);
  });

  test('should switch to character view when clicking tab', async ({ page }) => {
    // Wait for initial load
    await page.waitForTimeout(1000);

    // Click on Ironclad tab
    await page.getByRole('button', { name: 'Ironclad' }).click();
    
    // Should show Ironclad-specific content
    await expect(page.locator('h2')).toContainText('Ironclad');
  });

  test('should display plots in overview', async ({ page }) => {
    // Wait for API data to load
    await page.waitForTimeout(2000);

    // Check for plot containers
    const plotContainers = page.locator('.plot-container');
    await expect(plotContainers.first()).toBeVisible();
  });

  test('should display stat cards for each character', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);

    // Check for stat cards
    const statCards = page.locator('.stat-card');
    const count = await statCards.count();
    
    // Should have at least 4 stat cards (one per character)
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('should show character-specific plots when switching tabs', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Switch to Watcher
    await page.getByRole('button', { name: 'Watcher' }).click();
    await page.waitForTimeout(500);

    // Should have Watcher insights section
    await expect(page.getByText('Watcher Insights')).toBeVisible();
  });

  test('should handle loading state', async ({ page }) => {
    // Check that loading indicator appears initially (may be fast)
    // This is more of a smoke test
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Plot Rendering', () => {
  test('overview plots should render SVG elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Check that SVG plots are rendered
    const svgElements = page.locator('.plot-container svg');
    const count = await svgElements.count();
    
    // Should have rendered at least one plot
    expect(count).toBeGreaterThan(0);
  });

  test('character plots should render when switching tabs', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Switch to Silent
    await page.getByRole('button', { name: 'Silent' }).click();
    await page.waitForTimeout(1000);

    // Check that plots are rendered
    const svgElements = page.locator('.plot-container svg');
    const count = await svgElements.count();
    
    expect(count).toBeGreaterThan(0);
  });
});
