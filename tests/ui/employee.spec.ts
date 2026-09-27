import { test, expect } from '../../fixtures/auth.fixture';
import { EmployeeListPage } from '../../pages/EmployeeListPage';
import { AddEmployeePage } from '../../pages/AddEmployeePage';
import { feature, severity } from '../../helpers/allure.helper';

test.describe('Employee Management', () => {
  let employeeList: EmployeeListPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    await feature('Employee Management');
    employeeList = new EmployeeListPage(authenticatedPage);
    await test.step('Arrange: navigate to employee list page', async () => {
      await employeeList.navigate();
    });
  });

  test('employee list page is accessible @smoke @ui', async () => {
    await severity('critical');

    await test.step('Assert: expected — employee list page shell is visible', async () => {
      await expect(employeeList.searchButton).toBeVisible();
    });
  });

  test('employee list has results by default @sanity @ui', async () => {
    await severity('normal');

    await test.step('Assert: expected — at least one employee row is rendered', async () => {
      await expect(employeeList.tableRows.first()).toBeVisible();
    });
  });

  test('search with nonexistent name shows no records @regression @ui', async () => {
    await severity('normal');

    await test.step('Act: search by a name that does not exist', async () => {
      await employeeList.searchByName('zzz_nonexistent_zzz');
    });
    await test.step('Assert: expected — "No Records Found" is displayed', async () => {
      await expect(employeeList.noRecordsText).toContainText('No Records Found');
    });
  });

  test('add employee button opens the add employee form @sanity @ui', async ({ authenticatedPage }) => {
    await severity('normal');

    await test.step('Act: click the Add button', async () => {
      await employeeList.clickAddEmployee();
    });
    await test.step('Assert: expected — /pim/addEmployee with firstName and lastName inputs visible', async () => {
      const addPage = new AddEmployeePage(authenticatedPage);
      await expect(authenticatedPage).toHaveURL(/pim\/addEmployee/);
      await expect(addPage.firstNameInput).toBeVisible();
      await expect(addPage.lastNameInput).toBeVisible();
    });
  });

  // --- Edge cases below ---

  test("search with SQL-injection payload is treated as literal input @regression @ui @edge", async () => {
    await severity('critical');

    await test.step("Act: search with a SQL-injection payload", async () => {
      await employeeList.searchByName("' OR 1=1 --");
    });
    await test.step('Assert: expected — "No Records Found" (payload treated as literal name)', async () => {
      await expect(employeeList.noRecordsText).toContainText('No Records Found');
    });
  });

  test("HTML injection payload in search does not execute @regression @ui @edge", async ({ authenticatedPage }) => {
    await severity('critical');
    let dialogFired = false;

    await test.step('Arrange: install dialog tripwire', async () => {
      authenticatedPage.on('dialog', async (d) => {
        dialogFired = true;
        await d.dismiss();
      });
    });
    await test.step('Act: search with an <img onerror> XSS payload', async () => {
      await employeeList.searchByName('<img src=x onerror=alert("xss")>');
    });
    await test.step('Assert: expected — no dialog fired', async () => {
      expect(dialogFired, 'actual: dialog fired = ' + dialogFired).toBe(false);
    });
    await test.step('Assert: expected — no <img onerror> injected into DOM', async () => {
      const injected = await authenticatedPage.locator('img[onerror]').count();
      expect(injected, `actual: ${injected} injected element(s)`).toBe(0);
    });
  });

  test('employee list API 500 does not crash the UI @regression @ui @edge', async ({ authenticatedPage }) => {
    await severity('critical');

    await test.step('Arrange: intercept employee-list API to return 500', async () => {
      await authenticatedPage.route('**/api/v2/pim/employees**', async (route) => {
        await route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"forced"}' });
      });
    });
    await test.step('Act: reload the employee list page', async () => {
      await employeeList.navigate();
    });
    await test.step('Assert: expected — page shell is still interactive (Search button visible)', async () => {
      await expect(employeeList.searchButton).toBeVisible({ timeout: 15_000 });
    });
    await test.step('Assert: expected — body did not white-screen', async () => {
      const bodyText = await authenticatedPage.locator('body').innerText();
      expect(bodyText.length, `actual: body text length = ${bodyText.length}`).toBeGreaterThan(50);
    });
  });
});
