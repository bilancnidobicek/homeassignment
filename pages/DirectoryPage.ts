import { Locator, Page } from '@playwright/test';

export class DirectoryPage {
  readonly pageHeader: Locator;
  readonly resultCards: Locator;
  readonly cardNames: Locator;
  private readonly nameInput: Locator;
  private readonly searchButton: Locator;
  private readonly resetButton: Locator;

  constructor(private readonly page: Page) {
    this.pageHeader = page.locator('.oxd-topbar-header-breadcrumb h6');
    this.resultCards = page.locator('.orangehrm-directory-card');
    this.cardNames = page.locator('.orangehrm-directory-card-header');
    this.nameInput = page.getByPlaceholder('Type for hints...');
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });
  }

  // Resolves once the initial (unfiltered) list of cards has rendered
  async navigate() {
    await this.page.goto('/web/index.php/directory/viewDirectory');
    await this.resultCards.first().waitFor();
  }

  // The name field is an autocomplete: a hint must be picked before Search will filter.
  // Hints match on a single name part, so type the first name and pick the exact full name.
  // Resolves once the filtered list has come back from the API.
  async searchByName(fullName: string) {
    await this.nameInput.fill(fullName.split(' ')[0]);
    await this.page.getByRole('option', { name: fullName, exact: true }).first().click();
    const listLoaded = this.waitForDirectoryResponse();
    await this.searchButton.click();
    await listLoaded;
  }

  async reset() {
    const listLoaded = this.waitForDirectoryResponse();
    await this.resetButton.click();
    await listLoaded;
  }

  private waitForDirectoryResponse() {
    return this.page.waitForResponse(
      (r) => r.url().includes('/api/v2/directory/employees') && r.request().method() === 'GET'
    );
  }
}
