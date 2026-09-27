import { Locator, Page } from '@playwright/test';

export class DashboardPage {
  readonly sidebar: Locator;
  readonly quickLaunchCards: Locator;

  constructor(private readonly page: Page) {
    this.sidebar = page.locator('.oxd-sidepanel-body');
    this.quickLaunchCards = page.locator('.oxd-sheet .orangehrm-quick-launch-card');
  }

  async logout() {
    await this.page.locator('.oxd-userdropdown-tab').click();
    await this.page.getByRole('menuitem', { name: 'Logout' }).click();
  }

  async navigateToMenuItem(menuText: string) {
    await this.page.locator('.oxd-main-menu-item', { hasText: menuText }).click();
  }
}
