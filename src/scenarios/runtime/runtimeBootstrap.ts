import { test } from "@playwright/test";
import type { GameSession } from "../../fixtures/game.fixture";

export async function runRuntimeBootstrap(game: GameSession): Promise<void> {
  await test.step("open game and wait ready", async () => {
    await game.open();
    await game.waitReady();
  });
}
