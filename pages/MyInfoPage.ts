import { Locator, Page } from '@playwright/test';

export class MyInfoPage {
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly saveButton: Locator;
  readonly successToast: Locator;

  constructor(private readonly page: Page) {
    this.firstNameInput = page.locator('input[name="firstName"]');
    this.lastNameInput = page.locator('input[name="lastName"]');
    // The page has several Save buttons; the first one belongs to Personal Details
    this.saveButton = page.getByRole('button', { name: 'Save' }).first();
    this.successToast = page.locator('.oxd-toast-content--success');
  }

  // Resolves once the personal-details form has been populated from the API
  async navigate() {
    const detailsLoaded = this.page.waitForResponse(
      (r) => r.url().includes('/personal-details') && r.request().method() === 'GET'
    );
    await this.page.goto('/web/index.php/pim/viewMyDetails');
    await detailsLoaded;
  }

  async reload() {
    const detailsLoaded = this.page.waitForResponse(
      (r) => r.url().includes('/personal-details') && r.request().method() === 'GET'
    );
    await this.page.reload();
    await detailsLoaded;
  }

  async saveFirstName(name: string) {
    await this.firstNameInput.fill(name);
    await this.saveButton.click();
  }
}
