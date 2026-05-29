import { test } from "../src/fixtures/game.fixture";
import { isDevRun, tags } from "../src/config/projects";
import { runDevReleaseSmoke } from "../src/scenarios/release/devReleaseSmoke";

test.skip(!isDevRun(), "Dev release smoke runs only when AUTOTEST_ENV=dev");

test(
  `${tags.smoke} ${tags.release} ${tags.devOnly} dev release smoke is stable`,
  async ({ game }) => {
    await runDevReleaseSmoke(game);
  }
);
