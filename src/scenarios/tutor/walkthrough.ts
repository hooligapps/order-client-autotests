import type { GameSession } from "../../fixtures/game.fixture";

export type TutorWalkthroughAction = {
  stepId: string;
  clickX: number;
  clickY: number;
  expectedTutorEvent?: string;
  highlightName?: string;
  waitReplicaShown?: boolean;
  waitPointer?: boolean;
  waitStepSaved?: boolean;
  waitStepCompleted?: boolean;
};

async function runTutorWalkthroughAction(
  game: GameSession,
  step: TutorWalkthroughAction,
  shouldWaitStepStart: boolean
): Promise<void> {
  if (shouldWaitStepStart) {
    await game.waitTutorStepStarted(step.stepId);
  }

  if (step.waitReplicaShown !== false) {
    await game.waitTutorReplicaShown(step.stepId);
  }

  if (step.waitPointer !== false) {
    await game.waitTutorPointerShown();
  }

  if (step.highlightName) {
    await game.waitTutorHighlightRequested(step.highlightName);
  }

  const afterClickSequence = await game.checkpoint();
  await game.clickAt(step.clickX, step.clickY);

  if (step.expectedTutorEvent) {
    await game.waitTutorEvent(step.expectedTutorEvent, step.stepId, afterClickSequence);
  }

  if (step.waitStepSaved !== false) {
    await game.waitEventAfter({
      source: "tutor",
      type: "step_saved",
      stepId: step.stepId
    }, afterClickSequence);
  }

  if (step.waitStepCompleted !== false) {
    await game.waitEventAfter({
      source: "tutor",
      type: "step_completed",
      stepId: step.stepId
    }, afterClickSequence);
  }
}

export async function bootstrapTutorWalkthrough(game: GameSession): Promise<void> {
  await game.open();
  await game.waitReady();
  await game.waitTutorMainStarted();
}

export async function runTutorWalkthroughActions(
  game: GameSession,
  steps: TutorWalkthroughAction[],
  initialPreviousStepId?: string
): Promise<void> {
  let previousStepId = initialPreviousStepId;

  for (const step of steps) {
    await runTutorWalkthroughAction(game, step, step.stepId !== previousStepId);
    previousStepId = step.stepId;
  }
}

export async function runTutorWalkthroughSteps(
  game: GameSession,
  steps: TutorWalkthroughAction[]
): Promise<void> {
  await bootstrapTutorWalkthrough(game);
  await runTutorWalkthroughActions(game, steps);
}
