import { test, expect } from '@playwright/test';

// Cross-engine layout snapshots. WebKit and Chromium/Firefox have historically diverged on this
// site's CSS grid spacing (e.g. .blog-post-header's minmax() columns), and functional assertions
// alone don't catch that class of regression — a pixel diff does.

test.describe('blog post header', () => {
    test('desktop layout', async ({ page }) => {
        await page.setViewportSize({ width: 1_280, height: 800 });
        await page.goto('/blog/ghp-to-cfw');
        await expect(page.locator('.blog-post-header')).toHaveScreenshot('blog-post-header-desktop.png');
    });

    test('mobile layout', async ({ page }) => {
        await page.setViewportSize({ width: 600, height: 900 });
        await page.goto('/blog/ghp-to-cfw');
        await expect(page.locator('.blog-post-header')).toHaveScreenshot('blog-post-header-mobile.png');
    });
});

test.describe('home page panels', () => {
    test('desktop layout', async ({ page }) => {
        await page.setViewportSize({ width: 1_280, height: 800 });
        await page.goto('/');
        await expect(page.locator('.panel.active')).toHaveCount(1);
        await expect(page).toHaveScreenshot('home-desktop.png');
    });

    test('mobile layout', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 800 });
        await page.goto('/');
        await expect(page.locator('.panel.active')).toHaveCount(1);
        await expect(page).toHaveScreenshot('home-mobile.png');
    });
});
