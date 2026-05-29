import type { GameSession } from "../../fixtures/game.fixture";

export type ProdReleaseSmokeOptions = {
  expectedScreen?: string;
};

export async function runProdReleaseSmoke(
  game: GameSession,
  options: ProdReleaseSmokeOptions = {}
): Promise<void> {
  await game.open();
  await game.waitReady();

  if (options.expectedScreen) {
    await game.waitScreenOpened(options.expectedScreen);
  }
}
