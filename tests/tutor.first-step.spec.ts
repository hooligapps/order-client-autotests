import { test } from "../src/fixtures/game.fixture";
import { env } from "../src/config/env";
import { isDevRun, tags } from "../src/config/projects";
import { runTutorFirstStep } from "../src/scenarios/tutor/firstStep";

test.skip(!isDevRun(), "Tutor smoke runs only when AUTOTEST_ENV=dev");
test.skip(!env.expectTutor, "Tutor smoke requires PLAYWRIGHT_EXPECT_TUTOR=1");

test(`${tags.smoke} ${tags.tutor} ${tags.devOnly} tutor first step`, async ({ game }) => {
  await runTutorFirstStep(game, {
    stepId: "BattleTower1",
    clickX: 812,
    clickY: 642,
    expectedTutorEvent: "ClickContinueInMessage"
  });
});
