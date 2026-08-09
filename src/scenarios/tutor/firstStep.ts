import { test } from "@playwright/test";
import type { GameSession } from "../../fixtures/game.fixture";
import { tutorCoords, walkthroughCoords } from "./coords";

export type TutorFirstStepScenario = {
  stepId: string;
  clickX: number;
  clickY: number;
  expectedTutorEvent: string;
  highlightName?: string;
  playThroughBattle?: boolean;
};

async function runBattleTower1FirstStep(game: GameSession): Promise<void> {
  const coords = walkthroughCoords.battleTower1;

  await game.waitTutorStepStarted("BattleTower1");
  await game.waitTutorReplicaShown("BattleTower1");
  await game.waitTutorHighlightRequested("dashboard_battle_btn");

  const towerClick = await game.clickAtAndWaitEventAfter(
    tutorCoords.dashboard_battle_btn.x,
    tutorCoords.dashboard_battle_btn.y,
    { source: "tutor", type: "event_emitted", name: "TowerClick" },
    30_000,
    tutorCoords.dashboard_battle_btn.label
  );

  await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStartLoading" },
    towerClick.sequence
  );
  const battleStarted = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStarted" },
    towerClick.sequence,
    60_000
  );
  await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStartHeroTurn" },
    battleStarted.sequence,
    60_000
  );

  const moveAdvice1 = await game.waitBattleMoveAdviceAfter(battleStarted.sequence);
  await game.playBattleMoveAdvice(moveAdvice1.advice);
  const match1 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "Match3HeroTurn" },
    moveAdvice1.event.sequence
  );
  const enemyTurn1 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleEndEnemyTurn" },
    match1.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower1" },
    enemyTurn1.sequence
  );
  const heroTurn2 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStartHeroTurn" },
    enemyTurn1.sequence
  );

  const moveAdvice2 = await game.waitBattleMoveAdviceAfter(heroTurn2.sequence);
  await game.playBattleMoveAdvice(moveAdvice2.advice);
  const match2 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "Match3HeroTurn" },
    moveAdvice2.event.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower1" },
    match2.sequence
  );

  const heroTurn3 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStartHeroTurn" },
    match2.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "highlight_requested", name: "match3_elements_hint", stepId: "BattleTower1" },
    heroTurn3.sequence
  );
  const preHintMoveAdvice3 = await game.waitBattleMoveAdviceAfter(heroTurn3.sequence);
  const continueClicked = await game.clickAtAndWaitEventAfter(
    coords.continueMessage.x,
    coords.continueMessage.y,
    { source: "tutor", type: "event_emitted", name: "ClickContinueInMessage" },
    30_000,
    coords.continueMessage.label
  );
  const hintHidden = await game.waitEventAfter(
    { source: "tutor", type: "action_executed", name: "HideMatch3ElementsHint", stepId: "BattleTower1" },
    continueClicked.sequence
  );
  let moveAdvice3 = preHintMoveAdvice3;
  try {
    moveAdvice3 = await game.waitBattleMoveAdviceAfter(hintHidden.sequence, 1500);
  } catch {
    // Some builds do not re-emit move_advice after the tutor hint closes.
  }
  await game.playBattleMoveAdvice(moveAdvice3.advice);
  const match3 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "Match3HeroTurn" },
    moveAdvice3.event.sequence
  );
  const battleWon = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleEnemyDefeated" },
    match3.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "step_saved", stepId: "BattleTower1" },
    battleWon.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleWinDialogOpened" },
    battleWon.sequence
  );

  const postWinContinue = await game.clickAtAndWaitEventAfter(
    coords.postWinContinue.x,
    coords.postWinContinue.y,
    { source: "tutor", type: "event_emitted", name: "ClickContinueInMessage" },
    30_000,
    coords.postWinContinue.label
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower1" },
    postWinContinue.sequence
  );

  const winDialogClosed = await game.clickAtAndWaitEventAfter(
    tutorCoords.win_dialog_claim_btn.x,
    tutorCoords.win_dialog_claim_btn.y,
    { source: "tutor", type: "event_emitted", name: "BattleWinDialogClosed" },
    30_000,
    tutorCoords.win_dialog_claim_btn.label ?? "win_dialog_claim_btn"
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower1" },
    winDialogClosed.sequence
  );

  await game.waitEventAfter(
    { source: "ui", type: "dialog_opened", dialog: "GirlNewInfoDialog" },
    winDialogClosed.sequence
  );

  const finalMessageContinue = await game.clickAtAndWaitEventAfter(
    coords.newGirlMessageContinue.x,
    coords.newGirlMessageContinue.y,
    { source: "tutor", type: "event_emitted", name: "ClickContinueInMessage" },
    30_000,
    coords.newGirlMessageContinue.label
  );
  await game.waitEventAfter(
    { source: "tutor", type: "step_completed", stepId: "BattleTower1" },
    finalMessageContinue.sequence
  );
}

export async function runTutorFirstStep(
  game: GameSession,
  scenario: TutorFirstStepScenario
): Promise<void> {
  await test.step("open game and wait tutor ready", async () => {
    await game.open();
    await game.waitReady();
    await game.waitTutorMainStarted();
  });

  if (scenario.stepId === "BattleTower1" && scenario.playThroughBattle !== false) {
    await test.step("battle tower 1 first segment", async () => {
      await runBattleTower1FirstStep(game);
    });
    return;
  }

  await test.step(`generic first-step: ${scenario.stepId}`, async () => {
    await game.waitTutorStepStarted(scenario.stepId);
    await game.waitTutorReplicaShown(scenario.stepId);

    if (scenario.highlightName) {
      await game.waitTutorHighlightRequested(scenario.highlightName);
    }

    await game.clickAtAndWaitEventAfter(
      scenario.clickX,
      scenario.clickY,
      {
        source: "tutor",
        type: "event_emitted",
        name: scenario.expectedTutorEvent,
        stepId: scenario.stepId
      },
      undefined,
      "tutor_first_step_click"
    );
  });
}
