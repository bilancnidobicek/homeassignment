import { test, expect } from '../../fixtures/auth.fixture';
import { DirectoryPage } from '../../pages/DirectoryPage';
import { feature, severity } from '../../helpers/allure.helper';

test.describe('Directory', () => {
  let directoryPage: DirectoryPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    await feature('Directory');
    directoryPage = new DirectoryPage(authenticatedPage);
    await test.step('Arrange: navigate to directory page', async () => {
      await directoryPage.navigate();
    });
  });

  test('directory page loads @smoke @ui', async () => {
    await severity('critical');

    await test.step('Assert: expected — directory page shell is visible', async () => {
      await expect(directoryPage.pageHeader).toContainText('Directory');
    });
  });

  test('directory shows results by default @sanity @ui', async () => {
    await severity('normal');

    await test.step('Assert: expected — at least one directory card is rendered', async () => {
      await expect(directoryPage.resultCards.first()).toBeVisible();
    });
  });

  test('search by name shows only matching employees @sanity @ui', async () => {
    await severity('normal');
    let name = '';

    await test.step('Arrange: pick an employee name from the unfiltered list', async () => {
      name = (await directoryPage.cardNames.first().innerText()).trim();
    });
    await test.step(`Act: search directory for "${name}"`, async () => {
      await directoryPage.searchByName(name);
    });
    await test.step(`Assert: expected — at least one card, and every card is "${name}"`, async () => {
      // The unfiltered list contains other names, so this only passes once the filter has applied
      await expect
        .poll(async () => (await directoryPage.cardNames.allInnerTexts()).map((n) => n.trim()).filter((n) => n !== name), {
          message: 'cards not matching the searched name',
        })
        .toEqual([]);
      await expect(directoryPage.cardNames.first()).toHaveText(name);
    });
  });

  test('reset restores full directory @sanity @ui', async () => {
    await severity('normal');
    let initialCount = 0;
    let name = '';

    await test.step('Arrange: capture initial (unfiltered) count and an employee name', async () => {
      initialCount = await directoryPage.resultCards.count();
      name = (await directoryPage.cardNames.first().innerText()).trim();
    });
    await test.step('Act: filter by that name, then reset', async () => {
      await directoryPage.searchByName(name);
      await directoryPage.reset();
    });
    await test.step('Assert: expected — count returns to initial value', async () => {
      await expect(directoryPage.resultCards).toHaveCount(initialCount);
    });
  });
});
