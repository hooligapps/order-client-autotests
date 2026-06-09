export type Point = {
  x: number;
  y: number;
};

export const introCoords = {
  video: { x: 801, y: 709 },
  skip: { x: 801, y: 709 }
} satisfies Record<string, Point>;

export const tutorCoords = {
  dashboard_battle_btn: { x: 902, y: 707 },
  win_dialog_claim_btn: { x: 1075, y: 642 },

  battle_enter_cards_list: { x: 359, y: 656 },
  battle_enter_fight_btn: { x: 802, y: 491 },
  interact_match3BoosterBomb: { x: 843, y: 402 },
  interact_match3BoosterFlash: { x: 603, y: 402 },

  dashboard_chat_btn: { x: 217, y: 695 },
  chat_photo: { x: 726, y: 391 },
  chat_close_btn: { x: 197, y: 64 },

  tower_battle_btn: { x: 787, y: 494 },
  interact_battleEnterGirlCard: { x: 238, y: 658 },
  interact_firstBattlerWithAbility: { x: 271, y: 458 },
  interact_chestReward: { x: 0, y: 0 },

  interact_readySlot: { x: 254, y: 705 },
  rewards_claim_btn: { x: 788, y: 558 },
  tower_wins_banner: { x: 365, y: 436 },

  dashboard_girls_btn: { x: 1360, y: 690 },
  interact_firstGirlCard: { x: 352, y: 210 },
  girl_info_main_params: { x: 893, y: 247 },
  girl_info_battle_params: { x: 892, y: 248 },
  girl_info_abilities: { x: 892, y: 249 },
  girl_info_level_up_btn: { x: 1211, y: 628 },
  close_btn: { x: 205, y: 69 },

  interact_firstChatBtn: { x: 749, y: 337 },
  interact_sealReward: { x: 956, y: 520 },

  summon_btn: { x: 397, y: 701 },
  summon_open_one_btn: { x: 693, y: 691 },

  dashboard_modes_btn: { x: 634, y: 706 },
  dashboard_campaign_btn: { x: 696, y: 281 },
  first_campaign_btn: { x: 294, y: 637 },
  pick_best_btn: { x: 1364, y: 542 },

  interact_chatGirl21: { x: 750, y: 336 },
  dashboard_quests_btn: { x: 313, y: 702 }
} satisfies Record<string, Point>;

export const walkthroughCoords = {
  battleTower1: {
    match3Move1Start: { x: 678, y: 403 },
    match3Move1End: { x: 680, y: 321 },
    match3Move2Start: { x: 770, y: 401 },
    match3Move2End: { x: 840, y: 404 },
    continueMessage: { x: 1089, y: 415 },
    match3Move3Start: { x: 923, y: 329 },
    match3Move3End: { x: 920, y: 397 },
    postWinContinue: { x: 960, y: 560 },
    newGirlMessageContinue: { x: 921, y: 451 }
  },
  battleTower2: {
    deckCard1: { x: 227, y: 661 },
    deckCard2: { x: 359, y: 656 },
    deckCard3: { x: 489, y: 656 },
    fightButton: { x: 799, y: 491 },
    match3Move1Start: { x: 766, y: 395 },
    match3Move1End: { x: 842, y: 405 },
    match3Move2Start: { x: 683, y: 406 },
    match3Move2End: { x: 587, y: 403 },
    continueMessage: { x: 897, y: 507 }
  },
  chat1: {
    firstNewGirlClose: { x: 921, y: 452 },
    secondNewGirlClose: { x: 921, y: 452 },
    thirdNewGirlClose: { x: 837, y: 468 },
    answer: { x: 949, y: 601 },
    galleryClose: { x: 1403, y: 81 }
  },
  battleTower3: {
    continueMessage: { x: 840, y: 401 },
    postWinContinue: { x: 890, y: 446 },
    claimButton: { x: 1086, y: 642 }
  },
  levelUpGirl: {
    closeButton: { x: 205, y: 69 }
  },
  chat2: {
    continueMessage: { x: 883, y: 502 },
    closeButton: { x: 198, y: 66 }
  },
  battleTower4: {
    fightButton: { x: 796, y: 489 },
    winDialogClose: { x: 1073, y: 640 },
    sealContinue: { x: 956, y: 520 },
    rewardsClaim: { x: 788, y: 630 }
  },
  summonPremium: {
    firstNewGirlClose: { x: 844, y: 399 },
    secondNewGirlClose: { x: 826, y: 439 },
    closeButton: { x: 207, y: 69 }
  },
  battleCampaign1: {
    continueMessage: { x: 728, y: 429 },
    fightButton: { x: 795, y: 489 },
    winDialogClose: { x: 1075, y: 642 }
  },
  chat3: {
    answer: { x: 994, y: 603 },
    galleryClose: { x: 1391, y: 83 },
    closeButton: { x: 197, y: 64 }
  },
  levelUpGirl2: {
    dashboardGirlsButton: { x: 1362, y: 693 },
    firstGirlCard: { x: 362, y: 208 },
    levelUpButton: { x: 1214, y: 632 },
    closeButton: { x: 202, y: 66 }
  },
  lastMessage: {
    continueMessage: { x: 856, y: 445 }
  }
} satisfies Record<string, Record<string, Point>>;

export const tutorTimings = {
  introReadyDelayMs: 500,
  introSkipDelayMs: 1000,
  chatAnswerSettleDelayMs: 1500
};
