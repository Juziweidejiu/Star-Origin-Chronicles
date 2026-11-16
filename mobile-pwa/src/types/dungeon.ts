/**
 * 地牢生成、探索房间与暗黑式装备掉落数据结构
 * Milestone 3: 深度地牢系统与战利品
 */

import type { ClassId, Equipment } from './hero';

// 房间类型：普通战斗、陷阱房、宝箱房、扎营休整房、Boss首领房
export type RoomType = 'battle' | 'trap' | 'chest' | 'camp' | 'boss';

// 房间状态
export type RoomStatus = 'hidden' | 'revealed' | 'current' | 'cleared';

// 装备品质 (白/绿/蓝/紫/橙)
export type EquipmentRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

// 营地角色分工
export type CampRole = 'tender' | 'sentry' | 'scout' | 'rest';

// 地牢房间定义
export interface DungeonRoom {
  index: number;
  type: RoomType;
  title: string;
  description: string;
  status: RoomStatus;
  cleared: boolean;
  // 战斗房特有
  enemyClasses?: ClassId[];
  enemyLevel?: number;
  isBoss?: boolean;
  // 陷阱房特有
  trapDisarmed?: boolean;
  trapDamage?: number;
  // 宝箱房特有
  chestOpened?: boolean;
  chestGold?: number;
  chestItem?: Equipment;
  // 营地房特有
  campUsed?: boolean;
}

// 探索地牢实例
export interface DungeonInstance {
  id: string;
  name: string;
  theme: 'catacomb' | 'ruins' | 'forest' | 'crypt' | 'citadel';
  stars: number;
  totalRooms: number;
  currentRoomIndex: number;
  rooms: DungeonRoom[];
  isCompleted: boolean;
  isFailed: boolean;
  accumulatedGold: number;
  accumulatedSoulCrystals: number;
  lootItems: Equipment[];
}

// 营地休整结果
export interface CampRestResult {
  healedHeroes: Array<{ heroId: string; name: string; amount: number }>;
  stressRelievedHeroes: Array<{ heroId: string; name: string; amount: number }>;
  scoutEvent?: string;
  consumedRations: number;
}
