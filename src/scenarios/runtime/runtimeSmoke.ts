import type { GameSession } from "../../fixtures/game.fixture";

export async function runRuntimeSmoke(game: GameSession): Promise<void> {
  await game.open();
  await game.waitReady();
}
