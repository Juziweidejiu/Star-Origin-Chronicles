/**
 * 存档引擎
 * 把整局游戏（城镇 / 名册 / 阵型 / 背包 / 地牢进度）序列化进 localStorage。
 *
 * 设计取舍：
 * - 战斗瞬时状态（CombatEngine、跳字、弹道、结算弹窗）一律不存，
 *   刷新后回到「这一间还没打」的干净状态，避免恢复出半截战场。
 * - 任何异常（隐私模式、配额满、存档损坏、版本不符）都静默降级为「无存档」，
 *   绝不让存档逻辑把游戏卡死。
 * - 版本升级走链式迁移（见 docs/SAVE_MIGRATION.md）：先备份原档，逐级翻译，
 *   成功后自愈回写；任何一级失败都「不写不删」。
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
import { GRID_SLOTS } from '../types/formation';
import type { FormationPresetId, FormationSlotAssignment } from '../types/formation';
import type { TownEngine } from './townEngine';

/** 主档键名。`v1` 是命名空间历史遗留，**不是**真实版本号；真实版本只看 payload.version */
export const SAVE_KEY = 'starfall.save.v1';
/** 升级前快照。只写不读，供人工排查，绝不参与自动恢复 */
export const BACKUP_KEY = `${SAVE_KEY}.backup`;
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

// ---------------------------------------------------------------------------
// 存储访问
// ---------------------------------------------------------------------------

function storage(): Storage | null {
  try {
    const s = window.localStorage;
    // 隐私模式下 localStorage 存在但写入会抛异常，这里只做存在性探测
    return s ?? null;
  } catch {
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

function persist(s: Storage, data: SaveData): boolean {
  if (saveSuspended) return false;
  try {
    s.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    // 配额超限 / 隐私模式：静默失败，游戏继续
    console.warn('[save] 写入存档失败：', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// 版本迁移链
// ---------------------------------------------------------------------------

/** 尚未校验的存档主体：迁移函数在「旧形态」上工作，因此不能用 SaveData 约束 */
export type SavePayloadRaw = Record<string, unknown>;

/** 一级迁移：把 version === from 的存档翻译成 from + 1 的形态 */
export type SaveMigration = (old: SavePayloadRaw) => SavePayloadRaw;
export type SaveMigrationTable = Readonly<Record<number, SaveMigration>>;

/**
 * 已注册的迁移。键 = 起始版本，值 = 该版本 → 下一版本的翻译函数。
 * P1-2（地牢改图）落地时在此登记 `1: migrateV1ToV2` 并 bump SAVE_VERSION。
 */
export const SAVE_MIGRATIONS: SaveMigrationTable = {};

export type LoadStatus = 'ok' | 'empty' | 'corrupt' | 'tooNew' | 'gap' | 'migrationFailed';

export interface LoadDiagnostics {
  status: LoadStatus;
  fromVersion?: number;
  error?: unknown;
}

export type MigrationOutcome =
  | { ok: true; data: SavePayloadRaw; from: number; migrated: boolean }
  | {
      ok: false;
      status: 'corrupt' | 'tooNew' | 'gap' | 'migrationFailed';
      fromVersion?: number;
      error?: unknown;
    };

/**
 * 纯函数：把任意形态的存档逐级迁移到 targetVersion。
 * 不读 storage / 不读时钟 / 不做随机，同输入必然同输出，可直接单测。
 */
export function applyMigrations(
  raw: unknown,
  migrations: SaveMigrationTable,
  targetVersion: number,
): MigrationOutcome {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, status: 'corrupt' };
  }
  const input = raw as SavePayloadRaw;
  const from = input.version;
  if (typeof from !== 'number' || !Number.isInteger(from) || from < 1) {
    return { ok: false, status: 'corrupt' };
  }
  if (from > targetVersion) {
    return { ok: false, status: 'tooNew', fromVersion: from };
  }

  let data = input;
  for (let v = from; v < targetVersion; v += 1) {
    const step = migrations[v];
    if (typeof step !== 'function') {
      return { ok: false, status: 'gap', fromVersion: from };
    }
    try {
      const next: unknown = step(data);
      if (!next || typeof next !== 'object' || Array.isArray(next)) {
        return { ok: false, status: 'migrationFailed', fromVersion: from };
      }
      data = next as SavePayloadRaw;
    } catch (error) {
      return { ok: false, status: 'migrationFailed', fromVersion: from, error };
    }
  }

  return { ok: true, data: { ...data, version: targetVersion }, from, migrated: from !== targetVersion };
}

// ---------------------------------------------------------------------------
// 结构归一：只翻译结构、裁掉非法字段，绝不创造玩法状态
// ---------------------------------------------------------------------------

/** 与 FormationPresetId 同构，新增预设时 TypeScript 会在此报错提醒同步 */
const KNOWN_PRESETS: Record<FormationPresetId, true> = {
  shield_wall: true,
  arrowhead: true,
  solid_defense: true,
  skirmish: true,
  dual_healer: true,
  rush_attack: true,
  custom: true,
};

const KNOWN_SLOTS = new Set<string>(GRID_SLOTS.map(slot => slot.id));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 地牢结构不合法时整趟作废回城，比恢复出半截战场安全 */
function normalizeDungeon(value: unknown): DungeonSaveData | null {
  if (!isRecord(value)) return null;
  const { contract, dungeon } = value;
  if (!isRecord(contract) || !isRecord(dungeon)) return null;
  if (typeof dungeon.id !== 'string') return null;
  if (!Array.isArray(dungeon.rooms) || dungeon.rooms.length === 0) return null;
  if (typeof dungeon.totalRooms !== 'number' || typeof dungeon.currentRoomIndex !== 'number') return null;

  const roomIndex =
    typeof value.roomIndex === 'number' && Number.isFinite(value.roomIndex)
      ? value.roomIndex
      : dungeon.currentRoomIndex;

  return {
    contract: contract as unknown as GuildContract,
    dungeon: dungeon as unknown as DungeonInstance,
    roomIndex,
  };
}

/**
 * 把迁移后的原始对象收敛成 SaveData。
 * 缺失的玩法默认值交给引擎（TownEngine / generateHero），这里只做「裁」不做「补」。
 */
export function normalizeSave(raw: SavePayloadRaw): SaveData | null {
  const { town } = raw;
  if (!isRecord(town)) return null;

  const roster = Array.isArray(raw.roster) ? raw.roster.filter(isRecord) : [];
  if (roster.length === 0) return null;

  const heroIds = new Set<string>();
  for (const hero of roster) {
    if (typeof hero.id === 'string') heroIds.add(hero.id);
  }

  // 存档里残留的已删英雄 id 会把首发列表撑成空壳
  const deployedHeroIds = (Array.isArray(raw.deployedHeroIds) ? raw.deployedHeroIds : []).filter(
    (id): id is string => typeof id === 'string' && heroIds.has(id),
  );

  const formationAssignments = (Array.isArray(raw.formationAssignments) ? raw.formationAssignments : []).filter(
    (item): item is FormationSlotAssignment =>
      isRecord(item) &&
      typeof item.heroId === 'string' &&
      heroIds.has(item.heroId) &&
      typeof item.slotId === 'string' &&
      KNOWN_SLOTS.has(item.slotId),
  );

  const presetId = raw.formationPreset;
  const formationPreset: FormationPresetId =
    typeof presetId === 'string' && KNOWN_PRESETS[presetId as FormationPresetId]
      ? (presetId as FormationPresetId)
      : 'shield_wall';

  const inventory = Array.isArray(raw.inventory)
    ? (raw.inventory.filter(isRecord) as unknown as Equipment[])
    : [];

  return {
    version: typeof raw.version === 'number' ? raw.version : SAVE_VERSION,
    savedAt: typeof raw.savedAt === 'number' ? raw.savedAt : Date.now(),
    town: town as unknown as TownSaveData,
    roster: roster as unknown as Hero[],
    deployedHeroIds,
    formationPreset,
    formationAssignments,
    inventory,
    dungeon: normalizeDungeon(raw.dungeon),
  };
}

// ---------------------------------------------------------------------------
// 读档
// ---------------------------------------------------------------------------

/** 升级前快照：只在备份位空缺时落盘，永不覆盖已保存的原始档 */
function stashBackup(s: Storage, rawText: string): void {
  try {
    if (s.getItem(BACKUP_KEY)) return;
    s.setItem(BACKUP_KEY, rawText);
  } catch (err) {
    console.warn('[save] 备份原档失败：', err);
  }
}

/**
 * 从给定 Storage 读档：解析 → 迁移 → 归一 → 必要时自愈回写。
 * 抽出来是为了让单测能注入迁移表与目标版本（生产入口 loadSave 不传参）。
 */
export function readSave(
  s: Storage,
  migrations: SaveMigrationTable = SAVE_MIGRATIONS,
  targetVersion: number = SAVE_VERSION,
): { save: SaveData | null; diag: LoadDiagnostics } {
  let rawText: string | null;
  try {
    rawText = s.getItem(SAVE_KEY);
  } catch (err) {
    console.warn('[save] 读取存档失败：', err);
    return { save: null, diag: { status: 'corrupt', error: err } };
  }
  if (!rawText) return { save: null, diag: { status: 'empty' } };

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    console.warn('[save] 存档 JSON 解析失败：', err);
    return { save: null, diag: { status: 'corrupt', error: err } };
  }

  const outcome = applyMigrations(parsed, migrations, targetVersion);
  if (!outcome.ok) {
    // 未来版本（用户回滚到旧构建）：先留副本，免得随后的自动保存把新档铲掉
    if (outcome.status === 'tooNew') stashBackup(s, rawText);
    console.warn(`[save] 存档不可用（${outcome.status}），已忽略：`, parsed);
    return {
      save: null,
      diag: { status: outcome.status, fromVersion: outcome.fromVersion, error: outcome.error },
    };
  }

  const save = normalizeSave(outcome.data);
  if (!save) {
    console.warn('[save] 存档结构不完整，已忽略：', parsed);
    return { save: null, diag: { status: 'corrupt', fromVersion: outcome.from } };
  }

  if (outcome.migrated) {
    stashBackup(s, rawText);
    save.version = targetVersion;
    if (!persist(s, save)) {
      // 回写失败不影响本局：内存里已是迁移后的数据
      console.warn(`[save] 迁移成功但回写失败（${outcome.from} → ${targetVersion}）`);
    }
  }

  return { save, diag: { status: 'ok', fromVersion: outcome.from } };
}

export function loadSaveDetailed(): { save: SaveData | null; diag: LoadDiagnostics } {
  const s = storage();
  if (!s) return { save: null, diag: { status: 'empty' } };
  return readSave(s);
}

export function loadSave(): SaveData | null {
  return loadSaveDetailed().save;
}

export function writeSave(payload: SavePayload): boolean {
  const s = storage();
  if (!s) return false;
  return persist(s, { ...payload, version: SAVE_VERSION, savedAt: Date.now() });
}

/** 只清主档；备份不参与读档，留作人工排查的最后一根稻草 */
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
