import { test } from "../src/fixtures/game.fixture";
import { tags } from "../src/config/projects";
import { runRuntimeSmoke } from "../src/scenarios/runtime/runtimeSmoke";

test(`${tags.smoke} runtime is ready`, async ({ game }) => {
  await runRuntimeSmoke(game);
});
