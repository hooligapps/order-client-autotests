import { test } from "../src/fixtures/game.fixture";
import { tags } from "../src/config/projects";
import { runFullTutorWalkthrough } from "../src/scenarios/tutor/fullWalkthrough";

test.describe.configure({ retries: 0 });
test.setTimeout(15 * 60_000);

test(`${tags.tutor} ${tags.full} tutor walkthrough`, async ({ game }) => {
  await runFullTutorWalkthrough(game);
});
