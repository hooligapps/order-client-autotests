import { test } from "../src/fixtures/game.fixture";
import { isDevRun, tags } from "../src/config/projects";
import { runFullTutorWalkthrough } from "../src/scenarios/tutor/fullWalkthrough";

test.skip(!isDevRun(), "Tutor walkthrough runs only when AUTOTEST_ENV=dev");
test.describe.configure({ retries: 0 });
test.setTimeout(6 * 60_000);

test(`${tags.tutor} ${tags.devOnly} tutor walkthrough`, async ({ game }) => {
  await runFullTutorWalkthrough(game);
});
