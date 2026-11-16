/**
 * 城邦世界、据点、契约任务、酒馆、后勤与圣所系统类型定义
 * Milestone 2 核心数据结构
 */

import type { Hero, ClassId } from './hero';

// 据点 ID
export type TownId = 'ash_stronghold' | 'pine_town' | 'wrath_port' | 'forgotten_abbey';

// 好感度/声望级别
export type ReputationLevel = 'hostile' | 'neutral' | 'friendly' | 'revered';

// 建筑类型
export type BuildingType = 'tavern' | 'guild' | 'market' | 'sanctuary' | 'infirmary';

// 据点实体
export interface TownNode {
  id: TownId;
  name: string;
  subtitle: string;
  description: string;
  buildings: BuildingType[];
  reputation: number; // -100 ~ 100
  reputationLevel: ReputationLevel;
  distanceFromCapital: number; // 距离灰烬堡垒的天数距离
  supplyCostMod: number;       // 物价倍率 (如 0.9 = 9折)
  rewardMod: number;           // 任务赏金加成
}

// 契约任务难级 (1-5星)
export type ContractDifficulty = 1 | 2 | 3 | 4 | 5;

// 契约类型
export type ContractType = 'bandit_camp' | 'beast_hunt' | 'ruins_cleansing' | 'caravan_escort' | 'undead_crypt';

// 契约状态
export type ContractStatus = 'available' | 'accepted' | 'completed' | 'failed';

// 公会契约任务实体
export interface GuildContract {
  id: string;
  title: string;
  type: ContractType;
  townId: TownId;
  stars: ContractDifficulty;
  durationDays: number;     // 耗费天数
  goldReward: number;       // 金币报酬
  reputationReward: number; // 声望提升
  soulCrystalReward?: number;// 魂晶奖励
  description: string;
  enemyClasses: ClassId[];  // 敌对编制
  enemyLevel: number;
  status: ContractStatus;
}

// 酒馆应聘者档案
export interface TavernRecruit {
  id: string;
  hero: Hero;
  hireCost: number;       // 雇佣签约金
  backgroundStory: string;
  starRatingRange: string;// 评级迷雾显示 (如 "★★★☆☆")
}

// 伤残记录
export interface InjuryRecord {
  id: string;
  heroId: string;
  name: string;
  daysRemaining: number;
  severity: 'light' | 'severe'; // 轻伤自愈，重伤需治疗
  treatmentCost: number;
}

// 阵亡英雄魂魄档案 (圣所召回)
export interface FallenSoul {
  hero: Hero;
  deathDate: number;      // 阵亡于第几天
  deathLocation: string;  // 阵亡地点
  revivalCostGold: number;// 复活金币
  revivalSoulCrystals: number; // 复活魂晶
}

// 佣兵团团队整体后勤运营资产
export interface CompanyLogistics {
  day: number;            // 当前天数
  currentTownId: TownId;  // 当前所在据点
  gold: number;           // 金币
  rations: number;        // 口粮 (每日每人消耗 1)
  soulCrystals: number;   // 稀有魂晶 (用于圣所复活)
  medicines: number;      // 药剂 (用于治愈重伤)
  dailyFoodCost: number;  // 每日口粮消耗
  weeklyWageCost: number; // 每周薪资总额
}
