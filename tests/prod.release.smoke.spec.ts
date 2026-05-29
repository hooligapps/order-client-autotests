import { test } from "../src/fixtures/game.fixture";
import { isProdRun, tags } from "../src/config/projects";
import { runProdReleaseSmoke } from "../src/scenarios/release/prodReleaseSmoke";

test.skip(!isProdRun(), "Prod release smoke runs only when AUTOTEST_ENV=prod");

test(
  `${tags.smoke} ${tags.release} ${tags.prodSafe} ${tags.prodOnly} prod release smoke is stable`,
  async ({ game }) => {
    await runProdReleaseSmoke(game);
  }
);
