import type { GameSession } from "../../fixtures/game.fixture";

export async function runRuntimeBootstrap(game: GameSession): Promise<void> {
  await game.open();
  await game.waitReady();
}
