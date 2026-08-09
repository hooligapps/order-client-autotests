import { test } from "../src/fixtures/game.fixture";
import { tags } from "../src/config/projects";
import { runRuntimeBootstrap } from "../src/scenarios/runtime/runtimeBootstrap";

test(`${tags.bootstrap} runtime bootstrap`, async ({ game }) => {
  await runRuntimeBootstrap(game);
});
