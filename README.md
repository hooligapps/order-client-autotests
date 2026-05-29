# order-client-autotests

Playwright e2e-autotests for a deployed WebGL client. The project does not build Unity artifacts and does not manage releases. It only receives a ready build URL, opens the client with `?autotest=true`, and validates behavior through structured autotest events.

## Scope

- Run against arbitrary CDN/dev/prod URLs.
- Support `dev` and `prod` environments.
- Validate `window.__autotest` and structured events from `app`, `ui`, and `tutor`.
- Keep scenarios in code through a thin helper/facade layer.
- Produce HTML/JUnit/JSON reports, screenshots on failure, and traces on retry.

## Requirements

- Node.js 20+
- npm 10+

## Install

```bash
npm install
npx playwright install --with-deps chromium
```

## Docker

The project can run fully inside Docker using the official Playwright image.

1. Create `.env` from `.env.example`.
2. Build the image.
3. Run the needed suite.

```bash
cp .env.example .env
docker compose build
docker compose run --rm smoke
```

Available services:

- `playwright` runs the full suite.
- `smoke` runs `@smoke`.
- `release` runs `@release`.
- `tutor` runs `@tutor`.
- `dev` runs the full suite with `AUTOTEST_ENV=dev`.
- `dev-smoke` runs smoke in `dev`.
- `dev-tutor` runs tutor in `dev`.
- `prod` runs `@prod-safe` in `prod`.
- `prod-release` runs `@release` in `prod`.

Equivalent npm shortcuts:

```bash
npm run docker:build
npm run docker:test
npm run docker:test:smoke
npm run docker:test:release
npm run docker:test:tutor
npm run docker:test:dev
npm run docker:test:dev:smoke
npm run docker:test:dev:tutor
npm run docker:test:prod
npm run docker:test:prod:release
```

`Makefile` shortcuts are also available:

```bash
make build
make dev-smoke
make dev-tutor
make prod
make prod-release
```

Reports are written to local directories:

- `./playwright-report`
- `./test-results`

## Environment

Copy `.env.example` to `.env` and fill in the URLs.

```env
AUTOTEST_ENV=dev
DEV_BASE_URL=https://dev-cdn.example.com/build_123/
PROD_BASE_URL=https://prod-cdn.example.com/la_7_1/
BUILD_URL=
AUTOTEST_QUERY=
PLAYWRIGHT_EXPECT_TUTOR=0
PLAYWRIGHT_HEADLESS=1
```

URL resolution rules:

1. If `BUILD_URL` is set, it is used directly.
2. Otherwise `AUTOTEST_ENV=dev` uses `DEV_BASE_URL`.
3. Otherwise `AUTOTEST_ENV=prod` uses `PROD_BASE_URL`.
4. `autotest=true` is always appended.

Optional additional query parameters may be passed via `AUTOTEST_QUERY`, for example `customHeroId=1&customToken=abc`.

## Commands

```bash
npm test
npm run test:smoke
npm run test:release
npm run test:tutor
npm run test:dev
npm run test:prod
npm run report
```

Examples:

```bash
AUTOTEST_ENV=dev DEV_BASE_URL=https://dev-cdn.example.com/build_123/ npm run test:smoke
AUTOTEST_ENV=prod PROD_BASE_URL=https://prod-cdn.example.com/la_7_1/ npm run test:release -- --grep @prod-safe
BUILD_URL=https://cdn.example.com/build_555/ AUTOTEST_QUERY=customToken=abc npm test
```

## Project layout

```text
order-client-autotests/
├── package.json
├── tsconfig.json
├── playwright.config.ts
├── .env.example
├── src/
│   ├── config/
│   ├── fixtures/
│   ├── helpers/
│   ├── scenarios/
│   └── types/
├── tests/
└── .github/workflows/
```

## Test strategy

Tests use the `GameSession` facade rather than raw Playwright calls in spec files. Scenario logic lives in `src/scenarios`, and specs only compose tagged suites.

Current first-version coverage:

- Runtime smoke
- Dev release smoke
- Prod safe release smoke
- Tutor first-step smoke

Current tutor scenarios are coordinate-based: Playwright performs real mouse clicks, while the client validates progress through structured autotest events.

## CI

Two GitHub Actions workflows are included:

- `dev-e2e.yml` for pre-release dev verification
- `prod-e2e.yml` for post-release safe smoke

Both workflows publish Playwright HTML, JUnit, JSON, traces, and screenshots as artifacts.
