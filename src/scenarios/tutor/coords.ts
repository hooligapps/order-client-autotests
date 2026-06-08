export type Point = {
  x: number;
  y: number;
};

export const introCoords = {
  video: { x: 801, y: 709 },
  skip: { x: 801, y: 709 }
} satisfies Record<string, Point>;

export const tutorCoords = {
  dashboard_battle_btn: { x: 893, y: 703 },
  win_dialog_claim_btn: { x: 0, y: 0 },

  battle_enter_cards_list: { x: 0, y: 0 },
  battle_enter_fight_btn: { x: 0, y: 0 },
  interact_match3BoosterBomb: { x: 0, y: 0 },
  interact_match3BoosterFlash: { x: 0, y: 0 },

  dashboard_chat_btn: { x: 0, y: 0 },
  chat_photo: { x: 0, y: 0 },
  chat_close_btn: { x: 0, y: 0 },

  tower_battle_btn: { x: 0, y: 0 },
  interact_battleEnterGirlCard: { x: 0, y: 0 },
  interact_firstBattlerWithAbility: { x: 0, y: 0 },
  interact_chestReward: { x: 0, y: 0 },

  interact_readySlot: { x: 0, y: 0 },
  rewards_claim_btn: { x: 0, y: 0 },
  tower_wins_banner: { x: 0, y: 0 },

  dashboard_girls_btn: { x: 0, y: 0 },
  interact_firstGirlCard: { x: 0, y: 0 },
  girl_info_main_params: { x: 0, y: 0 },
  girl_info_battle_params: { x: 0, y: 0 },
  girl_info_abilities: { x: 0, y: 0 },
  girl_info_level_up_btn: { x: 0, y: 0 },
  close_btn: { x: 0, y: 0 },

  interact_firstChatBtn: { x: 0, y: 0 },
  interact_sealReward: { x: 0, y: 0 },

  summon_btn: { x: 0, y: 0 },
  summon_open_one_btn: { x: 0, y: 0 },

  dashboard_modes_btn: { x: 0, y: 0 },
  dashboard_campaign_btn: { x: 0, y: 0 },
  first_campaign_btn: { x: 0, y: 0 },
  pick_best_btn: { x: 0, y: 0 },

  interact_chatGirl21: { x: 0, y: 0 },
  dashboard_quests_btn: { x: 0, y: 0 }
} satisfies Record<string, Point>;

export const tutorTimings = {
  introSkipDelayMs: 1000
};
