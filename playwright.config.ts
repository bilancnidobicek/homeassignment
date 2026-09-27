import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // No local retries: a failure should be investigated, not silently retried away
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    ['allure-playwright', {
      resultsDir: 'allure-results',
      detail: true,
      suiteTitle: false,
      environmentInfo: {
        'UI Base URL': process.env.UI_BASE_URL ?? 'https://opensource-demo.orangehrmlive.com',
        'API Base URL': process.env.API_BASE_URL ?? 'https://petstore.swagger.io',
        'Node Version': process.version,
        'Platform': process.platform,
        'Browser': 'Chromium (Desktop Chrome)',
        'CI': process.env.CI ? 'true' : 'false',
      },
    }],
  ],
  use: {
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'ui',
      testDir: './tests/ui',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.UI_BASE_URL ?? 'https://opensource-demo.orangehrmlive.com',
        actionTimeout: 15_000,
        navigationTimeout: 30_000,
      },
    },
    {
      name: 'api',
      testDir: './tests/api',
      use: {
        baseURL: process.env.API_BASE_URL ?? 'https://petstore.swagger.io',
        extraHTTPHeaders: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      },
    },
  ],
  timeout: 60_000,
});
