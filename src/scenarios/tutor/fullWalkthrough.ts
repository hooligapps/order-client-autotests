import type { GameSession } from "../../fixtures/game.fixture";
import type { AutotestEvent } from "../../types/autotest";
import { introCoords, tutorCoords, tutorTimings, walkthroughCoords } from "./coords";
import { bootstrapTutorWalkthrough } from "./walkthrough";

async function click(game: GameSession, point: { x: number; y: number }): Promise<void> {
  await game.clickAt(point.x, point.y);
}

async function clickTarget(game: GameSession, target: keyof typeof tutorCoords): Promise<void> {
  await click(game, tutorCoords[target]);
}

type TutorStepStart = {
  stepStarted: AutotestEvent,
  firstReplica: AutotestEvent,
};

async function beginTutorStep(game: GameSession, stepId: string): Promise<TutorStepStart> {
  const stepStarted = await game.waitTutorStepStarted(stepId);
  const firstReplica = await game.waitTutorReplicaShown(stepId, stepStarted.sequence);
  return { stepStarted, firstReplica };
}

async function skipIntroVideo(game: GameSession, name: string): Promise<void> {
  await game.waitTutorIntroStarted(name);
  await game.waitMs(tutorTimings.introReadyDelayMs);
  await click(game, introCoords.video);
  await game.waitMs(tutorTimings.introSkipDelayMs);
  await click(game, introCoords.skip);
  await game.waitTutorIntroCompleted(name);
}

async function closeGirlNewInfoDialog(
  game: GameSession,
  point: { x: number; y: number },
  options?: { waitForOpen?: boolean, waitForOpenAfterSequence?: number }
): Promise<AutotestEvent> {
  if (options?.waitForOpenAfterSequence !== undefined) {
    await game.waitEventAfter(
      { source: "ui", type: "dialog_opened", dialog: "GirlNewInfoDialog" },
      options.waitForOpenAfterSequence
    );
  } else if (options?.waitForOpen) {
    const dialogAlreadyOpened = await game.hasEvent({
      source: "ui",
      type: "dialog_opened",
      dialog: "GirlNewInfoDialog"
    });

    if (!dialogAlreadyOpened) {
      const sequence = await game.checkpoint();
      await game.waitEventAfter(
        { source: "ui", type: "dialog_opened", dialog: "GirlNewInfoDialog" },
        sequence
      );
    }
  }

  const closeSequence = await game.checkpoint();
  await click(game, point);
  return game.waitEventAfter(
    { source: "ui", type: "dialog_closed", dialog: "GirlNewInfoDialog" },
    closeSequence
  );
}

async function clickChatAnswer(game: GameSession): Promise<void> {
  await click(game, walkthroughCoords.chat1.answer);
  await game.waitMs(tutorTimings.chatAnswerSettleDelayMs);
}

async function clickChatAnswerAt(game: GameSession, point: { x: number; y: number }): Promise<void> {
  await click(game, point);
  await game.waitMs(tutorTimings.chatAnswerSettleDelayMs);
}

async function openChatPhoto(
  game: GameSession,
  stepId: string,
  point: { x: number; y: number },
  maxAttempts = 3
): Promise<AutotestEvent> {
  for (let i = 0; i < maxAttempts; i += 1) {
    const sequence = await game.checkpoint();
    await click(game, point);

    try {
      const galleryClicked = await game.waitEventAfter(
        { source: "tutor", type: "event_emitted", name: "GalleryButtonClicked", stepId },
        sequence
      );

      return await game.waitEventAfter(
        { source: "tutor", type: "event_emitted", name: "PhotoOpened", stepId },
        galleryClicked.sequence
      );
    } catch {
      await game.waitMs(300);
    }
  }

  const sequence = await game.checkpoint();
  return game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "PhotoOpened", stepId },
    sequence
  );
}

async function advanceChatUntilCompleted(game: GameSession, afterSequence: number): Promise<void> {
  for (let i = 0; i < 12; i += 1) {
    if (await game.hasEventAfter({ source: "tutor", type: "event_emitted", name: "ChatStoryCompleted" }, afterSequence)) {
      return;
    }

    await clickChatAnswer(game);
  }

  await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "ChatStoryCompleted" },
    afterSequence
  );
}

async function advanceChatAtUntilCompleted(
  game: GameSession,
  point: { x: number; y: number },
  afterSequence: number
): Promise<void> {
  for (let i = 0; i < 12; i += 1) {
    if (await game.hasEventAfter({ source: "tutor", type: "event_emitted", name: "ChatStoryCompleted" }, afterSequence)) {
      return;
    }

    await clickChatAnswerAt(game, point);
  }

  await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "ChatStoryCompleted" },
    afterSequence
  );
}

async function levelUpUntilComplete(
  game: GameSession,
  stepId: string,
  point: { x: number; y: number },
  maxClicks = 12
): Promise<void> {
  const afterSequence = await game.checkpoint();
  const perClickTimeoutMs = 5000;

  for (let i = 0; i < maxClicks; i += 1) {
    if (await game.hasEventAfter({ source: "tutor", type: "event_emitted", name: "GirlLevelUpComplete", stepId }, afterSequence)) {
      return;
    }

    if (await game.hasEventAfter({ source: "tutor", type: "highlight_requested", name: "close_btn", stepId }, afterSequence)) {
      return;
    }

    const sequence = await game.checkpoint();
    await click(game, point);

    try {
      const nextEvent = await game.waitAnyEventAfter([
        { source: "tutor", type: "event_emitted", name: "GirlLevelUp", stepId },
        { source: "tutor", type: "event_emitted", name: "GirlLevelUpComplete", stepId },
        { source: "tutor", type: "highlight_requested", name: "close_btn", stepId }
      ], sequence, perClickTimeoutMs);

      if (nextEvent.type === "highlight_requested" || nextEvent.name === "GirlLevelUpComplete") {
        return;
      }
    } catch {
      if (await game.hasEventAfter({ source: "tutor", type: "highlight_requested", name: "close_btn", stepId }, sequence)) {
        return;
      }

      await game.waitMs(300);
      continue;
    }
  }
}

async function runBattleTower1(game: GameSession): Promise<void> {
  const coords = walkthroughCoords.battleTower1;

  await game.waitTutorStepStarted("BattleTower1");
  // await skipIntroVideo(game, "intro_1");
  // await skipIntroVideo(game, "intro_2");

  await game.waitTutorReplicaShown("BattleTower1");
  await game.waitTutorHighlightRequested("dashboard_battle_btn");

  let sequence = await game.checkpoint();
  await clickTarget(game, "dashboard_battle_btn");
  const towerClick = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "TowerClick" },
    sequence
  );

  await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStartLoading" },
    towerClick.sequence
  );
  const battleStarted = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStarted" },
    towerClick.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStartHeroTurn" },
    battleStarted.sequence
  );

  sequence = await game.checkpoint();
  await click(game, coords.match3Move1Start);
  await click(game, coords.match3Move1End);
  const match1 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "Match3HeroTurn" },
    sequence
  );
  const enemyTurn1 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleEndEnemyTurn" },
    match1.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower1" },
    enemyTurn1.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStartHeroTurn" },
    enemyTurn1.sequence
  );

  sequence = await game.checkpoint();
  await click(game, coords.match3Move2Start);
  await click(game, coords.match3Move2End);
  const match2 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "Match3HeroTurn" },
    sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower1" },
    match2.sequence
  );

  sequence = await game.checkpoint();
  await click(game, coords.continueMessage);
  await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "ClickContinueInMessage" },
    sequence
  );

  sequence = await game.checkpoint();
  await click(game, coords.match3Move3Start);
  await click(game, coords.match3Move3End);
  const match3 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "Match3HeroTurn" },
    sequence
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

  sequence = await game.checkpoint();
  await click(game, coords.postWinContinue);
  const postWinContinue = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "ClickContinueInMessage" },
    sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower1" },
    postWinContinue.sequence
  );

  sequence = await game.checkpoint();
  await clickTarget(game, "win_dialog_claim_btn");
  const winDialogClosed = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleWinDialogClosed" },
    sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower1" },
    winDialogClosed.sequence
  );

  await game.waitEventAfter(
    { source: "ui", type: "dialog_opened", dialog: "GirlNewInfoDialog" },
    winDialogClosed.sequence
  );

  sequence = await game.checkpoint();
  await click(game, coords.newGirlMessageContinue);
  const finalMessageContinue = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "ClickContinueInMessage" },
    sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "step_completed", stepId: "BattleTower1" },
    finalMessageContinue.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "step_started", stepId: "BattleTower2" },
    finalMessageContinue.sequence
  );
}

async function runBattleTower2(game: GameSession): Promise<void> {
  const coords = walkthroughCoords.battleTower2;

  await closeGirlNewInfoDialog(game, walkthroughCoords.chat1.firstNewGirlClose);
  const afterFirstGirlClose = await game.checkpoint();
  await game.waitEventAfter(
    { source: "ui", type: "dialog_opened", dialog: "GirlNewInfoDialog" },
    afterFirstGirlClose
  );
  const beforeSecondGirlClose = await game.checkpoint();
  await closeGirlNewInfoDialog(game, walkthroughCoords.chat1.secondNewGirlClose);
  const battleEnterShown = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleEnterDialogShown" },
    beforeSecondGirlClose
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower2" },
    battleEnterShown.sequence
  );

  let sequence = await game.checkpoint();
  await click(game, coords.deckCard1);
  const deckChanged1 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "DeckChanged" },
    sequence
  );

  await click(game, coords.deckCard2);
  const deckChanged2 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "DeckChanged" },
    deckChanged1.sequence
  );

  await click(game, coords.deckCard3);
  const deckIsFull = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "DeckIsFull" },
    deckChanged2.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower2" },
    deckIsFull.sequence
  );

  sequence = await game.checkpoint();
  await click(game, coords.fightButton);
  const battleStartLoading = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStartLoading" },
    sequence
  );
  const battleStarted = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStarted" },
    battleStartLoading.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStartHeroTurn" },
    battleStarted.sequence
  );

  sequence = await game.checkpoint();
  await click(game, coords.match3Move1Start);
  await click(game, coords.match3Move1End);
  const match1 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "Match3HeroTurn" },
    sequence
  );
  const enemyTurn1 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleEndEnemyTurn" },
    match1.sequence
  );
  const heroTurn2 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStartHeroTurn" },
    enemyTurn1.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower2" },
    heroTurn2.sequence
  );

  sequence = await game.checkpoint();
  await clickTarget(game, "interact_match3BoosterBomb");
  const bombUsed = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "Match3HeroTurn" },
    sequence
  );
  const bombAction = await game.waitEventAfter(
    { source: "tutor", type: "action_executed", stepId: "BattleTower2" },
    bombUsed.sequence
  );
  const enemyTurn2 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleEndEnemyTurn" },
    bombAction.sequence
  );
  const heroTurn3 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStartHeroTurn" },
    enemyTurn2.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower2" },
    heroTurn3.sequence
  );

  sequence = await game.checkpoint();
  await click(game, coords.match3Move2Start);
  await click(game, coords.match3Move2End);
  const match2 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "Match3HeroTurn" },
    sequence
  );
  const enemyTurn3 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleEndEnemyTurn" },
    match2.sequence
  );
  const heroTurn4 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStartHeroTurn" },
    enemyTurn3.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower2" },
    heroTurn4.sequence
  );

  sequence = await game.checkpoint();
  await clickTarget(game, "interact_match3BoosterFlash");
  const flashUsed = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "Match3HeroTurn" },
    sequence
  );
  const flashAction = await game.waitEventAfter(
    { source: "tutor", type: "action_executed", stepId: "BattleTower2" },
    flashUsed.sequence
  );
  const battleWon = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleEnemyDefeated" },
    flashAction.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "step_saved", stepId: "BattleTower2" },
    battleWon.sequence
  );
  const winDialogOpened = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleWinDialogOpened" },
    battleWon.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower2" },
    winDialogOpened.sequence
  );

  sequence = await game.checkpoint();
  await click(game, coords.continueMessage);
  const continueMessage = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "ClickContinueInMessage" },
    sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower2" },
    continueMessage.sequence
  );

  sequence = await game.checkpoint();
  await clickTarget(game, "win_dialog_claim_btn");
  const dialogClosed = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleWinDialogClosed" },
    sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "step_completed", stepId: "BattleTower2" },
    dialogClosed.sequence
  );
}

async function runChat1(game: GameSession): Promise<void> {
  await game.waitTutorStepStarted("Chat1");
  const chat1Started = await game.checkpoint();
  await game.waitEventAfter(
    { source: "ui", type: "dialog_opened", dialog: "GirlNewInfoDialog" },
    chat1Started
  );

  const beforeThirdGirlClose = await game.checkpoint();
  await closeGirlNewInfoDialog(game, walkthroughCoords.chat1.thirdNewGirlClose);
  const dashboardOpened = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "DashboardOpened" },
    beforeThirdGirlClose
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "Chat1" },
    dashboardOpened.sequence
  );
  await game.waitTutorHighlightRequested("dashboard_chat_btn");

  let sequence = await game.checkpoint();
  await clickTarget(game, "dashboard_chat_btn");
  const chatClicked = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "DashboardOpenChat" },
    sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "ChatOpened" },
    chatClicked.sequence
  );

  const beforeChatAnswers = await game.checkpoint();
  await advanceChatUntilCompleted(game, beforeChatAnswers);

  const storyCompleted = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "ChatStoryCompleted" },
    beforeChatAnswers
  );
  await game.waitEventAfter(
    { source: "tutor", type: "step_saved", stepId: "Chat1" },
    storyCompleted.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "Chat1" },
    storyCompleted.sequence
  );
  await game.waitTutorHighlightRequested("chat_photo");

  const photoOpened = await openChatPhoto(game, "Chat1", tutorCoords.chat_photo);

  sequence = await game.checkpoint();
  await click(game, walkthroughCoords.chat1.galleryClose);
  const photoClosed = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "PhotoClosed" },
    sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "Chat1" },
    photoClosed.sequence
  );
  await game.waitTutorHighlightRequested("chat_close_btn");

  sequence = await game.checkpoint();
  await clickTarget(game, "chat_close_btn");
  const chatClosed = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "ChatClosed" },
    sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "step_completed", stepId: "Chat1" },
    chatClosed.sequence
  );
}

async function runBattleTower3(game: GameSession): Promise<void> {
  const coords = walkthroughCoords.battleTower3;

  const { firstReplica } = await beginTutorStep(game, "BattleTower3");
  await game.waitTutorHighlightRequested("dashboard_battle_btn", "BattleTower3", firstReplica.sequence);

  let sequence = await game.checkpoint();
  await clickTarget(game, "dashboard_battle_btn");
  const towerClick = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "TowerClick", stepId: "BattleTower3" },
    sequence
  );
  const towerShown = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "TowerShown", stepId: "BattleTower3" },
    towerClick.sequence
  );
  const towerReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower3" },
    towerShown.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "highlight_requested", stepId: "BattleTower3", name: "tower_battle_btn" },
    towerReplica.sequence
  );

  sequence = await game.checkpoint();
  await clickTarget(game, "tower_battle_btn");
  const battleClick = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleClick", stepId: "BattleTower3" },
    sequence
  );
  const battleEnterShown = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleEnterDialogShown", stepId: "BattleTower3" },
    battleClick.sequence
  );
  const battleEnterReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower3" },
    battleEnterShown.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "highlight_requested", stepId: "BattleTower3", name: "interact_battleEnterGirlCard" },
    battleEnterReplica.sequence
  );

  sequence = await game.checkpoint();
  await clickTarget(game, "interact_battleEnterGirlCard");
  const deckIsFull = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "DeckIsFull", stepId: "BattleTower3" },
    sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "pointer_shown", stepId: "BattleTower3" },
    deckIsFull.sequence
  );

  sequence = await game.checkpoint();
  await clickTarget(game, "battle_enter_fight_btn");
  const battleStartLoading = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStartLoading", stepId: "BattleTower3" },
    sequence
  );
  const battleStarted = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStarted", stepId: "BattleTower3" },
    battleStartLoading.sequence
  );
  const abilityCharged = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleAbilityCharged", stepId: "BattleTower3" },
    battleStarted.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower3" },
    abilityCharged.sequence
  );

  sequence = await game.checkpoint();
  let abilityClickPoint = tutorCoords.interact_firstBattlerWithAbility;
  try {
    const ready = await game.waitBattleAbilityReadyAfter(abilityCharged.sequence, "BattleTower3", 5000);
    if (ready.activation.x > 0 && ready.activation.y > 0) {
      await game.clickUnityScreenPoint(ready.activation.x, ready.activation.y);
    } else {
      await click(game, abilityClickPoint);
    }
  } catch {
    await click(game, abilityClickPoint);
  }
  const useAbility = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "UseBattleAbility", stepId: "BattleTower3" },
    sequence
  );
  await game.waitBattleAbilityActivatedAfter(useAbility.sequence, "BattleTower3");
  const abilityUsed = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleAbilityUsed", stepId: "BattleTower3" },
    useAbility.sequence
  );

  let turnBoundary = abilityUsed.sequence;
  let battleEnemyDefeated: number | null = null;

  while (battleEnemyDefeated === null) {
    const nextEvent = await game.waitAnyEventAfter([
      { source: "battle", type: "move_advice", stepId: "BattleTower3" },
      { source: "tutor", type: "replica_shown", stepId: "BattleTower3" },
      { source: "tutor", type: "event_emitted", name: "BattleEnemyDefeated", stepId: "BattleTower3" }
    ], turnBoundary);

    const isBattleEnemyDefeated =
      nextEvent.source === "tutor"
      && nextEvent.type === "event_emitted"
      && nextEvent.name === "BattleEnemyDefeated";

    if (isBattleEnemyDefeated) {
      battleEnemyDefeated = nextEvent.sequence;
      break;
    }

    if (nextEvent.source === "tutor" && nextEvent.type === "replica_shown") {
      sequence = await game.checkpoint();
      await click(game, coords.continueMessage);
      await game.waitEventAfter(
        { source: "tutor", type: "event_emitted", name: "ClickContinueInMessage", stepId: "BattleTower3" },
        sequence
      );

      const moveAdvice = await game.waitBattleMoveAdviceAfter(nextEvent.sequence);
      await game.playBattleMoveAdvice(moveAdvice.advice);
      const match = await game.waitEventAfter(
        { source: "tutor", type: "event_emitted", name: "Match3HeroTurn", stepId: "BattleTower3" },
        moveAdvice.event.sequence
      );
      turnBoundary = match.sequence;
      continue;
    }

    const moveAdvice = await game.waitBattleMoveAdviceAfter(turnBoundary);
    await game.playBattleMoveAdvice(moveAdvice.advice);
    const match = await game.waitEventAfter(
      { source: "tutor", type: "event_emitted", name: "Match3HeroTurn", stepId: "BattleTower3" },
      moveAdvice.event.sequence
    );
    turnBoundary = match.sequence;
  }

  const stepSaved = await game.waitEventAfter(
    { source: "tutor", type: "step_saved", stepId: "BattleTower3" },
    battleEnemyDefeated
  );
  const winDialogOpened = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleWinDialogOpened", stepId: "BattleTower3" },
    stepSaved.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower3" },
    winDialogOpened.sequence
  );

  sequence = await game.checkpoint();
  await click(game, coords.postWinContinue);
  const postWinContinue = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "ClickContinueInMessage", stepId: "BattleTower3" },
    sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower3" },
    postWinContinue.sequence
  );

  sequence = await game.checkpoint();
  await click(game, coords.claimButton);
  const dialogClosed = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleWinDialogClosed", stepId: "BattleTower3" },
    sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "step_completed", stepId: "BattleTower3" },
    dialogClosed.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "step_started", stepId: "TowerChest" },
    dialogClosed.sequence
  );
}

async function runTowerChest(game: GameSession): Promise<void> {
  await game.waitTutorStepStarted("TowerChest");
  await game.waitTutorReplicaShown("TowerChest");
  await game.waitTutorHighlightRequested("interact_readySlot");

  let sequence = await game.checkpoint();
  await click(game, tutorCoords.interact_readySlot);
  const slotOpen = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "SlotOpen", stepId: "TowerChest" },
    sequence
  );
  const stepSaved = await game.waitEventAfter(
    { source: "tutor", type: "step_saved", stepId: "TowerChest" },
    slotOpen.sequence
  );
  const rewardsDialogOpened = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "RewardsDialogOpened", stepId: "TowerChest" },
    stepSaved.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "TowerChest" },
    rewardsDialogOpened.sequence
  );

  sequence = await game.checkpoint();
  await click(game, tutorCoords.rewards_claim_btn);
  const rewardsClaimed = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "RewardsClaimed", stepId: "TowerChest" },
    sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "step_completed", stepId: "TowerChest" },
    rewardsClaimed.sequence
  );
}

async function runTowerWinsChest(game: GameSession): Promise<void> {
  await game.waitTutorStepStarted("TowerWinsChest");
  await game.waitTutorReplicaShown("TowerWinsChest");
  await game.waitTutorHighlightRequested("tower_wins_banner");

  let sequence = await game.checkpoint();
  await click(game, tutorCoords.tower_wins_banner);
  const rewardsDialogOpened = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "RewardsDialogOpened", stepId: "TowerWinsChest" },
    sequence
  );
  const stepSaved = await game.waitEventAfter(
    { source: "tutor", type: "step_saved", stepId: "TowerWinsChest" },
    rewardsDialogOpened.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "TowerWinsChest" },
    stepSaved.sequence
  );

  sequence = await game.checkpoint();
  await click(game, tutorCoords.rewards_claim_btn);
  const rewardsClaimed = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "RewardsClaimed", stepId: "TowerWinsChest" },
    sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "step_completed", stepId: "TowerWinsChest" },
    rewardsClaimed.sequence
  );
}

async function runLevelUpGirl(game: GameSession): Promise<void> {
  const { firstReplica: dashboardReplica } = await beginTutorStep(game, "LevelUpGirl");
  await game.waitTutorHighlightRequested("dashboard_girls_btn", "LevelUpGirl", dashboardReplica.sequence);
  await click(game, tutorCoords.dashboard_girls_btn);
  const girlsOpened = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "DashboardOpenGirls", stepId: "LevelUpGirl" },
    dashboardReplica.sequence
  );

  const girlsReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "LevelUpGirl" },
    girlsOpened.sequence
  );
  await game.waitTutorHighlightRequested("interact_firstGirlCard", "LevelUpGirl", girlsReplica.sequence);
  await click(game, tutorCoords.interact_firstGirlCard);
  const girlInfoOpen = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "GirlInfoOpen", stepId: "LevelUpGirl" },
    girlsReplica.sequence
  );

  const mainParamsReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "LevelUpGirl" },
    girlInfoOpen.sequence
  );
  await game.waitTutorHighlightRequested("girl_info_main_params", "LevelUpGirl", mainParamsReplica.sequence);
  await click(game, tutorCoords.girl_info_main_params);
  const mainParamsContinue = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "ClickContinueInMessage", stepId: "LevelUpGirl" },
    mainParamsReplica.sequence
  );

  const battleParamsReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "LevelUpGirl" },
    mainParamsContinue.sequence
  );
  await game.waitTutorHighlightRequested("girl_info_battle_params", "LevelUpGirl", battleParamsReplica.sequence);
  await click(game, tutorCoords.girl_info_battle_params);
  const battleParamsContinue = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "ClickContinueInMessage", stepId: "LevelUpGirl" },
    battleParamsReplica.sequence
  );

  const abilitiesReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "LevelUpGirl" },
    battleParamsContinue.sequence
  );
  await game.waitTutorHighlightRequested("girl_info_abilities", "LevelUpGirl", abilitiesReplica.sequence);
  await click(game, tutorCoords.girl_info_abilities);
  const abilitiesContinue = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "ClickContinueInMessage", stepId: "LevelUpGirl" },
    abilitiesReplica.sequence
  );

  const levelUpReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "LevelUpGirl" },
    abilitiesContinue.sequence
  );
  await game.waitTutorHighlightRequested("girl_info_level_up_btn", "LevelUpGirl", levelUpReplica.sequence);
  await levelUpUntilComplete(game, "LevelUpGirl", tutorCoords.girl_info_level_up_btn);

  const closeReplica = await game.waitTutorReplicaShown("LevelUpGirl", abilitiesContinue.sequence);
  await game.waitTutorHighlightRequested("close_btn", "LevelUpGirl", closeReplica.sequence);
  await click(game, walkthroughCoords.levelUpGirl.closeButton);
  await game.waitTutorEvent("DialogClosed", "LevelUpGirl", closeReplica.sequence);
  await game.waitTutorStepCompleted("LevelUpGirl");
}

async function runChat2(game: GameSession): Promise<void> {
  const { firstReplica: dashboardReplica } = await beginTutorStep(game, "Chat2");
  await game.waitTutorHighlightRequested("dashboard_chat_btn", "Chat2", dashboardReplica.sequence);
  await click(game, tutorCoords.dashboard_chat_btn);
  const chatOpened = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "DashboardOpenChat", stepId: "Chat2" },
    dashboardReplica.sequence
  );

  const chatReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "Chat2" },
    chatOpened.sequence
  );
  await game.waitTutorHighlightRequested("interact_firstChatBtn", "Chat2", chatReplica.sequence);
  await click(game, tutorCoords.interact_firstChatBtn);
  const chatDialogOpened = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "ChatDialogOpened", stepId: "Chat2" },
    chatReplica.sequence
  );
  await game.waitTutorStepSaved("Chat2");

  const continueReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "Chat2" },
    chatDialogOpened.sequence
  );
  await click(game, walkthroughCoords.chat2.continueMessage);
  const continueClicked = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "ClickContinueInMessage", stepId: "Chat2" },
    continueReplica.sequence
  );

  await game.waitEventAfter(
    { source: "tutor", type: "step_completed", stepId: "Chat2" },
    continueClicked.sequence
  );
  const battleTower4Started = await game.waitEventAfter(
    { source: "tutor", type: "step_started", stepId: "BattleTower4" },
    continueClicked.sequence
  );

  await click(game, walkthroughCoords.chat2.closeButton);
  await game.waitTutorEvent("DialogClosed", "BattleTower4", battleTower4Started.sequence);
  await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "ChatClosed", stepId: "BattleTower4" },
    battleTower4Started.sequence
  );
}

async function runBattleTower4(game: GameSession): Promise<void> {
  const { firstReplica: towerReplica } = await beginTutorStep(game, "BattleTower4");
  await game.waitTutorHighlightRequested("tower_battle_btn", "BattleTower4", towerReplica.sequence);
  await click(game, tutorCoords.tower_battle_btn);
  const battleClickEvent = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleClick", stepId: "BattleTower4" },
    towerReplica.sequence
  );

  const battleEnterReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower4" },
    battleClickEvent.sequence
  );
  const battleStartLoading = await game.checkpoint();
  await click(game, walkthroughCoords.battleTower4.fightButton);
  await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStartLoading", stepId: "BattleTower4" },
    Math.max(battleEnterReplica.sequence, battleStartLoading)
  );

  const battleStarted = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStarted", stepId: "BattleTower4" },
    battleStartLoading
  );

  let turnBoundary = battleStarted.sequence;
  let battleEnemyDefeated: number | null = null;

  while (battleEnemyDefeated === null) {
    const nextEvent = await game.waitAnyEventAfter([
      { source: "battle", type: "move_advice", stepId: "BattleTower4" },
      { source: "tutor", type: "event_emitted", name: "BattleEnemyDefeated", stepId: "BattleTower4" }
    ], turnBoundary);

    const isBattleEnemyDefeated =
      nextEvent.source === "tutor"
      && nextEvent.type === "event_emitted"
      && nextEvent.name === "BattleEnemyDefeated";

    if (isBattleEnemyDefeated) {
      battleEnemyDefeated = nextEvent.sequence;
      break;
    }

    const moveAdvice = await game.waitBattleMoveAdviceAfter(turnBoundary);
    await game.playBattleMoveAdvice(moveAdvice.advice);
    const match = await game.waitEventAfter(
      { source: "tutor", type: "event_emitted", name: "Match3HeroTurn", stepId: "BattleTower4" },
      moveAdvice.event.sequence
    );
    turnBoundary = match.sequence;
  }

  const stepSaved = await game.waitEventAfter(
    { source: "tutor", type: "step_saved", stepId: "BattleTower4" },
    battleEnemyDefeated
  );
  const winDialogOpened = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleWinDialogOpened", stepId: "BattleTower4" },
    stepSaved.sequence
  );

  let sequence = await game.checkpoint();
  await click(game, walkthroughCoords.battleTower4.winDialogClose);
  const dialogClosed = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleWinDialogClosed", stepId: "BattleTower4" },
    sequence
  );

  const sealReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower4" },
    dialogClosed.sequence
  );
  await game.waitTutorHighlightRequested("interact_sealReward", "BattleTower4", sealReplica.sequence);
  await click(game, walkthroughCoords.battleTower4.sealContinue);
  const sealContinue = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "ClickContinueInMessage", stepId: "BattleTower4" },
    sealReplica.sequence
  );

  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower4" },
    sealContinue.sequence
  );
  sequence = await game.checkpoint();
  await click(game, walkthroughCoords.battleTower4.rewardsClaim);
  await game.waitTutorEvent("RewardsClaimed", "BattleTower4", sequence);
  await game.waitEventAfter(
    { source: "tutor", type: "step_completed", stepId: "BattleTower4" },
    sequence
  );
}

async function runSummonPremium(game: GameSession): Promise<void> {
  const { firstReplica: summonReplica } = await beginTutorStep(game, "SummonPremium");
  await game.waitTutorHighlightRequested("summon_btn", "SummonPremium", summonReplica.sequence);
  await click(game, tutorCoords.summon_btn);
  const summonClicked = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "SummonClicked", stepId: "SummonPremium" },
    summonReplica.sequence
  );

  const summonOpenReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "SummonPremium" },
    summonClicked.sequence
  );
  await game.waitTutorHighlightRequested("summon_open_one_btn", "SummonPremium", summonOpenReplica.sequence);
  const summonBuy = await game.checkpoint();
  await click(game, tutorCoords.summon_open_one_btn);
  await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "SummonBuy", stepId: "SummonPremium" },
    summonBuy
  );

  const firstGirlClosed = await closeGirlNewInfoDialog(
    game,
    walkthroughCoords.summonPremium.firstNewGirlClose,
    { waitForOpenAfterSequence: summonBuy }
  );
  await closeGirlNewInfoDialog(
    game,
    walkthroughCoords.summonPremium.secondNewGirlClose,
    { waitForOpenAfterSequence: firstGirlClosed.sequence }
  );

  const closeReplica = await game.waitTutorReplicaShown("SummonPremium", summonBuy);
  await game.waitTutorHighlightRequested("close_btn", "SummonPremium", closeReplica.sequence);
  await click(game, walkthroughCoords.summonPremium.closeButton);
  await game.waitTutorEvent("DialogClosed", "SummonPremium", closeReplica.sequence);
  await game.waitTutorStepCompleted("SummonPremium");
}

async function runBattleCampaign1(game: GameSession): Promise<void> {
  const { firstReplica } = await beginTutorStep(game, "BattleCampaign1");
  await click(game, walkthroughCoords.battleCampaign1.continueMessage);
  const firstContinue = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "ClickContinueInMessage", stepId: "BattleCampaign1" },
    firstReplica.sequence
  );

  const secondReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleCampaign1" },
    firstContinue.sequence
  );
  await click(game, walkthroughCoords.battleCampaign1.continueMessage);
  const secondContinue = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "ClickContinueInMessage", stepId: "BattleCampaign1" },
    secondReplica.sequence
  );

  const modesReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleCampaign1" },
    secondContinue.sequence
  );
  await game.waitTutorHighlightRequested("dashboard_modes_btn", "BattleCampaign1", modesReplica.sequence);
  await click(game, tutorCoords.dashboard_modes_btn);
  const modesClicked = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "ModesButtonClicked", stepId: "BattleCampaign1" },
    modesReplica.sequence
  );

  const campaignReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleCampaign1" },
    modesClicked.sequence
  );
  await game.waitTutorHighlightRequested("dashboard_campaign_btn", "BattleCampaign1", campaignReplica.sequence);
  await click(game, tutorCoords.dashboard_campaign_btn);
  const campaignOpened = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "CampaignOpen", stepId: "BattleCampaign1" },
    campaignReplica.sequence
  );

  const startReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleCampaign1" },
    campaignOpened.sequence
  );
  await game.waitTutorHighlightRequested("first_campaign_btn", "BattleCampaign1", startReplica.sequence);
  await click(game, tutorCoords.first_campaign_btn);
  const campaignStart = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "CampaignClickStart", stepId: "BattleCampaign1" },
    startReplica.sequence
  );

  const pickBestReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleCampaign1" },
    campaignStart.sequence
  );
  await game.waitTutorHighlightRequested("pick_best_btn", "BattleCampaign1", pickBestReplica.sequence);
  await click(game, tutorCoords.pick_best_btn);
  const pickBest = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "PickBest", stepId: "BattleCampaign1" },
    pickBestReplica.sequence
  );

  const fightReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleCampaign1" },
    pickBest.sequence
  );
  const battleStartLoading = await game.checkpoint();
  await click(game, walkthroughCoords.battleCampaign1.fightButton);
  await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStartLoading", stepId: "BattleCampaign1" },
    Math.max(fightReplica.sequence, battleStartLoading)
  );

  const battleStarted = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStarted", stepId: "BattleCampaign1" },
    battleStartLoading
  );

  let turnBoundary = battleStarted.sequence;
  let battleEnemyDefeated: number | null = null;

  while (battleEnemyDefeated === null) {
    const nextEvent = await game.waitAnyEventAfter([
      { source: "battle", type: "move_advice", stepId: "BattleCampaign1" },
      { source: "tutor", type: "event_emitted", name: "BattleEnemyDefeated", stepId: "BattleCampaign1" }
    ], turnBoundary);

    const isBattleEnemyDefeated =
      nextEvent.source === "tutor"
      && nextEvent.type === "event_emitted"
      && nextEvent.name === "BattleEnemyDefeated";

    if (isBattleEnemyDefeated) {
      battleEnemyDefeated = nextEvent.sequence;
      break;
    }

    const moveAdvice = await game.waitBattleMoveAdviceAfter(turnBoundary);
    await game.playBattleMoveAdvice(moveAdvice.advice);
    const match = await game.waitEventAfter(
      { source: "tutor", type: "event_emitted", name: "Match3HeroTurn", stepId: "BattleCampaign1" },
      moveAdvice.event.sequence
    );
    turnBoundary = match.sequence;
  }

  const stepSaved = await game.waitEventAfter(
    { source: "tutor", type: "step_saved", stepId: "BattleCampaign1" },
    battleEnemyDefeated
  );
  const stepCompleted = await game.waitEventAfter(
    { source: "tutor", type: "step_completed", stepId: "BattleCampaign1" },
    stepSaved.sequence
  );
  const postBattleEvent = await game.waitAnyEventAfter([
    { source: "tutor", type: "event_emitted", name: "BattleWinDialogOpened" },
    { source: "ui", type: "dialog_opened", dialog: "BattleWinResultDialog" },
    { source: "tutor", type: "step_started", stepId: "Chat3" }
  ], stepCompleted.sequence);

  const isBattleWinDialogOpened =
    (postBattleEvent.source === "tutor"
      && postBattleEvent.type === "event_emitted"
      && postBattleEvent.name === "BattleWinDialogOpened")
    || (postBattleEvent.source === "ui"
      && postBattleEvent.type === "dialog_opened"
      && postBattleEvent.dialog === "BattleWinResultDialog");

  if (isBattleWinDialogOpened) {
    await click(game, walkthroughCoords.battleCampaign1.winDialogClose);
    await game.waitAnyEventAfter([
      { source: "tutor", type: "event_emitted", name: "BattleWinDialogClosed" },
      { source: "ui", type: "dialog_closed", dialog: "BattleWinResultDialog" },
      { source: "tutor", type: "step_started", stepId: "Chat3" }
    ], postBattleEvent.sequence);
    return;
  }

  const afterChat3Started = await game.waitAnyEventAfter([
    { source: "tutor", type: "event_emitted", name: "BattleWinDialogOpened" },
    { source: "ui", type: "dialog_opened", dialog: "BattleWinResultDialog" },
    { source: "tutor", type: "replica_shown", stepId: "Chat3" }
  ], postBattleEvent.sequence);

  const isDelayedBattleWinDialogOpened =
    (afterChat3Started.source === "tutor"
      && afterChat3Started.type === "event_emitted"
      && afterChat3Started.name === "BattleWinDialogOpened")
    || (afterChat3Started.source === "ui"
      && afterChat3Started.type === "dialog_opened"
      && afterChat3Started.dialog === "BattleWinResultDialog");

  if (isDelayedBattleWinDialogOpened) {
    await click(game, walkthroughCoords.battleCampaign1.winDialogClose);
    await game.waitAnyEventAfter([
      { source: "tutor", type: "event_emitted", name: "BattleWinDialogClosed" },
      { source: "ui", type: "dialog_closed", dialog: "BattleWinResultDialog" },
      { source: "tutor", type: "replica_shown", stepId: "Chat3" }
    ], afterChat3Started.sequence);
  }
}

async function runChat3(game: GameSession): Promise<void> {
  const { firstReplica: dashboardReplica } = await beginTutorStep(game, "Chat3");
  await game.waitTutorHighlightRequested("dashboard_chat_btn", "Chat3", dashboardReplica.sequence);
  await click(game, tutorCoords.dashboard_chat_btn);
  const chatOpened = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "DashboardOpenChat", stepId: "Chat3" },
    dashboardReplica.sequence
  );

  const girlReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "Chat3" },
    chatOpened.sequence
  );
  await game.waitTutorHighlightRequested("interact_chatGirl21", "Chat3", girlReplica.sequence);
  await click(game, tutorCoords.interact_chatGirl21);
  const chatDialogOpened = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "ChatDialogOpened", stepId: "Chat3" },
    girlReplica.sequence
  );

  const beforeChatAnswers = await game.checkpoint();
  await advanceChatAtUntilCompleted(game, walkthroughCoords.chat3.answer, beforeChatAnswers);

  const storyCompleted = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "ChatStoryCompleted", stepId: "Chat3" },
    beforeChatAnswers
  );
  await game.waitEventAfter(
    { source: "tutor", type: "step_saved", stepId: "Chat3" },
    storyCompleted.sequence
  );
  const photoReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "Chat3" },
    chatDialogOpened.sequence
  );
  await game.waitTutorHighlightRequested("chat_photo", "Chat3", photoReplica.sequence);
  const photoOpened = await openChatPhoto(game, "Chat3", tutorCoords.chat_photo);

  await click(game, walkthroughCoords.chat3.galleryClose);
  const photoClosed = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "PhotoClosed", stepId: "Chat3" },
    photoOpened.sequence
  );

  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "Chat3" },
    photoClosed.sequence
  );
  await click(game, walkthroughCoords.chat3.closeButton);
  await game.waitTutorEvent("ChatClosed", "Chat3", photoClosed.sequence);
  await game.waitTutorStepCompleted("Chat3");
}

async function runLevelUpGirl2(game: GameSession): Promise<void> {
  const { firstReplica: dashboardReplica } = await beginTutorStep(game, "LevelUpGirl2");
  await game.waitTutorHighlightRequested("dashboard_girls_btn", "LevelUpGirl2", dashboardReplica.sequence);
  await click(game, walkthroughCoords.levelUpGirl2.dashboardGirlsButton);
  const girlsOpened = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "DashboardOpenGirls", stepId: "LevelUpGirl2" },
    dashboardReplica.sequence
  );

  const girlsReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "LevelUpGirl2" },
    girlsOpened.sequence
  );
  await game.waitTutorHighlightRequested("interact_firstGirlCard", "LevelUpGirl2", girlsReplica.sequence);
  await click(game, walkthroughCoords.levelUpGirl2.firstGirlCard);
  const girlInfoOpen = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "GirlInfoOpen", stepId: "LevelUpGirl2" },
    girlsReplica.sequence
  );

  const levelUpReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "LevelUpGirl2" },
    girlInfoOpen.sequence
  );
  await game.waitTutorHighlightRequested("girl_info_level_up_btn", "LevelUpGirl2", levelUpReplica.sequence);
  await levelUpUntilComplete(game, "LevelUpGirl2", walkthroughCoords.levelUpGirl2.levelUpButton);

  const closeReplica = await game.waitTutorReplicaShown("LevelUpGirl2", girlInfoOpen.sequence);
  await game.waitTutorHighlightRequested("close_btn", "LevelUpGirl2", closeReplica.sequence);
  await click(game, walkthroughCoords.levelUpGirl2.closeButton);
  await game.waitTutorEvent("DialogClosed", "LevelUpGirl2", closeReplica.sequence);
  await game.waitTutorStepCompleted("LevelUpGirl2");
}

async function runLastMessage(game: GameSession): Promise<void> {
  const { firstReplica } = await beginTutorStep(game, "LastMessage");
  await click(game, walkthroughCoords.lastMessage.continueMessage);
  const continueClicked = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "ClickContinueInMessage", stepId: "LastMessage" },
    firstReplica.sequence
  );

  const questsReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "LastMessage" },
    continueClicked.sequence
  );
  await game.waitTutorHighlightRequested("dashboard_quests_btn", "LastMessage", questsReplica.sequence);
  await click(game, tutorCoords.dashboard_quests_btn);
  await game.waitTutorEvent("QuestsClicked", "LastMessage", questsReplica.sequence);
  await game.waitTutorStepCompleted("LastMessage");
  await game.waitTutorCompleted();
}

export async function runFullTutorWalkthrough(game: GameSession): Promise<void> {
  await bootstrapTutorWalkthrough(game);
  await runBattleTower1(game);
  await runBattleTower2(game);
  await runChat1(game);
  await runBattleTower3(game);
  await runTowerChest(game);
  await runTowerWinsChest(game);
  await runLevelUpGirl(game);
  await runChat2(game);
  await runBattleTower4(game);
  await runSummonPremium(game);
  await runBattleCampaign1(game);
  await runChat3(game);
  await runLevelUpGirl2(game);
  await runLastMessage(game);
}
