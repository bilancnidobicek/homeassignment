# QA Automation Assignment — Framework Plan

## Assignment Goal

Build a Playwright + TypeScript test automation framework with:
- **20+ UI tests** for [OrangeHRM](https://opensource-demo.orangehrmlive.com/)
- **20+ API tests** for [Petstore API](https://petstore.swagger.io/)

---

## Approach Decision

**Start from scratch** using `npm init playwright@latest` as the base.

Reasons:
- Reviewers can see and evaluate every decision made
- Every line of code is explainable and defensible
- No unnecessary complexity from pre-built boilerplates
- Open-source frameworks are used as **inspiration only**, not copied directly

---

## Framework Components

| Component | Tool | Purpose |
|---|---|---|
| Language | TypeScript | Required by assignment |
| Test runner | Playwright | Required by assignment |
| Reporting | Allure | Visual HTML test results |
| Test data | `@faker-js/faker` | Dynamic, reusable test data |
| Environment config | `.env` + `dotenv` | Credentials & base URLs, never hardcoded |
| Code quality | ESLint + TypeScript strict | Clean, professional code |
| Documentation | `README.md` | Graded criteria — explains decisions |

---

## Project Structure

```
project/
├── tests/
│   ├── ui/          ← OrangeHRM UI test files
│   └── api/         ← Petstore API test files
├── pages/           ← Page Object Model classes (UI only)
├── fixtures/        ← Shared setup / teardown logic
├── helpers/         ← Reusable utility functions
├── .env             ← Credentials & base URLs (gitignored)
├── playwright.config.ts
└── README.md
```

---

## Key Design Decisions

### 1. Page Object Model (POM)
Each page of the web app gets its own class.  
- **Page class** = how to interact (selectors, actions, navigation)  
- **Test file** = what to verify (assertions, test logic)

**Why:** If a selector changes, fix it in one place only — not in every test.

```typescript
// pages/LoginPage.ts
class LoginPage {
  async login(username: string, password: string) {
    await page.fill('#username', username)
    await page.fill('#password', password)
    await page.click('#login-button')
  }
}

// test file - stays clean
await loginPage.login('Admin', 'admin123')
```

### 2. Fixtures
Handle login and shared setup once, reuse everywhere.  
No copy-pasting setup logic across tests.

### 3. Tags
Every test tagged (`@smoke`, `@ui`, `@api`) so subsets can be run easily.

---

## How to Execute Tests (Manual)

No CI/CD — all runs are manual via npm scripts or Playwright UI Mode.

| Command | Purpose |
|---|---|
| `npm run test` | Run all tests |
| `npm run test:ui` | Run UI tests only |
| `npm run test:api` | Run API tests only |
| `npm run test -- --grep @smoke` | Run by tag |
| `npx playwright test --ui` | Visual interactive runner |

### Playwright UI Mode
Built-in visual interface to:
- See all test cases listed
- Pick and run individual tests or groups
- Watch tests execute in real time
- See pass/fail instantly

---

## Execution Flow

```
.env (credentials/URLs)
  ↓
npm script → Playwright runs tests
  ↓
Allure → generates HTML report
```

---

## What Is NOT Included (Intentionally)

- No GitHub Actions / CI CD (manual execution only)
- No heavy frameworks or boilerplates
- No BDD / Cucumber (overkill for this assignment)

---

## Future Improvements (if more time)

- GitHub Actions pipeline for automated runs on push/PR
- Allure report hosted and published automatically via CI
- Parallelisation across multiple browsers
- Visual regression testing
- Test retry logic for flaky network-dependent tests
- Slack/email notification on test failures
- Docker container for consistent execution environment
