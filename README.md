# QA Automation Framework - OrangeHRM + Petstore

Playwright + TypeScript framework covering **30 UI tests** for OrangeHRM and **42 API tests** for Petstore (**72 tests total**).

Every test is tagged (`@smoke` / `@sanity` / `@regression`), structured in Arrange/Act/Assert steps, and reported through both Playwright HTML and Allure.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Install Chromium browser
npx playwright install chromium

# 3. Copy environment config
cp .env.example .env

# 4. Run all tests
npm test
```

---

## 1. Running Tests

The framework supports **four ways** to run: everything, by tag, by file, or by a single test title. Failed tests can be re-run with a single command - no need to re-run the whole suite.

### By tag

Every test carries exactly one **priority tag** (`@smoke`, `@sanity`, `@regression`) and optional **category tags** (`@ui`, `@api`, `@edge`, `@security`).

| Command | Runs | Purpose |
|---|---|---|
| `npm test` | all 72 | full suite |
| `npm run test:smoke` | 12 | critical happy paths — must pass before any deploy |
| `npm run test:sanity` | 26 | core positive functionality checks after smoke passes |
| `npm run test:regression` | 34 | edges, negatives, input handling, data-driven variations |
| `npm run test:security` | 5 | auth / session / data-exposure checks (see scope note below) |
| `npm run test:edge` | 24 | tricky-input & failure-mode subset |
| `npm run test:ui` | 30 | UI tests only (OrangeHRM) |
| `npm run test:api` | 42 | API tests only (Petstore) |

Any combination works — Playwright's `--grep` supports regex:

```bash
npx playwright test --grep "@smoke.*@ui"          # smoke UI only
npx playwright test --grep-invert @regression     # exclude regression
```

### By file or by single test

```bash
# Whole file
npx playwright test tests/ui/login.spec.ts

# By line number — runs ONLY the test at that line
npx playwright test tests/ui/login.spec.ts:29

# By title match — runs ONLY tests whose title contains this string
npx playwright test --grep "SQL injection payload in username"
```

### Re-running only failures

After a run, Playwright records which tests failed. To re-run **only those**:

```bash
npm run test:failed          # equivalent to: playwright test --last-failed
```

This is the fastest feedback loop when debugging — no need to rerun a passing suite.

### Interactive / debug modes

```bash
npm run test:ui-mode         # Playwright UI — pick and run tests visually with time-travel debugger
npm run test:debug           # Playwright Inspector — step through a specific test
npm run test:headed          # run with a visible browser
```

---

## 2. Test Tag Scheme

Every test declares its **priority** and its **category**.

### Priority (exactly one per test)

| Tag | When used | Example |
|---|---|---|
| `@smoke` | Critical happy path — deploy-blocker if it fails | `login with valid credentials`, `POST /pet` |
| `@sanity` | Core positive functionality after smoke passes | `search filters directory`, `PUT /pet updates` |
| `@regression` | Negative paths, edge cases, input handling, data-driven | `SQL injection payload rejected`, `unicode name roundtrip` |

### Category (one or more)

| Tag | Meaning |
|---|---|
| `@ui` | UI test (Playwright browser) |
| `@api` | API test (Playwright request context) |
| `@edge` | Tricky input, boundary, failure-mode |
| `@security` | Auth, session and data-exposure checks (auth redirect, logout, wrong password, password leak, header injection) |

### Distribution

```
@smoke     : 12 tests (17%)
@sanity    : 26 tests (36%)
@regression: 34 tests (47%)     ← includes @edge (24) and @security (5)
```

**Scope of `@security`:** these are functional checks of security-relevant behaviour, not security testing. Tests that submit SQL/XSS-style payloads are tagged `@edge` only — they prove the input is handled as plain text in that one place (e.g. the API stores `<script>` verbatim), which says nothing about whether a consuming UI is vulnerable.

---

## 3. Test Structure: Arrange / Act / Assert with `test.step()`

Every test is wrapped in `test.step()` blocks so the report shows **structured steps** with intent, duration, and per-step pass/fail. When an assertion fails, the report shows **both** the step it failed in AND the expected-vs-actual diff (that's Playwright's `expect()` built-in).

### Pattern

```typescript
test('POST /pet creates a new pet @smoke @api', async ({ request, testData }) => {
  await severity('critical');
  const pet = buildPet();
  let body: Pet;

  await test.step('Act: POST /v2/pet with a new pet', async () => {
    const response = await request.post('/v2/pet', { data: pet });
    testData.track(`/v2/pet/${pet.id}`);     // deleted after the test
    await expectStatus(response, 200);
    body = await response.json();
  });

  await test.step('Assert: expected — response matches Pet schema and echoes input', async () => {
    expect(body).toMatchObject(petSchema);
    expect(body.id).toBe(pet.id);           // expected: pet.id     actual: printed by expect() on failure
    expect(body.name).toBe(pet.name);
    expect(body.status).toBe('available');
  });
});
```

### What the reviewer sees in the report

- **Steps view** (Allure & Playwright HTML) — each `test.step()` renders as a nested item with its own timing and pass/fail state.
- **Expected / Actual** — Playwright's `expect()` prints both on any failure. For explicit clarity, most assertions also embed the actual value in the message: `expect(count, \`actual: ${count} rows\`).toBeGreaterThan(0)`.
- **Failure attribution** — a failure inside step 3 tells you the test got through Arrange + Act cleanly and only the assertion broke — much faster to triage than a single blob of code.

Beyond AAA, tests use several other techniques for stronger signals:

- **Dialog tripwires** for XSS tests — `page.on('dialog', ...)` sets a boolean; if a payload ever executes, the boolean flips and the test fails.
- **Network interception** for failure paths — `page.route().fulfill({ status: 500 })` forces API errors deterministically to test the UI's error handling.
- **`finally` cleanup** on write tests — the persist-after-reload test restores the original state so the shared demo account isn't polluted, even if the test fails mid-way.
- **Checked setup + automatic API cleanup** — the `testData` fixture ([fixtures/api.fixture.ts](fixtures/api.fixture.ts)) creates pets/users/orders, fails the test immediately if setup doesn't return 200, and deletes everything it created after the test.
- **Only self-created data is asserted on** — e.g. `findByStatus` creates a pet with the given status and looks for that ID, instead of validating arbitrary records other people left on the shared server.
- **Explicit synchronization** — page objects wait for the specific API response or element they depend on, never `networkidle` or fixed sleeps.
- **Schema validation** on API responses — `toMatchObject(petSchema)` catches contract regressions (field renames, type changes) that field-by-field assertions would miss.

---

## 4. Reporting

Three reporters are wired in [playwright.config.ts](playwright.config.ts):

| Reporter | Purpose | Location |
|---|---|---|
| `list` | Live console output during runs | terminal |
| `html` | Playwright HTML report (per-test steps, screenshots, video, trace) | `playwright-report/` |
| `allure-playwright` | Allure raw results — grouped by feature & severity, historical trends | `allure-results/` → `allure-report/` |

### Attachments on failure (built-in)

```typescript
use: {
  screenshot: 'only-on-failure',   // screenshot attached to failed tests
  trace: 'retain-on-failure',      // trace file (DOM + network + console) kept on failure
}
```

Both HTML and Allure surface these attachments inline on the failing test.

### Retries

Retries are **off locally** so a flaky test is noticed and investigated. CI retries up to 2 times to absorb demo-server hiccups; a test that only passes on retry is marked *flaky* in the report.

### Viewing the reports

```bash
# Playwright HTML
npm test
npm run report                  # opens http://localhost:9323

# Allure
npm run allure:report           # runs tests + generates + opens Allure

# Or step-by-step
npm test
npm run allure:generate         # writes allure-report/
npm run allure:open             # opens the report
```

### What each report shows

- **Playwright HTML** — tag chips per test, step tree, expected/actual diff, screenshot + video on fail, trace viewer with time-travel.
- **Allure** — Overview donut (pass/fail/broken/skipped), **Features view** (Authentication, Pets, …) via `feature()` annotations, **Severity view** (critical/normal/minor) via `severity()` annotations, historical trends across runs.

---

## Project Structure

```
swiss/
├── tests/
│   ├── ui/                          ← OrangeHRM UI tests (30)
│   │   ├── login.spec.ts            (11 tests)
│   │   ├── dashboard.spec.ts        ( 4 tests)
│   │   ├── employee.spec.ts         ( 7 tests)
│   │   ├── myinfo.spec.ts           ( 4 tests)
│   │   └── directory.spec.ts        ( 4 tests)
│   └── api/                         ← Petstore API tests (42)
│       ├── pets.spec.ts             (17 tests)
│       ├── store.spec.ts            (10 tests)
│       └── users.spec.ts            (15 tests)
├── pages/                           ← Page Object Model
├── fixtures/
│   ├── auth.fixture.ts              ← Shared login setup
│   └── api.fixture.ts               ← Checked API setup + automatic cleanup
├── helpers/
│   ├── api.helper.ts                ← API types, data builders + status helper
│   └── allure.helper.ts             ← feature() + severity() type-safe wrappers
├── ci-example/
│   └── e2e-after-deploy.yml         ← Example CI job to copy into the app repo (not run here)
├── playwright.config.ts
├── tsconfig.json
├── .env.example
└── README.md
```

---

## Design Decisions

### Page Object Model (POM)
Each OrangeHRM page has its own class in `pages/`. Page classes expose locators and actions (how to interact); **all assertions live in the tests** (what to verify). Every UI test goes through a page object, so a selector change is fixed in one place.

### Shared Authentication Fixture
`auth.fixture.ts` extends Playwright's `test` with an `authenticatedPage` fixture. Tests that need a logged-in state declare it as a parameter — no duplicated login boilerplate.

### Data-Driven Testing
Invalid-login scenarios live in a single table; a `for` loop generates one test per row. Adding a case is one line, not a copy-pasted test body.

### API Data Builders
`buildPet` / `buildUser` / `buildOrder` in `helpers/api.helper.ts` generate randomized IDs to avoid collisions on the shared demo API. Each returns a valid object that can be spread with overrides.

### API Schema Validation
API responses are matched against schema descriptors (`toMatchObject(petSchema)`), not just individual fields — catches contract regressions like a field disappearing or changing type.

### Known Defects Fail Every Run
Tests that expose real Petstore bugs assert the *correct* behaviour and are **not** marked as expected failures, so they fail on every run until Petstore fixes the bug. The defects stay visible in every report instead of being hidden behind a green suite.

| Test | Defect |
|---|---|
| `login with wrong password is rejected` | `/user/login` returns 200 for any password |
| `GET /user response never exposes password field` | plaintext password returned by `GET /user/{username}` |
| `order with negative quantity is either rejected or coerced` | negative quantities accepted and stored |

---

## Running in CI (example)

This repo has no CI of its own: tests should run when the **application** changes, not when the tests do.
[ci-example/e2e-after-deploy.yml](ci-example/e2e-after-deploy.yml) is a template to copy into the website or API repo as `.github/workflows/e2e-after-deploy.yml`:

1. The app's pipeline builds and deploys to a staging/preview environment and outputs its URL.
2. The `e2e` job checks out this framework and runs the `ui` or `api` project with `UI_BASE_URL` / `API_BASE_URL` set to that URL.
3. The result shows on the dev's commit/PR; making the `e2e` check required blocks merges on failure. The HTML report is uploaded as an artifact.

Placeholders to fill in are marked `TODO` in the file (tests repo name, project, deploy step, secrets).

---

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `UI_BASE_URL` | `https://opensource-demo.orangehrmlive.com` | OrangeHRM demo URL |
| `API_BASE_URL` | `https://petstore.swagger.io` | Petstore API host |
| `ORANGEHRM_USERNAME` | `Admin` | Login username |
| `ORANGEHRM_PASSWORD` | `admin123` | Login password |

---

## Limitations Encountered

- **OrangeHRM is a shared demo server** — Admin password and employee data are periodically reset by the community. Tests avoid asserting on specific employee names or counts where possible.
- **Petstore is a shared demo API** — IDs from other users' test runs can interfere. `randomInt` generates IDs in the 100k–999k range to reduce collisions, tests only assert on data they created themselves, and created data is deleted after each test. Random IDs reduce collisions but do not give true isolation.
- **OrangeHRM tests share one Admin account** — the only write (first-name change) restores the original value in `finally`, but a parallel run by someone else could still interfere.
- **Petstore quirks are locked in as tests** rather than assumed away — e.g. `findByStatus?status=invalid` returns 200 not 400, duplicate username POST returns 200 not 409. If the API is ever fixed, those tests fail as a signal, not a surprise.
- **OrangeHRM breadcrumb only shows module name** — page identity checks use form elements or URLs instead of breadcrumb text.

---

## Future Improvements

### CI/CD
- Allure report deployment to GitHub Pages after each CI run
- Nightly scheduled run against the test environment, to catch changes outside of deploys
- Docker container for reproducible test environments

### Framework
- Visual regression testing via `toHaveScreenshot` on critical components
- `storageState` reuse to skip repeated logins in large UI suites
- Cross-browser UI project (Firefox + WebKit)
- Slack/email webhook on failure via a custom reporter
