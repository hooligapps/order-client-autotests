import { test } from "../src/fixtures/game.fixture";
import { tutorConfig } from "../src/config/tutor";
import { tags } from "../src/config/projects";
import { runTutorFirstStep } from "../src/scenarios/tutor/firstStep";

test(`${tags.tutor} tutor first step`, async ({ game }) => {
  await runTutorFirstStep(game, {
    stepId: tutorConfig.stepId,
    clickX: tutorConfig.clickX,
    clickY: tutorConfig.clickY,
    expectedTutorEvent: tutorConfig.expectedTutorEvent,
    highlightName: tutorConfig.highlightName
  });
});
