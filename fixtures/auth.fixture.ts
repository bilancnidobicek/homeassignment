import { test as base, Page } from '@playwright/test';
import * as dotenv from 'dotenv';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

dotenv.config();

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(
      process.env.ORANGEHRM_USERNAME ?? 'Admin',
      process.env.ORANGEHRM_PASSWORD ?? 'admin123'
    );
    // Wait for post-login redirect to complete before proceeding
    await page.waitForURL(/dashboard/, { timeout: 20_000 });
    await new DashboardPage(page).sidebar.waitFor();
    await use(page);
  },
});

export { expect } from '@playwright/test';
