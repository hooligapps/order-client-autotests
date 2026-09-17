# order-client-autotests

Playwright e2e-autotests for a deployed WebGL client. The project does not build Unity artifacts and does not manage releases. It only receives a ready build URL, opens the client with `?autotest=true`, and validates behavior through structured autotest events.

## Scope

- Run against arbitrary CDN/dev/prod URLs.
- Use one explicit `BUILD_URL` for every environment.
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

Recommended Docker command for the full tutorial flow:

```bash
docker compose run --rm tutor-full
```

Available services:

- `playwright` runs the full suite.
- `bootstrap` runs `@bootstrap`.
- `tutor` runs `@tutor`.
- `tutor-full` runs `@full`.

Equivalent npm shortcuts:

```bash
npm run docker:build
npm run docker:test
npm run docker:test:bootstrap
npm run docker:test:tutor
npm run docker:test:tutor:full
```

`Makefile` shortcuts are also available:

```bash
make build
make bootstrap
make tutor-full
```

Reports are written to local directories:

- `./playwright-report`
- `./test-results`

## Environment

Copy `.env.example` to `.env` and fill in the URLs.

```env
BUILD_URL=https://dev-cdn.example.com/build_123/
AUTOTEST_QUERY=
PLAYWRIGHT_HEADLESS=1
PLAYWRIGHT_BROWSER_CONSOLE_LIVE=0
PLAYWRIGHT_BROWSER_LOGS_ON_SUCCESS=0
PLAYWRIGHT_DEFAULT_TIMEOUT_MS=120000
PLAYWRIGHT_NAVIGATION_TIMEOUT_MS=120000
PLAYWRIGHT_READY_TIMEOUT_MS=180000
PLAYWRIGHT_EVENT_TIMEOUT_MS=30000
PLAYWRIGHT_POLL_INTERVAL_MS=200
```

URL resolution rules:

1. The `--url` argument of `npm run test:url` sets the URL for that run.
2. Otherwise `BUILD_URL` is required.
3. `autotest=true` is always appended.

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
npm run test:url -- --url "https://stage.example.com/build/"
npm run test:bootstrap
npm run test:tutor
npm run test:tutor:full
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
BUILD_URL=https://cdn.example.com/build_555/ AUTOTEST_QUERY=customToken=abc npm test
npm run test:url -- --url "https://stage.example.com/build/" --grep "@full" --workers=1
npm run test:url -- --url "$STAGE_URL" "${TEST_ARGS[@]}"
```

`test:url` removes `--url` (or `--build-url`) from the arguments, exposes it to the existing configuration as `BUILD_URL`, and forwards every other argument to Playwright.

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

- `tests/runtime.bootstrap.spec.ts`
  - basic runtime bootstrap
  - page opens, `window.__autotest` is available, and `app.ready` is reached
- `tests/tutor.first-step.spec.ts`
  - configurable first tutorial segment check driven by `TUTOR_*` env variables
- `tests/tutor.walkthrough.spec.ts`
  - full coordinate-based walkthrough of the main tutorial flow

Current tutor scenarios are coordinate-based: Playwright performs real mouse clicks, while the client validates progress through structured autotest events.

Tutor first-step coverage supports optional `TUTOR_*` environment overrides, so coordinates and expected tutor events can be changed without editing the test code. They are intentionally omitted from the standard env files because the built-in defaults cover `BattleTower1`, including the whole first battle segment.

For a full tutorial run, use `tests/tutor.walkthrough.spec.ts`. The scenario is defined in code in `src/scenarios/tutor/fullWalkthrough.ts`, because one `TutorStepId` may contain several user actions and it is easier to debug this flow in TypeScript than in a long JSON file.

### Tutor tests

There are two different tutor workflows and they solve different problems:

- `tutor.first-step.spec.ts`
  - quick check for the first tutorial segment
  - driven by `TUTOR_STEP_ID`, `TUTOR_CLICK_X`, `TUTOR_CLICK_Y`, `TUTOR_EXPECTED_EVENT`, and optional `TUTOR_HIGHLIGHT_NAME`
  - by default, `BattleTower1` follows the same battle flow as the full walkthrough until the first battle is completed
  - for other steps, it still works as a short configurable event-driven check
- `tutor.walkthrough.spec.ts`
  - end-to-end walkthrough of the full tutorial chain
  - hardcoded coordinates live in `src/scenarios/tutor/coords.ts`
  - step orchestration and event waits live in `src/scenarios/tutor/fullWalkthrough.ts`

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
