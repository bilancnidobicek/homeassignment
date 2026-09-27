import { Locator, Page } from '@playwright/test';

export class EmployeeListPage {
  readonly searchButton: Locator;
  readonly tableRows: Locator;
  readonly noRecordsText: Locator;
  private readonly addEmployeeButton: Locator;
  private readonly resetButton: Locator;
  private readonly employeeNameInput: Locator;

  constructor(private readonly page: Page) {
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.tableRows = page.locator('.oxd-table-body .oxd-table-row');
    this.noRecordsText = page.locator('.orangehrm-horizontal-padding span');
    this.addEmployeeButton = page.getByRole('button', { name: 'Add' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });
    this.employeeNameInput = page.getByPlaceholder('Type for hints...').first();
  }

  async navigate() {
    await this.page.goto('/web/index.php/pim/viewEmployeeList');
  }

  async clickAddEmployee() {
    await this.addEmployeeButton.click();
  }

  // Resolves once the filtered employee list has come back from the API
  async searchByName(name: string) {
    await this.employeeNameInput.fill(name);
    const listLoaded = this.page.waitForResponse(
      (r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'GET'
    );
    await this.searchButton.click();
    await listLoaded;
  }

  async clickReset() {
    await this.resetButton.click();
  }
}
