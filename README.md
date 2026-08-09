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

Recommended local dev command for the full tutorial flow:

```bash
docker compose --profile dev run --rm dev-tutor-walkthrough
```

Available services:

- `playwright` runs the full suite.
- `smoke` runs `@smoke`.
- `release` runs `@release`.
- `tutor` runs `@tutor`.
- `dev` runs the full suite with `AUTOTEST_ENV=dev`.
- `dev-smoke` runs smoke in `dev`.
- `dev-tutor` runs tutor in `dev`.
- `dev-tutor-walkthrough` runs the full tutor walkthrough in `dev`.
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
npm run docker:test:dev:tutor:walkthrough
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
PLAYWRIGHT_HEADLESS=1
PLAYWRIGHT_BROWSER_CONSOLE_LIVE=0
PLAYWRIGHT_BROWSER_LOGS_ON_SUCCESS=0
PLAYWRIGHT_DEFAULT_TIMEOUT_MS=120000
PLAYWRIGHT_NAVIGATION_TIMEOUT_MS=120000
PLAYWRIGHT_READY_TIMEOUT_MS=180000
PLAYWRIGHT_EVENT_TIMEOUT_MS=30000
PLAYWRIGHT_POLL_INTERVAL_MS=200

TUTOR_STEP_ID=BattleTower1
TUTOR_CLICK_X=812
TUTOR_CLICK_Y=642
TUTOR_EXPECTED_EVENT=ClickContinueInMessage
TUTOR_HIGHLIGHT_NAME=
```

URL resolution rules:

1. If `BUILD_URL` is set, it is used directly.
2. Otherwise `AUTOTEST_ENV=dev` uses `DEV_BASE_URL`.
3. Otherwise `AUTOTEST_ENV=prod` uses `PROD_BASE_URL`.
4. `autotest=true` is always appended.

Optional additional query parameters may be passed via `AUTOTEST_QUERY`, for example `customHeroId=1&customToken=abc`.

Browser logging controls:

- `PLAYWRIGHT_BROWSER_CONSOLE_LIVE=1` prints browser `console`, `pageerror`, and failed request logs into the test runner output.
- `PLAYWRIGHT_BROWSER_LOGS_ON_SUCCESS=1` also attaches browser logs to the Playwright report for passed tests, not only failed ones.

Key test milestones are always printed into the runner output by the `GameSession` facade, for example open, age-gate handling, `__autotest` detection, and `app.ready`.

Polling controls:

- `PLAYWRIGHT_POLL_INTERVAL_MS=200` controls how often the test checks for `window.__autotest` and expected autotest events.

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

Useful local commands:

```bash
PLAYWRIGHT_HEADLESS=0 npx playwright test --ui
PLAYWRIGHT_HEADLESS=0 npx playwright test --grep "tutor walkthrough"
PLAYWRIGHT_HEADLESS=0 npx playwright show-report
```

Notes:

- `--ui` is the most convenient local mode when you want to pick a spec manually and watch the browser.
- Docker services are intended for batch runs. Playwright UI is expected to be run locally from the repository.

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

Current coverage:

- `tests/runtime.smoke.spec.ts`
  - basic runtime bootstrap
  - page opens, `window.__autotest` is available, and `app.ready` is reached
- `tests/dev.release.smoke.spec.ts`
  - release-oriented smoke checks against `dev`
- `tests/prod.release.smoke.spec.ts`
  - safe release checks against `prod`
- `tests/tutor.first-step.spec.ts`
  - configurable one-step tutor smoke driven by `TUTOR_*` env variables
- `tests/tutor.walkthrough.spec.ts`
  - full coordinate-based walkthrough of the main tutorial flow in `dev`

Current tutor scenarios are coordinate-based: Playwright performs real mouse clicks, while the client validates progress through structured autotest events.

Tutor smoke is configured through `TUTOR_*` environment variables, so coordinates and expected tutor events can be changed without editing the test code. The default scenario expects `BattleTower1` and a click that emits `ClickContinueInMessage`.

For a full tutorial run, use `tests/tutor.walkthrough.spec.ts`. The scenario is defined in code in `src/scenarios/tutor/fullWalkthrough.ts`, because one `TutorStepId` may contain several user actions and it is easier to debug this flow in TypeScript than in a long JSON file.

### Tutor tests

There are two different tutor workflows and they solve different problems:

- `tutor.first-step.spec.ts`
  - quick smoke for a single tutor interaction
  - driven by `TUTOR_STEP_ID`, `TUTOR_CLICK_X`, `TUTOR_CLICK_Y`, `TUTOR_EXPECTED_EVENT`, and optional `TUTOR_HIGHLIGHT_NAME`
  - useful when client-side tutor markup changed and you want to validate one target quickly
- `tutor.walkthrough.spec.ts`
  - end-to-end walkthrough of the full tutorial chain
  - hardcoded coordinates live in `src/scenarios/tutor/coords.ts`
  - step orchestration and event waits live in `src/scenarios/tutor/fullWalkthrough.ts`
  - intended for `AUTOTEST_ENV=dev`

The walkthrough is event-driven first and coordinate-driven second:

- clicks are done by Playwright against fixed page coordinates
- progress is validated through autotest events from `app`, `ui`, `tutor`, `battle`, and `chat`
- helper methods in `GameSession` always wait for a concrete event boundary before proceeding to the next action

### How to update tutor walkthrough coordinates

When the client layout changes:

1. Run the walkthrough locally in headful mode.
2. Add a temporary browser click logger if needed.
3. Reproduce the broken step manually in the same build.
4. Compare manual click coordinates with the scenario coordinates in `src/scenarios/tutor/coords.ts`.
5. Update only the affected coordinate block.
6. Re-run the specific walkthrough, not the whole suite first.

Recommended commands:

```bash
PLAYWRIGHT_HEADLESS=0 npx playwright test --grep "tutor walkthrough"
PLAYWRIGHT_HEADLESS=0 npx playwright test --ui
```

### How tutor logs work

`GameSession` prints compact progress logs into the test runner output. The common shapes are:

- `wait#912/5000 tutor:event_emitted:GirlLevelUp:LevelUpGirl2 | tutor:step_completed:LevelUpGirl2`
  - after event sequence `912`, wait up to `5000ms` for one of these filters
- `✓ tutor:event_emitted:GirlLevelUp:LevelUpGirl2#913`
  - the wait completed with sequence `913`
- `click label=fullWalkthrough.ts:727:11 x=1214 y=632`
  - Playwright clicked the page at these coordinates
- `segment start after=930 label=step:LastMessage`
  - the walkthrough switched to a new logical segment

Rules of thumb when reading tutor logs:

- `source:type:name:stepId#sequence` is the important part
- `wait#<after>/<timeout>` means "search only after this event sequence"
- seeing the same final event twice usually means two different waits observed the same event, not that the client emitted it twice
- `highlight_requested` is usually a stronger UI targeting signal than `replica_shown`
- `step_completed` is a tutor boundary, while `step_started:<NextStep>` is already the next segment

### Reports and artifacts

Every run writes:

- `playwright-report/`
  - HTML report
- `test-results/`
  - JSON and JUnit outputs
- `test-results/artifacts/`
  - screenshots, traces, and videos according to Playwright config

Current Playwright artifact policy:

- screenshots: `only-on-failure`
- trace: `on-first-retry`
- video: `retain-on-failure`

The JSON report is also useful for debugging because it contains base64-encoded attachments such as:

- `console-messages.txt`
- `page-errors.txt`
- `failed-requests.txt`
- `autotest-events.json`
- `autotest-last-event.json`

This is important for tutor debugging: even if the HTML report view is noisy, `autotest-last-event.json` often shows the true last structured state that the game reached.

### Typical debugging workflow

For a tutor failure:

1. Open the runner output and find the last `wait#...` line.
2. Check which exact filter timed out.
3. Open the HTML report and inspect video or screenshot.
4. Read `autotest-last-event.json` from `test-results/results.json` or report attachments.
5. Decide whether the issue is:
   - wrong coordinate
   - missing client event
   - overly broad or stale event filter
   - transition already moved to a later state than the test expected

Prefer fixing the event logic first. Add new delays only when the client genuinely has an animation or readiness gap with no reliable event to wait for.

## CI

Two GitHub Actions workflows are included:

- `dev-e2e.yml` for pre-release dev verification
- `prod-e2e.yml` for post-release safe smoke

Both workflows publish Playwright HTML, JUnit, JSON, traces, and screenshots as artifacts.
