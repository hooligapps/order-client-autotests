export type Point = {
  x: number;
  y: number;
  label?: string;
};

function point(label: string, x: number, y: number): Point {
  return { x, y, label };
}

export const introCoords = {
  video: point("video", 801, 709),
  skip: point("skip", 801, 709)
} satisfies Record<string, Point>;

export const tutorCoords = {
  dashboard_battle_btn: point("dashboard_battle_btn", 902, 707),
  win_dialog_claim_btn: point("win_dialog_claim_btn", 1075, 642),

  battle_enter_cards_list: point("battle_enter_cards_list", 359, 656),
  battle_enter_fight_btn: point("battle_enter_fight_btn", 802, 491),
  interact_match3BoosterBomb: point("interact_match3BoosterBomb", 843, 402),
  interact_match3BoosterFlash: point("interact_match3BoosterFlash", 603, 402),

  dashboard_chat_btn: point("dashboard_chat_btn", 217, 695),
  chat_photo: point("chat_photo", 726, 391),
  chat_close_btn: point("chat_close_btn", 197, 64),

  tower_battle_btn: point("tower_battle_btn", 787, 494),
  interact_battleEnterGirlCard: point("interact_battleEnterGirlCard", 238, 658),
  interact_firstBattlerWithAbility: point("interact_firstBattlerWithAbility", 271, 458),
  interact_chestReward: point("interact_chestReward", 0, 0),

  interact_readySlot: point("interact_readySlot", 254, 705),
  rewards_claim_btn: point("rewards_claim_btn", 788, 558),
  tower_wins_banner: point("tower_wins_banner", 365, 436),

  dashboard_girls_btn: point("dashboard_girls_btn", 1360, 690),
  interact_firstGirlCard: point("interact_firstGirlCard", 352, 210),
  girl_info_main_params: point("girl_info_main_params", 893, 247),
  girl_info_battle_params: point("girl_info_battle_params", 892, 248),
  girl_info_abilities: point("girl_info_abilities", 892, 249),
  girl_info_level_up_btn: point("girl_info_level_up_btn", 1211, 628),
  close_btn: point("close_btn", 205, 69),

  interact_firstChatBtn: point("interact_firstChatBtn", 749, 337),
  interact_sealReward: point("interact_sealReward", 956, 520),

  summon_btn: point("summon_btn", 397, 701),
  summon_open_one_btn: point("summon_open_one_btn", 693, 691),

  dashboard_modes_btn: point("dashboard_modes_btn", 634, 706),
  dashboard_campaign_btn: point("dashboard_campaign_btn", 696, 281),
  first_campaign_btn: point("first_campaign_btn", 294, 637),
  pick_best_btn: point("pick_best_btn", 1364, 542),

  interact_chatGirl21: point("interact_chatGirl21", 796, 335),
  dashboard_quests_btn: point("dashboard_quests_btn", 313, 702)
} satisfies Record<string, Point>;

export const walkthroughCoords = {
  battleTower1: {
    match3Move1Start: point("match3Move1Start", 678, 403),
    match3Move1End: point("match3Move1End", 680, 321),
    match3Move2Start: point("match3Move2Start", 770, 401),
    match3Move2End: point("match3Move2End", 840, 404),
    continueMessage: point("continueMessage", 1089, 415),
    match3Move3Start: point("match3Move3Start", 923, 329),
    match3Move3End: point("match3Move3End", 920, 397),
    postWinContinue: point("postWinContinue", 960, 560),
    newGirlMessageContinue: point("newGirlMessageContinue", 921, 451)
  },
  battleTower2: {
    deckCard1: point("deckCard1", 227, 661),
    deckCard2: point("deckCard2", 359, 656),
    deckCard3: point("deckCard3", 489, 656),
    fightButton: point("fightButton", 799, 491),
    match3Move1Start: point("match3Move1Start", 766, 395),
    match3Move1End: point("match3Move1End", 842, 405),
    match3Move2Start: point("match3Move2Start", 683, 406),
    match3Move2End: point("match3Move2End", 587, 403),
    continueMessage: point("continueMessage", 897, 507)
  },
  chat1: {
    firstNewGirlClose: point("firstNewGirlClose", 921, 452),
    secondNewGirlClose: point("secondNewGirlClose", 921, 452),
    thirdNewGirlClose: point("thirdNewGirlClose", 837, 468),
    answer: point("answer", 949, 601),
    chatPhoto: point("chatPhoto", 726, 391),
    galleryClose: point("galleryClose", 1403, 81)
  },
  battleTower3: {
    continueMessage: point("continueMessage", 840, 401),
    postWinContinue: point("postWinContinue", 890, 446),
    claimButton: point("claimButton", 1086, 642)
  },
  levelUpGirl: {
    closeButton: point("closeButton", 205, 69),
    continueMessage: point("continueMessage", 893, 247),
  },
  chat2: {
    continueMessage: point("continueMessage", 883, 502),
    closeButton: point("closeButton", 198, 66)
  },
  battleTower4: {
    fightButton: point("fightButton", 796, 489),
    winDialogClose: point("winDialogClose", 1073, 640),
    sealContinue: point("sealContinue", 956, 520),
    rewardsClaim: point("rewardsClaim", 788, 630)
  },
  summonPremium: {
    firstNewGirlClose: point("firstNewGirlClose", 844, 399),
    secondNewGirlClose: point("secondNewGirlClose", 826, 439),
    closeButton: point("closeButton", 207, 69)
  },
  battleCampaign1: {
    continueMessage: point("continueMessage", 1206, 377),
    fightButton: point("fightButton", 795, 489),
    winDialogClose: point("winDialogClose", 1075, 642)
  },
  chat3: {
    answer: point("answer", 961, 710),
    chatPhoto: point("chatPhoto", 722, 384),
    galleryClose: point("galleryClose", 683, 492),
    closeButton: point("closeButton", 176, 175)
  },
  levelUpGirl2: {
    dashboardGirlsButton: point("dashboardGirlsButton", 1362, 693),
    firstGirlCard: point("firstGirlCard", 490, 255),
    levelUpButton: point("levelUpButton", 1214, 632),
    closeButton: point("closeButton", 202, 66)
  },
  lastMessage: {
    continueMessage: point("continueMessage", 856, 445)
  }
} satisfies Record<string, Record<string, Point>>;

export const tutorTimings = {
  introReadyDelayMs: 500,
  introSkipDelayMs: 1000,
  chatAnswerSettleDelayMs: 1500
};
