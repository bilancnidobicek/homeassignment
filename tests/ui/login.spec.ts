import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { DashboardPage } from '../../pages/DashboardPage';
import * as dotenv from 'dotenv';
import { feature, severity } from '../../helpers/allure.helper';

dotenv.config();

const USERNAME = process.env.ORANGEHRM_USERNAME ?? 'Admin';
const PASSWORD = process.env.ORANGEHRM_PASSWORD ?? 'admin123';

// Data-driven: each row is one invalid login scenario
const invalidLoginCases = [
  { username: USERNAME,    password: 'wrongpass',  expectedError: 'Invalid credentials', severity: 'critical' },
  { username: 'nouser',    password: PASSWORD,     expectedError: 'Invalid credentials', severity: 'critical' },
  { username: '',          password: PASSWORD,     expectedError: 'Required',            severity: 'normal'   },
  { username: USERNAME,    password: '',           expectedError: 'Required',            severity: 'normal'   },
  { username: '',          password: '',           expectedError: 'Required',            severity: 'normal'   },
] as const;

test.describe('Login', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    await feature('Authentication');
    loginPage = new LoginPage(page);
    await test.step('Arrange: open the login page', async () => {
      await loginPage.navigate();
    });
  });

  test('successful login with valid credentials @smoke @ui', async ({ page }) => {
    await severity('critical');

    await test.step('Act: submit valid credentials', async () => {
      await loginPage.login(USERNAME, PASSWORD);
    });
    await test.step('Assert: expected — dashboard is visible after login', async () => {
      await expect(page).toHaveURL(/dashboard/, { timeout: 20_000 });
      await expect(new DashboardPage(page).sidebar).toBeVisible();
    });
  });

  test('login page is visible on load @smoke @ui', async () => {
    await test.step('Assert: expected — username, password and Login button visible on page load', async () => {
      await expect(loginPage.usernameInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.loginButton).toBeVisible();
    });
  });

  // Data-driven invalid login tests — one test per scenario
  for (const { username, password, expectedError, severity: caseSeverity } of invalidLoginCases) {
    const label = username === '' && password === ''
      ? 'both fields empty'
      : username === ''
        ? 'empty username'
        : password === ''
          ? 'empty password'
          : `wrong ${password === PASSWORD ? 'username' : 'password'}`;

    test(`login rejected: ${label} @regression @ui`, async () => {
      await severity(caseSeverity);

      await test.step(`Act: submit invalid credentials (${label})`, async () => {
        await loginPage.login(username, password);
      });
      await test.step(`Assert: expected error message contains "${expectedError}"`, async () => {
        await expect(loginPage.errorMessage).toContainText(expectedError, { timeout: 15_000 });
      });
    });
  }

  // --- Edge cases below ---

  test("SQL injection payload in username is rejected safely @regression @ui @edge", async ({ page }) => {
    await severity('critical');

    await test.step("Act: submit SQL-injection payload as username", async () => {
      await loginPage.login("' OR 1=1--", "' OR 1=1--");
    });
    await test.step('Assert: expected — no navigation to /dashboard', async () => {
      await expect(page).not.toHaveURL(/dashboard/, { timeout: 5_000 });
    });
    await test.step('Assert: expected — normal "Invalid credentials" message (not a DB error)', async () => {
      await expect(loginPage.errorMessage).toContainText('Invalid credentials', { timeout: 15_000 });
    });
  });

  test('XSS payload in username does not execute @regression @ui @edge', async ({ page }) => {
    await severity('critical');
    let dialogFired = false;

    await test.step('Arrange: install dialog tripwire', async () => {
      page.on('dialog', async (d) => {
        dialogFired = true;
        await d.dismiss();
      });
    });
    await test.step('Act: submit XSS payload as username', async () => {
      await loginPage.login('<script>alert("xss")</script>', 'anything');
    });
    await test.step('Assert: expected — no navigation to /dashboard', async () => {
      await expect(page).not.toHaveURL(/dashboard/, { timeout: 5_000 });
    });
    await test.step('Assert: expected — no script dialog fired', async () => {
      expect(dialogFired, 'actual: dialog fired = ' + dialogFired).toBe(false);
    });
  });

  test('direct access to /dashboard without auth redirects to login @regression @ui @edge @security', async ({ page, context }) => {
    await severity('critical');

    await test.step('Arrange: clear all cookies (no session)', async () => {
      await context.clearCookies();
    });
    await test.step('Act: navigate directly to /dashboard/index', async () => {
      await page.goto('/web/index.php/dashboard/index');
    });
    await test.step('Assert: expected — URL redirected to /auth/login', async () => {
      await expect(page).toHaveURL(/auth\/login/, { timeout: 15_000 });
      await expect(loginPage.loginButton).toBeVisible();
    });
  });

  test('javascript: URL in username is treated as text, does not execute @regression @ui @edge', async ({ page }) => {
    let dialogFired = false;

    await test.step('Arrange: install dialog tripwire', async () => {
      page.on('dialog', async (d) => {
        dialogFired = true;
        await d.dismiss();
      });
    });
    await test.step('Act: submit javascript: URL as username', async () => {
      await loginPage.login("javascript:alert('pwned')", 'anything');
    });
    await test.step('Assert: expected — no navigation to javascript: or /dashboard', async () => {
      await expect(page).not.toHaveURL(/^javascript:/, { timeout: 5_000 });
      await expect(page).not.toHaveURL(/dashboard/, { timeout: 5_000 });
    });
    await test.step('Assert: expected — no script dialog fired; error shown', async () => {
      expect(dialogFired, 'actual: dialog fired = ' + dialogFired).toBe(false);
      await expect(loginPage.errorMessage).toContainText('Invalid credentials', { timeout: 15_000 });
    });
  });
});
