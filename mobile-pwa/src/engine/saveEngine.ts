/**
 * 存档引擎
 * 把整局游戏（城镇 / 名册 / 阵型 / 背包 / 地牢进度）序列化进 localStorage。
 *
 * 设计取舍：
 * - 战斗瞬时状态（CombatEngine、跳字、弹道、结算弹窗）一律不存，
 *   刷新后回到「这一间还没打」的干净状态，避免恢复出半截战场。
 * - 任何异常（隐私模式、配额满、存档损坏、版本不符）都静默降级为「无存档」，
 *   绝不让存档逻辑把游戏卡死。
 */

import type { Equipment, Hero } from '../types/hero';
import type {
  CompanyLogistics,
  FallenSoul,
  GuildContract,
  TavernRecruit,
  TownId,
  TownNode,
} from '../types/world';
import type { DungeonInstance } from '../types/dungeon';
import type { FormationPresetId, FormationSlotAssignment } from '../types/formation';
import type { TownEngine } from './townEngine';

export const SAVE_KEY = 'starfall.save.v1';
export const SAVE_VERSION = 1;

/** 城镇引擎的五个可序列化字段 */
export interface TownSaveData {
  towns: Record<TownId, TownNode>;
  logistics: CompanyLogistics;
  contracts: Record<TownId, GuildContract[]>;
  tavernRecruits: Record<TownId, TavernRecruit[]>;
  fallenSouls: FallenSoul[];
}

/** 进行中的地牢：契约 + 副本实例 + 当前房间序号 */
export interface DungeonSaveData {
  contract: GuildContract;
  dungeon: DungeonInstance;
  roomIndex: number;
}

export interface SaveData {
  version: number;
  savedAt: number;
  town: TownSaveData;
  roster: Hero[];
  deployedHeroIds: string[];
  formationPreset: FormationPresetId;
  formationAssignments: FormationSlotAssignment[];
  inventory: Equipment[];
  dungeon: DungeonSaveData | null;
}

/** 除版本号与时间戳外的存档主体 */
export type SavePayload = Omit<SaveData, 'version' | 'savedAt'>;

function storage(): Storage | null {
  try {
    const s = window.localStorage;
    // 隐私模式下 localStorage 存在但写入会抛异常，这里只做存在性探测
    return s ?? null;
  } catch {
    return null;
  }
}

/** 结构体检：宁可判定为无存档，也不要让半个存档炸掉渲染 */
function isUsableSave(data: unknown): data is SaveData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<SaveData>;
  if (d.version !== SAVE_VERSION) return false;
  if (!d.town || typeof d.town !== 'object') return false;
  if (!Array.isArray(d.roster) || d.roster.length === 0) return false;
  if (!Array.isArray(d.deployedHeroIds)) return false;
  if (!Array.isArray(d.formationAssignments)) return false;
  if (!Array.isArray(d.inventory)) return false;
  return true;
}

export function loadSave(): SaveData | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isUsableSave(parsed)) {
      // 版本不符或结构损坏：留着原档不删，但本次按新游戏走
      console.warn('[save] 存档不可用，已忽略：', parsed);
      return null;
    }
    return parsed;
  } catch (err) {
    console.warn('[save] 读取存档失败：', err);
    return null;
  }
}

/**
 * 写入总闸。重开新档时会先 suspendSave()，避免「清档 → 刷新」之间
 * 800ms 防抖定时器把旧快照又写回去（页面重载后开关自然复位）。
 */
let saveSuspended = false;

export function suspendSave(): void {
  saveSuspended = true;
}

export function writeSave(payload: SavePayload): boolean {
  if (saveSuspended) return false;
  const s = storage();
  if (!s) return false;
  try {
    const data: SaveData = { ...payload, version: SAVE_VERSION, savedAt: Date.now() };
    s.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    // 配额超限 / 隐私模式：静默失败，游戏继续
    console.warn('[save] 写入存档失败：', err);
    return false;
  }
}

export function clearSave(): void {
  const s = storage();
  if (!s) return;
  try {
    s.removeItem(SAVE_KEY);
  } catch {
    /* 忽略 */
  }
}

/** 把存档里的城镇数据回填到引擎实例（引擎字段本身就是普通数据） */
export function applyTownSave(engine: TownEngine, town: TownSaveData): void {
  if (town.towns) engine.towns = town.towns;
  if (town.logistics) engine.logistics = town.logistics;
  if (town.contracts) engine.contracts = town.contracts;
  if (town.tavernRecruits) engine.tavernRecruits = town.tavernRecruits;
  if (Array.isArray(town.fallenSouls)) engine.fallenSouls = town.fallenSouls;
}

/** 存档时间戳转成一句人话 */
export function formatSavedAt(savedAt: number): string {
  if (!savedAt) return '尚未保存';
  const diff = Date.now() - savedAt;
  if (diff < 60_000) return '刚刚已保存';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前已保存`;
  const d = new Date(savedAt);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `上次保存 ${hh}:${mm}`;
}
