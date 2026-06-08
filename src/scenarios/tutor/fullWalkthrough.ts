import type { GameSession } from "../../fixtures/game.fixture";
import { introCoords, tutorCoords, tutorTimings, walkthroughCoords } from "./coords";
import { bootstrapTutorWalkthrough } from "./walkthrough";

async function click(game: GameSession, point: { x: number; y: number }): Promise<void> {
  await game.clickAt(point.x, point.y);
}

async function clickTarget(game: GameSession, target: keyof typeof tutorCoords): Promise<void> {
  await click(game, tutorCoords[target]);
}

async function clickPair(
  game: GameSession,
  from: { x: number; y: number },
  to: { x: number; y: number }
): Promise<void> {
  await click(game, from);
  await click(game, to);
}

async function skipIntroVideo(game: GameSession, name: string): Promise<void> {
  await game.waitTutorIntroStarted(name);
  await click(game, introCoords.video);
  await game.waitMs(tutorTimings.introSkipDelayMs);
  await click(game, introCoords.skip);
  await game.waitTutorIntroCompleted(name);
}

async function closeGirlNewInfoDialog(game: GameSession, point: { x: number; y: number }): Promise<void> {
  const sequence = await game.checkpoint();
  await click(game, point);
  await game.waitEventAfter({ source: "tutor", type: "event_emitted", name: "DialogClosed" }, sequence);
}

async function clickChatAnswer(game: GameSession): Promise<void> {
  await click(game, walkthroughCoords.chat1.answer);
  await game.waitMs(tutorTimings.chatAnswerSettleDelayMs);
}

async function runBattleTower1(game: GameSession): Promise<void> {
  const coords = walkthroughCoords.battleTower1;

  await game.waitTutorStepStarted("BattleTower1");
  await skipIntroVideo(game, "intro_1");
  await skipIntroVideo(game, "intro_2");

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
  await clickPair(game, coords.match3Move1Start, coords.match3Move1End);
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
  await clickPair(game, coords.match3Move2Start, coords.match3Move2End);
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
  await clickPair(game, coords.match3Move3Start, coords.match3Move3End);
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

  const firstGirlDialogOpened = await game.waitEventAfter(
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
  await clickPair(game, coords.match3Move1Start, coords.match3Move1End);
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
  await clickPair(game, coords.match3Move2Start, coords.match3Move2End);
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

  await closeGirlNewInfoDialog(game, walkthroughCoords.chat1.thirdNewGirlClose);
  const afterThirdGirlClose = await game.checkpoint();
  const allGirlsClosed = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "AllNewGirlDialogsClosed" },
    afterThirdGirlClose
  );
  const dashboardOpened = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "DashboardOpened" },
    allGirlsClosed.sequence
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
  await clickChatAnswer(game);
  await clickChatAnswer(game);
  await clickChatAnswer(game);
  await clickChatAnswer(game);

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

  sequence = await game.checkpoint();
  await clickTarget(game, "chat_photo");
  const photoOpened = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "PhotoOpened" },
    sequence
  );

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
  await game.waitTutorStepStarted("BattleTower3");
  await game.waitTutorReplicaShown("BattleTower3");
  await game.waitTutorHighlightRequested("dashboard_battle_btn");

  let sequence = await game.checkpoint();
  await clickTarget(game, "dashboard_battle_btn");
  const towerClick = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "TowerClick" },
    sequence
  );
  const towerShown = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "TowerShown" },
    towerClick.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower3" },
    towerShown.sequence
  );
  await game.waitTutorHighlightRequested("tower_battle_btn");

  sequence = await game.checkpoint();
  await clickTarget(game, "tower_battle_btn");
  const battleClick = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleClick" },
    sequence
  );
  const battleEnterShown = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleEnterDialogShown" },
    battleClick.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower3" },
    battleEnterShown.sequence
  );
  await game.waitTutorHighlightRequested("interact_battleEnterGirlCard");

  sequence = await game.checkpoint();
  await clickTarget(game, "interact_battleEnterGirlCard");
  const deckIsFull = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "DeckIsFull" },
    sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower3" },
    deckIsFull.sequence
  );

  sequence = await game.checkpoint();
  await clickTarget(game, "battle_enter_fight_btn");
  const battleStartLoading = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStartLoading" },
    sequence
  );
  const battleStarted = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStarted" },
    battleStartLoading.sequence
  );
  const abilityCharged = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleAbilityCharged" },
    battleStarted.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower3" },
    abilityCharged.sequence
  );

  sequence = await game.checkpoint();
  await clickTarget(game, "interact_firstBattlerWithAbility");
  const useAbility = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "UseBattleAbility" },
    sequence
  );
  const abilityUsed = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleAbilityUsed" },
    useAbility.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "step_saved", stepId: "BattleTower3" },
    abilityUsed.sequence
  );
}

async function runTowerChest(game: GameSession): Promise<void> {
  await game.waitTutorStepStarted("TowerChest");
  await game.waitTutorReplicaShown("TowerChest");
  await game.waitTutorHighlightRequested("interact_readySlot");
  await click(game, tutorCoords.interact_readySlot);
  await game.waitTutorEvent("SlotOpen");

  await game.waitTutorReplicaShown("TowerChest");
  await game.waitTutorHighlightRequested("rewards_claim_btn");
  await click(game, tutorCoords.rewards_claim_btn);
  await game.waitTutorEvent("RewardsClaimed");
  await game.waitTutorStepSaved("TowerChest");
  await game.waitTutorStepCompleted("TowerChest");
}

async function runTowerWinsChest(game: GameSession): Promise<void> {
  await game.waitTutorStepStarted("TowerWinsChest");
  await game.waitTutorReplicaShown("TowerWinsChest");
  await game.waitTutorHighlightRequested("tower_wins_banner");
  await click(game, tutorCoords.tower_wins_banner);
  await game.waitTutorEvent("RewardsDialogOpened");

  await game.waitTutorReplicaShown("TowerWinsChest");
  await game.waitTutorHighlightRequested("rewards_claim_btn");
  await click(game, tutorCoords.rewards_claim_btn);
  await game.waitTutorEvent("RewardsClaimed");
  await game.waitTutorStepSaved("TowerWinsChest");
  await game.waitTutorStepCompleted("TowerWinsChest");
}

async function runLevelUpGirl(game: GameSession): Promise<void> {
  await game.waitTutorStepStarted("LevelUpGirl");
  await game.waitTutorReplicaShown("LevelUpGirl");
  await game.waitTutorHighlightRequested("dashboard_girls_btn");
  await click(game, tutorCoords.dashboard_girls_btn);
  await game.waitTutorEvent("DashboardOpenGirls");

  await game.waitTutorReplicaShown("LevelUpGirl");
  await game.waitTutorHighlightRequested("interact_firstGirlCard");
  await click(game, tutorCoords.interact_firstGirlCard);
  await game.waitTutorEvent("GirlInfoOpen");

  await game.waitTutorReplicaShown("LevelUpGirl");
  await game.waitTutorHighlightRequested("girl_info_main_params");
  await click(game, tutorCoords.girl_info_main_params);
  await game.waitTutorEvent("ClickContinueInMessage");

  await game.waitTutorReplicaShown("LevelUpGirl");
  await game.waitTutorHighlightRequested("girl_info_battle_params");
  await click(game, tutorCoords.girl_info_battle_params);
  await game.waitTutorEvent("ClickContinueInMessage");

  await game.waitTutorReplicaShown("LevelUpGirl");
  await game.waitTutorHighlightRequested("girl_info_abilities");
  await click(game, tutorCoords.girl_info_abilities);
  await game.waitTutorEvent("ClickContinueInMessage");

  await game.waitTutorReplicaShown("LevelUpGirl");
  await game.waitTutorHighlightRequested("girl_info_level_up_btn");
  await click(game, tutorCoords.girl_info_level_up_btn);
  await game.waitTutorEvent("GirlLevelUpComplete");

  await game.waitTutorReplicaShown("LevelUpGirl");
  await game.waitTutorHighlightRequested("close_btn");
  await click(game, tutorCoords.close_btn);
  await game.waitTutorEvent("DialogClosed");
  await game.waitTutorStepSaved("LevelUpGirl");
  await game.waitTutorStepCompleted("LevelUpGirl");
}

async function runChat2(game: GameSession): Promise<void> {
  await game.waitTutorStepStarted("Chat2");
  await game.waitTutorReplicaShown("Chat2");
  await game.waitTutorHighlightRequested("dashboard_chat_btn");
  await click(game, tutorCoords.dashboard_chat_btn);
  await game.waitTutorEvent("DashboardOpenChat");

  await game.waitTutorReplicaShown("Chat2");
  await game.waitTutorHighlightRequested("interact_firstChatBtn");
  await click(game, tutorCoords.interact_firstChatBtn);
  await game.waitTutorEvent("ChatDialogOpened");

  await game.waitTutorReplicaShown("Chat2");
  await click(game, introCoords.video);
  await game.waitTutorEvent("ClickContinueInMessage");
  await game.waitTutorStepSaved("Chat2");
  await game.waitTutorStepCompleted("Chat2");
}

async function runBattleTower4(game: GameSession): Promise<void> {
  await game.waitTutorStepStarted("BattleTower4");
  await game.waitTutorReplicaShown("BattleTower4");
  await game.waitTutorHighlightRequested("tower_battle_btn");
  await click(game, tutorCoords.tower_battle_btn);
  await game.waitTutorEvent("BattleClick");

  await game.waitTutorReplicaShown("BattleTower4");
  await game.waitTutorHighlightRequested("battle_enter_fight_btn");
  await click(game, tutorCoords.battle_enter_fight_btn);
  await game.waitTutorEvent("BattleStartLoading");

  await game.waitTutorReplicaShown("BattleTower4");
  await game.waitTutorHighlightRequested("interact_sealReward");
  await click(game, tutorCoords.interact_sealReward);
  await game.waitTutorEvent("ClickContinueInMessage");

  await game.waitTutorReplicaShown("BattleTower4");
  await game.waitTutorHighlightRequested("rewards_claim_btn");
  await click(game, tutorCoords.rewards_claim_btn);
  await game.waitTutorEvent("RewardsClaimed");
  await game.waitTutorStepSaved("BattleTower4");
  await game.waitTutorStepCompleted("BattleTower4");
}

async function runSummonPremium(game: GameSession): Promise<void> {
  await game.waitTutorStepStarted("SummonPremium");
  await game.waitTutorReplicaShown("SummonPremium");
  await game.waitTutorHighlightRequested("summon_btn");
  await click(game, tutorCoords.summon_btn);
  await game.waitTutorEvent("SummonClicked");

  await game.waitTutorReplicaShown("SummonPremium");
  await game.waitTutorHighlightRequested("summon_open_one_btn");
  await click(game, tutorCoords.summon_open_one_btn);
  await game.waitTutorEvent("SummonBuy");

  await game.waitTutorReplicaShown("SummonPremium");
  await game.waitTutorHighlightRequested("close_btn");
  await click(game, tutorCoords.close_btn);
  await game.waitTutorEvent("DialogClosed");
  await game.waitTutorStepSaved("SummonPremium");
  await game.waitTutorStepCompleted("SummonPremium");
}

async function runBattleCampaign1(game: GameSession): Promise<void> {
  await game.waitTutorStepStarted("BattleCampaign1");

  await game.waitTutorReplicaShown("BattleCampaign1");
  await click(game, introCoords.video);
  await game.waitTutorEvent("ClickContinueInMessage");

  await game.waitTutorReplicaShown("BattleCampaign1");
  await click(game, introCoords.video);
  await game.waitTutorEvent("ClickContinueInMessage");

  await game.waitTutorReplicaShown("BattleCampaign1");
  await game.waitTutorHighlightRequested("dashboard_modes_btn");
  await click(game, tutorCoords.dashboard_modes_btn);
  await game.waitTutorEvent("ModesButtonClicked");

  await game.waitTutorReplicaShown("BattleCampaign1");
  await game.waitTutorHighlightRequested("dashboard_campaign_btn");
  await click(game, tutorCoords.dashboard_campaign_btn);
  await game.waitTutorEvent("CampaignOpen");

  await game.waitTutorReplicaShown("BattleCampaign1");
  await game.waitTutorHighlightRequested("first_campaign_btn");
  await click(game, tutorCoords.first_campaign_btn);
  await game.waitTutorEvent("CampaignClickStart");

  await game.waitTutorReplicaShown("BattleCampaign1");
  await game.waitTutorHighlightRequested("pick_best_btn");
  await click(game, tutorCoords.pick_best_btn);
  await game.waitTutorEvent("PickBest");

  await game.waitTutorReplicaShown("BattleCampaign1");
  await game.waitTutorHighlightRequested("battle_enter_fight_btn");
  await click(game, tutorCoords.battle_enter_fight_btn);
  await game.waitTutorEvent("BattleStartLoading");
  await game.waitTutorStepSaved("BattleCampaign1");
  await game.waitTutorStepCompleted("BattleCampaign1");
}

async function runChat3(game: GameSession): Promise<void> {
  await game.waitTutorStepStarted("Chat3");
  await game.waitTutorReplicaShown("Chat3");
  await game.waitTutorHighlightRequested("dashboard_chat_btn");
  await click(game, tutorCoords.dashboard_chat_btn);
  await game.waitTutorEvent("DashboardOpenChat");

  await game.waitTutorReplicaShown("Chat3");
  await game.waitTutorHighlightRequested("interact_chatGirl21");
  await click(game, tutorCoords.interact_chatGirl21);
  await game.waitTutorEvent("ChatDialogOpened");

  await game.waitTutorReplicaShown("Chat3");
  await game.waitTutorHighlightRequested("chat_photo");
  await click(game, tutorCoords.chat_photo);
  await game.waitTutorEvent("GalleryButtonClicked");

  await game.waitTutorReplicaShown("Chat3");
  await game.waitTutorHighlightRequested("chat_close_btn");
  await click(game, tutorCoords.chat_close_btn);
  await game.waitTutorEvent("ChatClosed");
  await game.waitTutorStepSaved("Chat3");
  await game.waitTutorStepCompleted("Chat3");
}

async function runLevelUpGirl2(game: GameSession): Promise<void> {
  await game.waitTutorStepStarted("LevelUpGirl2");
  await game.waitTutorReplicaShown("LevelUpGirl2");
  await game.waitTutorHighlightRequested("dashboard_girls_btn");
  await click(game, tutorCoords.dashboard_girls_btn);
  await game.waitTutorEvent("DashboardOpenGirls");

  await game.waitTutorReplicaShown("LevelUpGirl2");
  await game.waitTutorHighlightRequested("interact_firstGirlCard");
  await click(game, tutorCoords.interact_firstGirlCard);
  await game.waitTutorEvent("GirlInfoOpen");

  await game.waitTutorReplicaShown("LevelUpGirl2");
  await game.waitTutorHighlightRequested("girl_info_level_up_btn");
  await click(game, tutorCoords.girl_info_level_up_btn);
  await game.waitTutorEvent("GirlLevelUpComplete");

  await game.waitTutorReplicaShown("LevelUpGirl2");
  await game.waitTutorHighlightRequested("close_btn");
  await click(game, tutorCoords.close_btn);
  await game.waitTutorEvent("DialogClosed");
  await game.waitTutorStepSaved("LevelUpGirl2");
  await game.waitTutorStepCompleted("LevelUpGirl2");
}

async function runLastMessage(game: GameSession): Promise<void> {
  await game.waitTutorStepStarted("LastMessage");

  await game.waitTutorReplicaShown("LastMessage");
  await click(game, introCoords.video);
  await game.waitTutorEvent("ClickContinueInMessage");

  await game.waitTutorReplicaShown("LastMessage");
  await game.waitTutorHighlightRequested("dashboard_quests_btn");
  await click(game, tutorCoords.dashboard_quests_btn);
  await game.waitTutorEvent("QuestsClicked");
  await game.waitTutorStepSaved("LastMessage");
  await game.waitTutorStepCompleted("LastMessage");
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
