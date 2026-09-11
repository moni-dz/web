import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: 'tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL: 'http://127.0.0.1:4173',
        trace: 'on-first-retry',
    },
    expect: {
        toHaveScreenshot: { animations: 'disabled', maxDiffPixelRatio: 0.02 },
    },
    webServer: {
        command: 'npm run preview -- --host 127.0.0.1',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: !process.env.CI,
    },
    projects: [
        { name: 'unit', testMatch: /\.test\.ts$/ },
        { name: 'chromium', testIgnore: /\.test\.ts$/, use: { ...devices['Desktop Chrome'] } },
        { name: 'webkit', testIgnore: /\.test\.ts$/, use: { ...devices['Desktop Safari'] } },
        { name: 'firefox', testIgnore: /\.test\.ts$/, use: { ...devices['Desktop Firefox'] } },
    ],
});
