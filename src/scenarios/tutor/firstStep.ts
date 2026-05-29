import type { GameSession } from "../../fixtures/game.fixture";

export type TutorFirstStepScenario = {
  stepId: string;
  clickX: number;
  clickY: number;
  expectedTutorEvent: string;
  highlightName?: string;
};

export async function runTutorFirstStep(
  game: GameSession,
  scenario: TutorFirstStepScenario
): Promise<void> {
  await game.open();
  await game.waitReady();
  await game.waitTutorMainStarted();
  await game.waitTutorStepStarted(scenario.stepId);
  await game.waitTutorReplicaShown(scenario.stepId);
  await game.waitTutorPointerShown();

  if (scenario.highlightName) {
    await game.waitTutorHighlightRequested(scenario.highlightName);
  }

  await game.clickAt(scenario.clickX, scenario.clickY);
  await game.waitTutorEvent(scenario.expectedTutorEvent);
  await game.waitTutorStepSaved(scenario.stepId);
  await game.waitTutorStepCompleted(scenario.stepId);
}
