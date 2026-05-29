import type { GameSession } from "../../fixtures/game.fixture";

export type DevReleaseSmokeOptions = {
  expectedScreen?: string;
  expectedDialog?: string;
};

export async function runDevReleaseSmoke(
  game: GameSession,
  options: DevReleaseSmokeOptions = {}
): Promise<void> {
  await game.open();
  await game.waitReady();

  if (options.expectedScreen) {
    await game.waitScreenOpened(options.expectedScreen);
  }

  if (options.expectedDialog) {
    await game.waitDialogOpened(options.expectedDialog);
    await game.waitDialogClosed(options.expectedDialog);
  }
}
