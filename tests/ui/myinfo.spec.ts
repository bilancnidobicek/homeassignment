import { test, expect } from '../../fixtures/auth.fixture';
import { MyInfoPage } from '../../pages/MyInfoPage';
import { feature, severity } from '../../helpers/allure.helper';

test.describe('My Info', () => {
  let myInfo: MyInfoPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    await feature('My Info');
    myInfo = new MyInfoPage(authenticatedPage);
    await test.step('Arrange: navigate to My Info page', async () => {
      await myInfo.navigate();
    });
  });

  test('personal details are pre-filled @smoke @ui', async () => {
    await severity('critical');

    await test.step('Assert: expected — firstName and lastName inputs have non-empty values', async () => {
      await expect(myInfo.firstNameInput).not.toHaveValue('');
      await expect(myInfo.lastNameInput).not.toHaveValue('');
    });
  });

  test('save personal details shows success toast @sanity @ui', async () => {
    await severity('normal');

    await test.step('Act: re-save current firstName (no net change)', async () => {
      await myInfo.saveFirstName(await myInfo.firstNameInput.inputValue());
    });
    await test.step('Assert: expected — success toast is visible within 10s', async () => {
      await expect(myInfo.successToast).toBeVisible({ timeout: 10_000 });
    });
  });

  // --- Edge cases below ---

  test('first-name change persists after reload @regression @ui @edge', async () => {
    await severity('critical');
    const original = await myInfo.firstNameInput.inputValue();
    const modified = `QAtest${Date.now().toString().slice(-5)}`;

    try {
      await test.step(`Act: change firstName to "${modified}" and save`, async () => {
        await myInfo.saveFirstName(modified);
        await expect(myInfo.successToast).toBeVisible({ timeout: 10_000 });
      });
      await test.step('Act: reload the page', async () => {
        await myInfo.reload();
      });
      await test.step(`Assert: expected — firstName is still "${modified}" (persisted)`, async () => {
        await expect(myInfo.firstNameInput).toHaveValue(modified, { timeout: 10_000 });
      });
    } finally {
      await test.step(`Cleanup: restore firstName to "${original}"`, async () => {
        await myInfo.saveFirstName(original);
      });
    }
  });

  test('save API 500 does not show a success toast @regression @ui @edge', async ({ authenticatedPage }) => {
    await severity('critical');

    await test.step('Arrange: intercept save PUT and force a 500 response', async () => {
      await authenticatedPage.route('**/api/v2/pim/employees/**/personal-details', async (route) => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"forced"}' });
        } else {
          await route.continue();
        }
      });
    });
    await test.step('Act: re-save current firstName and wait for the forced 500', async () => {
      // Without waiting for the response, the "no toast" check below would pass before the save even happened
      const saveResponse = authenticatedPage.waitForResponse(
        (r) => r.url().includes('/personal-details') && r.request().method() === 'PUT'
      );
      await myInfo.saveFirstName(await myInfo.firstNameInput.inputValue());
      expect((await saveResponse).status()).toBe(500);
    });
    await test.step('Assert: expected — success toast does NOT appear', async () => {
      await expect(myInfo.successToast).not.toBeVisible({ timeout: 5_000 });
    });
    await test.step('Assert: expected — page stays interactive (Save button still enabled)', async () => {
      await expect(myInfo.saveButton).toBeEnabled();
    });
  });
});
