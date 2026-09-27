import { Locator, Page } from '@playwright/test';

export class LoginPage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  // "Invalid credentials" alert (server round-trip) or inline "Required" field validation
  readonly errorMessage: Locator;

  constructor(private readonly page: Page) {
    // Password inputs have no implicit ARIA role, so both fields are located by placeholder
    this.usernameInput = page.getByPlaceholder('Username');
    this.passwordInput = page.getByPlaceholder('Password');
    this.loginButton = page.getByRole('button', { name: 'Login' });
    this.errorMessage = page.locator('.oxd-alert-content-text, .oxd-input-field-error-message').first();
  }

  async navigate() {
    await this.page.goto('/web/index.php/auth/login');
    // Vue SPA — wait for the login form to actually render before returning
    await this.loginButton.waitFor({ state: 'visible', timeout: 20_000 });
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
