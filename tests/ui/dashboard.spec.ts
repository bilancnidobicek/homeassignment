import { test, expect } from '../../fixtures/auth.fixture';
import { DashboardPage } from '../../pages/DashboardPage';
import { LoginPage } from '../../pages/LoginPage';
import { feature, severity } from '../../helpers/allure.helper';

test.describe('Dashboard', () => {
  test.beforeEach(async () => {
    await feature('Dashboard');
  });

  test('dashboard loads after login @smoke @ui', async ({ authenticatedPage }) => {
    await severity('critical');

    await test.step('Assert: expected — dashboard is visible after login', async () => {
      await expect(authenticatedPage).toHaveURL(/dashboard/);
      await expect(new DashboardPage(authenticatedPage).sidebar).toBeVisible();
    });
  });

  test('quick launch widgets are visible @sanity @ui', async ({ authenticatedPage }) => {
    await severity('normal');

    await test.step('Assert: expected — quick launch widgets rendered', async () => {
      await expect(new DashboardPage(authenticatedPage).quickLaunchCards.first()).toBeVisible();
    });
  });

  test('user can navigate to PIM via sidebar @sanity @ui', async ({ authenticatedPage }) => {
    await severity('normal');
    const dashboard = new DashboardPage(authenticatedPage);

    await test.step('Act: click PIM in the sidebar', async () => {
      await dashboard.navigateToMenuItem('PIM');
    });
    await test.step('Assert: expected — URL contains /pim', async () => {
      await expect(authenticatedPage).toHaveURL(/pim/);
    });
  });

  // --- Edge cases below ---

  test('back button after logout does not restore the dashboard @regression @ui @edge @security', async ({ authenticatedPage }) => {
    await severity('critical');
    const dashboard = new DashboardPage(authenticatedPage);

    await test.step('Arrange: log out', async () => {
      await dashboard.logout();
      await expect(authenticatedPage).toHaveURL(/login/);
    });
    await test.step('Act: press the browser Back button', async () => {
      await authenticatedPage.goBack();
    });
    await test.step('Assert: expected — auth guard sends user back to /auth/login (session invalidated, bfcache not restoring)', async () => {
      await expect(authenticatedPage).toHaveURL(/auth\/login/, { timeout: 15_000 });
      await expect(new LoginPage(authenticatedPage).loginButton).toBeVisible();
    });
  });
});
