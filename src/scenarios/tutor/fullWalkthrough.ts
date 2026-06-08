import type { GameSession } from "../../fixtures/game.fixture";
import { introCoords, tutorCoords, tutorTimings } from "./coords";
import { bootstrapTutorWalkthrough } from "./walkthrough";

async function click(game: GameSession, point: { x: number; y: number }): Promise<void> {
  await game.clickAt(point.x, point.y);
}

async function clickContinueMessage(game: GameSession, stepId: string): Promise<void> {
  await game.waitTutorReplicaShown(stepId);
  await click(game, introCoords.video);
  await game.waitTutorEvent("ClickContinueInMessage");
}

async function skipIntroVideo(game: GameSession, name: string): Promise<void> {
  await game.waitTutorIntroStarted(name);
  await click(game, introCoords.video);
  await game.waitMs(tutorTimings.introSkipDelayMs);
  await click(game, introCoords.skip);
  await game.waitTutorIntroCompleted(name);
}

async function runBattleTower1(game: GameSession): Promise<void> {
  await game.waitTutorStepStarted("BattleTower1");
  await skipIntroVideo(game, "intro_1");
  await skipIntroVideo(game, "intro_2");

  await game.waitTutorReplicaShown("BattleTower1");
  await game.waitTutorHighlightRequested("dashboard_battle_btn");
  await click(game, tutorCoords.dashboard_battle_btn);
  await game.waitTutorEvent("TowerClick");

  await game.waitTutorReplicaShown("BattleTower1");
  await click(game, introCoords.video);
  await game.waitTutorEvent("ClickContinueInMessage");

  await game.waitTutorReplicaShown("BattleTower1");
  await game.waitTutorHighlightRequested("win_dialog_claim_btn");
  await click(game, tutorCoords.win_dialog_claim_btn);
  await game.waitTutorEvent("BattleWinDialogClosed");
  await game.waitTutorStepSaved("BattleTower1");
  await game.waitTutorStepCompleted("BattleTower1");
}

async function runBattleTower2(game: GameSession): Promise<void> {
  await game.waitTutorStepStarted("BattleTower2");

  await game.waitTutorReplicaShown("BattleTower2");
  await game.waitTutorHighlightRequested("battle_enter_cards_list");
  await click(game, tutorCoords.battle_enter_cards_list);
  await game.waitTutorEvent("DeckIsFull");

  await game.waitTutorReplicaShown("BattleTower2");
  await game.waitTutorHighlightRequested("battle_enter_fight_btn");
  await click(game, tutorCoords.battle_enter_fight_btn);
  await game.waitTutorEvent("BattleStartLoading");

  await game.waitTutorReplicaShown("BattleTower2");
  await game.waitTutorHighlightRequested("interact_match3BoosterBomb");
  await click(game, tutorCoords.interact_match3BoosterBomb);
  await game.waitTutorEvent("BattleAbilityUsed");

  await game.waitTutorReplicaShown("BattleTower2");
  await game.waitTutorHighlightRequested("interact_match3BoosterFlash");
  await click(game, tutorCoords.interact_match3BoosterFlash);
  await game.waitTutorEvent("BattleAbilityUsed");

  await game.waitTutorReplicaShown("BattleTower2");
  await click(game, introCoords.video);
  await game.waitTutorEvent("ClickContinueInMessage");

  await game.waitTutorReplicaShown("BattleTower2");
  await game.waitTutorHighlightRequested("win_dialog_claim_btn");
  await click(game, tutorCoords.win_dialog_claim_btn);
  await game.waitTutorEvent("BattleWinDialogClosed");
  await game.waitTutorStepSaved("BattleTower2");
  await game.waitTutorStepCompleted("BattleTower2");
}

async function runChat1(game: GameSession): Promise<void> {
  await game.waitTutorStepStarted("Chat1");

  await game.waitTutorReplicaShown("Chat1");
  await game.waitTutorHighlightRequested("dashboard_chat_btn");
  await click(game, tutorCoords.dashboard_chat_btn);
  await game.waitTutorEvent("DashboardOpenChat");

  await game.waitTutorReplicaShown("Chat1");
  await game.waitTutorHighlightRequested("chat_photo");
  await click(game, tutorCoords.chat_photo);
  await game.waitTutorEvent("GalleryButtonClicked");

  await game.waitTutorReplicaShown("Chat1");
  await game.waitTutorHighlightRequested("chat_close_btn");
  await click(game, tutorCoords.chat_close_btn);
  await game.waitTutorEvent("ChatClosed");
  await game.waitTutorStepSaved("Chat1");
  await game.waitTutorStepCompleted("Chat1");
}

async function runBattleTower3(game: GameSession): Promise<void> {
  await game.waitTutorStepStarted("BattleTower3");

  await game.waitTutorReplicaShown("BattleTower3");
  await game.waitTutorHighlightRequested("dashboard_battle_btn");
  await click(game, tutorCoords.dashboard_battle_btn);
  await game.waitTutorEvent("TowerClick");

  await game.waitTutorReplicaShown("BattleTower3");
  await game.waitTutorHighlightRequested("tower_battle_btn");
  await click(game, tutorCoords.tower_battle_btn);
  await game.waitTutorEvent("BattleClick");

  await game.waitTutorReplicaShown("BattleTower3");
  await game.waitTutorHighlightRequested("interact_battleEnterGirlCard");
  await click(game, tutorCoords.interact_battleEnterGirlCard);
  await game.waitTutorEvent("DeckChanged");

  await game.waitTutorReplicaShown("BattleTower3");
  await game.waitTutorHighlightRequested("battle_enter_fight_btn");
  await click(game, tutorCoords.battle_enter_fight_btn);
  await game.waitTutorEvent("BattleStartLoading");

  await game.waitTutorReplicaShown("BattleTower3");
  await game.waitTutorHighlightRequested("interact_firstBattlerWithAbility");
  await click(game, tutorCoords.interact_firstBattlerWithAbility);
  await game.waitTutorEvent("UseBattleAbility");

  await game.waitTutorReplicaShown("BattleTower3");
  await click(game, introCoords.video);
  await game.waitTutorEvent("ClickContinueInMessage");

  await game.waitTutorReplicaShown("BattleTower3");
  await game.waitTutorHighlightRequested("interact_chestReward");
  await click(game, tutorCoords.interact_chestReward);
  await game.waitTutorEvent("ClickContinueInMessage");

  await game.waitTutorReplicaShown("BattleTower3");
  await game.waitTutorHighlightRequested("win_dialog_claim_btn");
  await click(game, tutorCoords.win_dialog_claim_btn);
  await game.waitTutorEvent("BattleWinDialogClosed");
  await game.waitTutorStepSaved("BattleTower3");
  await game.waitTutorStepCompleted("BattleTower3");
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
