import { test } from "../src/fixtures/game.fixture";
import { isDevRun, tags } from "../src/config/projects";
import { runFullTutorWalkthrough } from "../src/scenarios/tutor/fullWalkthrough";

test.skip(!isDevRun(), "Tutor walkthrough runs only when AUTOTEST_ENV=dev");

test(`${tags.tutor} ${tags.devOnly} tutor walkthrough`, async ({ game }) => {
  await runFullTutorWalkthrough(game);
});
