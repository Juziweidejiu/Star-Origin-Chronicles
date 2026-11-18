/**
 * 打造引擎：图纸 → 备料 → 三段小游戏 → 成品
 *
 * 纯函数状态机：startCraft / craftBeat / settleCraft 都不读时钟、不碰 DOM；
 * 随机源可注入（rng），因此整套手感与数值都能直接单测。
 */

import type { Affix, CoreStatKey, Equipment } from '../types/hero';
import type { CompanyLogistics } from '../types/world';
import {
  AFFIX_GRADE_GATE,
  CRAFT_AFFIX_POOL,
  MATERIALS,
  TIER_LABEL,
  type AffixDef,
  type AffixGrade,
  type Blueprint,
  type CraftTier,
  type MaterialBag,
  type MaterialId,
  BASE_MATERIALS,
  blueprintBase,
  blueprintTemplate,
  emptyMaterials,
} from './blueprintData';
import { RARITY_LABEL, RARITY_ORDER, scaleTemplateBase } from './dungeonEngine';

// ---------------------------------------------------------------------------
// 备料与工钱
// ---------------------------------------------------------------------------

export interface CraftSettings {
  /** 1 省料 / 2 足料 / 3 豪掷 */
  grade: 1 | 2 | 3;
  /** 精煤份数 0-3，拓宽火候容错 */
  coal: number;
  /** 淬火油：抬高品质下限 */
  oil: boolean;
  /** 星陨砂：额外一条词条 */
  sand: boolean;
}

export const DEFAULT_SETTINGS: CraftSettings = { grade: 2, coal: 1, oil: false, sand: false };

export type MaterialCost = Partial<Record<MaterialId, number>>;

export interface CraftCost {
  materials: MaterialCost;
  gold: number;
}

/** 老板代打的加价倍率 */
export const BOSS_MARKUP = 1.6;

export function craftMaterialCost(bp: Blueprint, settings: CraftSettings): MaterialCost {
  const out: MaterialCost = {};
  for (const id of BASE_MATERIALS) {
    const base = bp.cost[id];
    if (base && base > 0) out[id] = base * settings.grade;
  }
  if (settings.coal > 0) out.coal = Math.min(3, settings.coal);
  if (settings.oil) out.oil = 1;
  if (settings.sand) out.sand = 1;
  return out;
}

export function craftGoldCost(bp: Blueprint, discount = 1, boss = false): number {
  const base = 60 + 40 * bp.tier;
  const price = boss ? base * BOSS_MARKUP : base;
  return Math.max(1, Math.round(price * discount));
}

export function craftCost(bp: Blueprint, settings: CraftSettings, discount = 1, boss = false): CraftCost {
  return { materials: craftMaterialCost(bp, settings), gold: craftGoldCost(bp, discount, boss) };
}

export function canPay(bag: MaterialBag, cost: MaterialCost): boolean {
  for (const [id, need] of Object.entries(cost) as [MaterialId, number][]) {
    if ((bag[id] ?? 0) < need) return false;
  }
  return true;
}

/** 纯函数扣料：返回新背包，不足时原样返回 */
export function payMaterials(bag: MaterialBag, cost: MaterialCost): MaterialBag {
  if (!canPay(bag, cost)) return bag;
  const next = { ...bag };
  for (const [id, need] of Object.entries(cost) as [MaterialId, number][]) {
    next[id] = Math.max(0, (next[id] ?? 0) - need);
  }
  return next;
}

export function addMaterials(bag: MaterialBag, gain: MaterialCost): MaterialBag {
  const next = { ...bag };
  for (const [id, n] of Object.entries(gain) as [MaterialId, number][]) {
    next[id] = Math.max(0, (next[id] ?? 0) + n);
  }
  return next;
}

export function costText(cost: MaterialCost): string {
  return (Object.entries(cost) as [MaterialId, number][])
    .filter(([, n]) => n > 0)
    .map(([id, n]) => `${MATERIALS[id].short}×${n}`)
    .join(' ');
}

// ---------------------------------------------------------------------------
// 熟练度：按品阶各自成长，满级放宽但不取消操作
// ---------------------------------------------------------------------------

export const PROF_STEP = 150;
export const PROF_MAX_LEVEL = 5;
export const PROF_MAX_XP = PROF_STEP * PROF_MAX_LEVEL;

export interface ProfessionMods {
  level: number;
  /** 指针速度倍率，越小越慢 */
  speed: number;
  /** 命中区宽度倍率 */
  win: number;
  /** 完美判定占命中区的比例 */
  perfect: number;
  /** 淬火容差（百分点） */
  quenchPad: number;
}

export function professionLevel(xp: number): number {
  return Math.max(1, Math.min(PROF_MAX_LEVEL, 1 + Math.floor(Math.max(0, xp) / PROF_STEP)));
}

export function professionBar(xp: number): { level: number; current: number; need: number; pct: number } {
  const level = professionLevel(xp);
  if (level >= PROF_MAX_LEVEL) return { level, current: PROF_STEP, need: PROF_STEP, pct: 100 };
  const current = Math.max(0, xp) % PROF_STEP;
  return { level, current, need: PROF_STEP, pct: Math.round((current / PROF_STEP) * 100) };
}

export function professionMods(xp: number): ProfessionMods {
  const level = professionLevel(xp);
  const k = level - 1;
  return {
    level,
    speed: 1 - 0.05 * k,
    win: 1 + 0.06 * k,
    perfect: 0.18 + 0.03 * k,
    quenchPad: 8 + 2 * k,
  };
}

/**
 * 单件成品的熟练度收益。
 * 同一张图纸打太多遍会递减：第 10 件后减半，第 20 件后为零。
 * 防止玩家只磨一张低级图纸。
 */
export function professionGain(quality: number, perfects: number, madeCount: number): number {
  if (madeCount >= 20) return 0;
  const raw = 20 + quality * 26 + perfects * 5;
  const scaled = madeCount >= 10 ? raw * 0.5 : raw;
  return Math.max(0, Math.round(scaled));
}

// ---------------------------------------------------------------------------
// 小游戏状态机
// ---------------------------------------------------------------------------

export type CraftPhase = 'heat' | 'hammer' | 'quench';
export type BeatGrade = 'perfect' | 'good' | 'miss';

export const PHASE_ROUNDS: Record<CraftPhase, number> = { heat: 5, hammer: 4, quench: 1 };

export interface CraftSession {
  blueprintId: string;
  tier: CraftTier;
  settings: CraftSettings;
  phase: CraftPhase;
  /** 当前阶段已完成的次数 */
  step: number;
  /** 命中区中心与宽度，均为 0-100 的百分比 */
  zoneCenter: number;
  zoneWidth: number;
  /** 指针速度倍率，1 = 基准 */
  speed: number;
  quality: number;
  perfectHeat: number;
  perfectHammer: number;
  quench: 'early' | 'exact' | 'late' | null;
  finished: boolean;
}

export const QUALITY_MIN = 0.82;
export const QUALITY_MAX = 1.30;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function phaseWidth(phase: CraftPhase, tier: number, settings: CraftSettings, step: number, mods: ProfessionMods): number {
  if (phase === 'heat') {
    const raw = 30 + tier * 2 + settings.coal * 3 - step * 1.2;
    return clamp(raw * mods.win, 18, 56);
  }
  if (phase === 'hammer') {
    const base = [17, 14, 11, 9][Math.min(step, 3)];
    return clamp(base * mods.win, 8, 24);
  }
  // 淬火整条都要看，命中区宽度代表容错
  return clamp((mods.quenchPad * 2) * 0.6, 8, 26);
}

function zoneCenter(rng: () => number, phase: CraftPhase): number {
  // 火候在偏暖的一侧摆动（46-72），锻打在砧心附近，淬火居中
  if (phase === 'heat') return 46 + rng() * 26;
  if (phase === 'hammer') return 44 + rng() * 16;
  return 50;
}

export function startCraft(
  bp: Blueprint,
  settings: CraftSettings,
  professionXp: number,
  rng: () => number = Math.random,
): CraftSession {
  const mods = professionMods(professionXp);
  const width = phaseWidth('heat', bp.tier, settings, 0, mods);
  return {
    blueprintId: bp.id,
    tier: bp.tier,
    settings,
    phase: 'heat',
    step: 0,
    zoneCenter: zoneCenter(rng, 'heat'),
    zoneWidth: width,
    speed: (2.1) * mods.speed,
    quality: settings.oil ? 0.98 : 0.87,
    perfectHeat: 0,
    perfectHammer: 0,
    quench: null,
    finished: false,
  };
}

/** 当前这一下的完美判定半径（百分比） */
export function perfectRadius(session: CraftSession, mods: ProfessionMods): number {
  return (session.zoneWidth * mods.perfect) / 2;
}

export function judgeBeat(session: CraftSession, position: number, mods: ProfessionMods): BeatGrade {
  if (session.phase === 'quench') {
    const pad = mods.quenchPad;
    const d = Math.abs(position - 50);
    if (d <= pad / 2) return 'perfect';
    if (d <= pad) return 'good';
    return 'miss';
  }
  const dist = Math.abs(position - session.zoneCenter);
  if (dist <= perfectRadius(session, mods)) return 'perfect';
  if (dist <= session.zoneWidth / 2) return 'good';
  return 'miss';
}

export interface BeatOutcome {
  session: CraftSession;
  grade: BeatGrade;
  /** 这一下之后的阶段（响应后用来切换界面文案） */
  phase: CraftPhase;
  finished: boolean;
}

/** 玩家敲一下：输入指针位置（0-100），返回新 session */
export function craftBeat(
  session: CraftSession,
  position: number,
  professionXp: number,
  rng: () => number = Math.random,
): BeatOutcome {
  if (session.finished) return { session, grade: 'miss', phase: session.phase, finished: true };
  const mods = professionMods(professionXp);
  const grade = judgeBeat(session, position, mods);

  let quality = session.quality;
  let perfectHeat = session.perfectHeat;
  let perfectHammer = session.perfectHammer;
  let quench = session.quench;

  if (session.phase === 'heat') {
    if (grade === 'perfect') {
      quality += 0.024;
      perfectHeat += 1;
    } else if (grade === 'good') quality += 0.012;
    else quality -= 0.006;
  } else if (session.phase === 'hammer') {
    if (grade === 'perfect') {
      quality += 0.032;
      perfectHammer += 1;
    } else if (grade === 'good') quality += 0.016;
    else quality -= 0.012;
  } else if (grade === 'perfect') {
    quality += 0.055;
    quench = 'exact';
  } else if (grade === 'good') {
    quality += 0.02;
    quench = position < 50 ? 'early' : 'late';
  } else {
    quality -= 0.02;
    quench = position < 50 ? 'early' : 'late';
  }

  quality = clamp(Math.round(quality * 1000) / 1000, QUALITY_MIN, QUALITY_MAX);

  const rounds = PHASE_ROUNDS[session.phase];
  const step = session.step + 1;

  if (step < rounds) {
    return {
      session: { ...session, step, quality, perfectHeat, perfectHammer, quench },
      grade,
      phase: session.phase,
      finished: false,
    };
  }

  // 阶段结束
  if (session.phase === 'quench') {
    return {
      session: { ...session, step, quality, perfectHeat, perfectHammer, quench, finished: true },
      grade,
      phase: 'quench',
      finished: true,
    };
  }

  const nextPhase: CraftPhase = session.phase === 'heat' ? 'hammer' : 'quench';
  const nextStep = 0;
  const width = phaseWidth(nextPhase, session.tier, session.settings, nextStep, mods);
  return {
    session: {
      ...session,
      phase: nextPhase,
      step: nextStep,
      zoneCenter: zoneCenter(rng, nextPhase),
      zoneWidth: width,
      speed: (nextPhase === 'hammer' ? 0.92 : 1.1) * mods.speed,
      quality,
      perfectHeat,
      perfectHammer,
      quench,
    },
    grade,
    phase: nextPhase,
    finished: false,
  };
}

// ---------------------------------------------------------------------------
// 成品结算
// ---------------------------------------------------------------------------

const AFFIX_CAP: Record<Equipment['rarity'], number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

/** 品质 → 品阶：0.82 起算，满 1.30 封顶 */
export function rarityOfQuality(quality: number): Equipment['rarity'] {
  const r = clamp((quality - QUALITY_MIN) / (QUALITY_MAX - QUALITY_MIN), 0, 1);
  if (r < 0.22) return 'common';
  if (r < 0.45) return 'uncommon';
  if (r < 0.68) return 'rare';
  if (r < 0.88) return 'epic';
  return 'legendary';
}

function scaleValue(key: CoreStatKey, value: number, mult: number): number {
  if (key === 'critChance' || key === 'critDamage' || key === 'attackSpeed' || key === 'tenacity') {
    return Math.round(value * mult * 1000) / 1000;
  }
  return Math.max(1, Math.round(value * mult));
}

/**
 * 生成成品。词条数量由「品阶上限」与「完美次数 + 星陨砂」共同决定，
 * 因此完美通关才可能摸到满词条。
 */
export function settleCraft(
  session: CraftSession,
  bp: Blueprint,
  id: string,
  rng: () => number = Math.random,
): Equipment {
  const quality = clamp(session.quality, QUALITY_MIN, QUALITY_MAX);
  const rarity = rarityOfQuality(quality);
  const template = blueprintTemplate(bp);

  const baseRaw = scaleTemplateBase(template, bp.tier);
  const base: Partial<Record<CoreStatKey, number>> = {};
  for (const [key, value] of Object.entries(baseRaw) as [CoreStatKey, number][]) {
    base[key] = scaleValue(key, value, quality);
  }

  const cap = AFFIX_CAP[rarity];
  const bonus = (session.perfectHeat >= PHASE_ROUNDS.heat ? 1 : 0)
    + (session.perfectHammer >= PHASE_ROUNDS.hammer ? 1 : 0)
    + (session.settings.sand ? 1 : 0);
  const count = Math.min(cap, (cap > 0 ? 1 : 0) + bonus);

  const allowed = new Set<AffixGrade>(AFFIX_GRADE_GATE[rarity]);
  const pool = CRAFT_AFFIX_POOL[template.slot].filter(def => allowed.has(def.grade));
  const picks: AffixDef[] = [];
  while (picks.length < count && pool.length > 0) {
    const idx = Math.floor(rng() * pool.length);
    picks.push(pool.splice(idx, 1)[0]);
  }

  const tierMult = 1 + 0.3 * (bp.tier - 1);
  const qualityMult = 0.9 + quality * 0.18;
  const affixes: Affix[] = picks.map(def => {
    const raw = def.min + rng() * (def.max - def.min);
    const scaled = def.kind === 'percent'
      ? raw * (1 + 0.15 * (bp.tier - 1)) * qualityMult
      : raw * tierMult * qualityMult;
    const value = def.kind === 'percent'
      ? Math.round(scaled * 1000) / 1000
      : Math.max(1, Math.round(scaled));
    return {
      stat: def.stat,
      kind: def.kind,
      value,
      label: def.label,
      name: def.name,
      grade: def.grade,
    };
  });

  return {
    id,
    name: `${RARITY_LABEL[rarity]}·${bp.name}`,
    slot: template.slot,
    rarity,
    tier: bp.tier,
    quality,
    base,
    affixes,
    affixText: affixes.length > 0 ? affixes.map(formatCraftAffix).join(' · ') : undefined,
    crafted: true,
    blueprintId: bp.id,
  };
}

/** 「+12%」 / 「+12」 */
export function formatAffixValue(a: Affix): string {
  if (a.kind === 'percent' || a.stat === 'critChance' || a.stat === 'critDamage' || a.stat === 'tenacity') {
    return `+${Math.round(a.value * 100)}%`;
  }
  return `+${a.value}`;
}

/** 「锋锐·物攻 +12%」 */
export function formatCraftAffix(a: Affix): string {
  const label = a.name ? `${a.name}·${a.label}` : a.label;
  return `${label} ${formatAffixValue(a)}`;
}

/** 老板代打：品质锁定在 1.00-1.06，词条照常随机，不涨熟练度 */
export function bossQuality(rng: () => number = Math.random): number {
  return Math.round((1 + rng() * 0.06) * 100) / 100;
}

export type CraftSource = 'self' | 'boss';

// ---------------------------------------------------------------------------
// 掉落与回收
// ---------------------------------------------------------------------------

const RARITY_RANK: Record<Equipment['rarity'], number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
};

/** 分解回收：按部位回基础料，品阶与装等放大收益 */
export function salvageMaterials(item: Equipment): MaterialCost {
  const rank = RARITY_RANK[item.rarity];
  const t = Math.max(1, item.tier);
  const out: MaterialCost = {};
  if (item.slot === 'weapon') {
    out.iron = Math.max(1, Math.ceil(rank * t * 0.8));
    if (item.tier >= 3) out.wood = Math.ceil(rank * 0.6);
    if (item.tier >= 4) out.coal = 1;
  } else if (item.slot === 'armor') {
    out.iron = Math.max(1, Math.ceil(rank * t * 0.6));
    out.leather = Math.max(1, Math.ceil(rank * 0.8));
    if (item.tier >= 4) out.coal = 1;
  } else {
    out.jade = Math.max(1, Math.ceil(rank * t * 0.5));
    if (rank >= 4) out.sand = 1;
  }
  return out;
}

export interface CraftDrop {
  materials: MaterialCost;
  blueprintId?: string;
}

function pickOne<T>(list: T[], rng: () => number): T {
  return list[Math.floor(rng() * list.length) % list.length];
}

/**
 * 一趟战斗结束后的打造资源。
 * 图纸只掉「还没解锁」的：集齐后改为折算成材料，不会给重复占位。
 */
export function rollCraftDrop(
  stars: number,
  unlocked: readonly string[],
  blueprints: readonly Blueprint[],
  isBoss: boolean,
  rng: () => number = Math.random,
): CraftDrop {
  const materials: MaterialCost = {};
  const tier = Math.max(1, Math.min(5, stars));
  materials.iron = 1 + Math.floor(rng() * (tier + 1));
  materials.leather = 1 + Math.floor(rng() * tier);
  if (rng() < 0.5) materials.wood = 1 + Math.floor(rng() * tier);
  if (rng() < 0.35) materials.jade = 1 + Math.floor(rng() * Math.max(1, tier - 1) + 1);
  if (rng() < 0.25 + stars * 0.05) materials.coal = 1;

  const owned = new Set(unlocked);
  const eligible = blueprints.filter(bp => {
    if (owned.has(bp.id)) return false;
    if (bp.source === 'dungeon') return (bp.stars ?? 1) <= stars;
    if (bp.source === 'boss') return isBoss && (bp.stars ?? 3) <= stars;
    return false;
  });

  let blueprintId: string | undefined;
  const chance = (isBoss ? 1 : 0.18) + stars * 0.04;
  if (eligible.length > 0 && rng() < chance) {
    // 低阶优先，避免一上来就出高阶图纸
    const sorted = [...eligible].sort((a, b) => a.tier - b.tier);
    blueprintId = pickOne(sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2))), rng).id;
  } else if (eligible.length === 0 && rng() < 0.3) {
    // 图纸集齐后的稀薄补偿
    if (rng() < 0.5) materials.sand = 1;
    else materials.oil = 1;
  }

  return { materials, blueprintId };
}

/** 声望 / 五星首通等非战斗解锁，统一在这里判定 */
export function unlockByProgress(
  blueprints: readonly Blueprint[],
  unlocked: readonly string[],
  ctx: { reputation: number; clearedStars: number },
): string[] {
  const owned = new Set(unlocked);
  const gained: string[] = [];
  for (const bp of blueprints) {
    if (owned.has(bp.id)) continue;
    if (bp.source === 'reputation' && ctx.reputation >= (bp.reputation ?? 999)) {
      gained.push(bp.id);
    } else if (bp.source === 'legend' && ctx.clearedStars >= (bp.stars ?? 5)) {
      gained.push(bp.id);
    }
  }
  return gained;
}

/** 备料面板的说明行 */
export function blueprintSummary(bp: Blueprint): string {
  const t = blueprintTemplate(bp);
  const parts = Object.entries(t.base)
    .filter(([, v]) => (v as number) > 0)
    .map(([k, v]) => `${k} ${v as number}`);
  return `${TIER_LABEL[bp.tier]} · T${bp.tier} · ${parts.join(' ')}`;
}

/** 给 UI 用的材料栏顺序 */
export const MATERIAL_ORDER: MaterialId[] = ['iron', 'wood', 'leather', 'jade', 'coal', 'oil', 'sand'];

/** 图纸品阶总和，用于展示收藏度 */
export function blueprintBookProgress(unlocked: readonly string[], blueprints: readonly Blueprint[]): { owned: number; total: number } {
  return { owned: blueprints.filter(bp => unlocked.includes(bp.id)).length, total: blueprints.length };
}

/** 把装备的稀有度排序值给 UI 用 */
export function rarityRank(rarity: Equipment['rarity']): number {
  return RARITY_ORDER.indexOf(rarity) + 1;
}

/** 兼容旧布局：把 CompanyLogistics 的旧材料折算进新背包（只读参考） */
export function legacyMaterialHint(log: CompanyLogistics): { ironOre: number; forgeStones: number } {
  return { ironOre: log.ironOre, forgeStones: log.forgeStones };
}

// ---------------------------------------------------------------------------
// 存档形态
// ---------------------------------------------------------------------------

export interface CraftProgress {
  materials: MaterialBag;
  unlocked: string[];
  /** 品阶 → 该品阶累积的熟练度（JSON 里按字符键存） */
  xp: Record<string, number>;
  /** 图纸 id → 已打造的件数（打太多会递减） */
  counts: Record<string, number>;
}

export function emptyCraftProgress(): CraftProgress {
  return { materials: emptyMaterials(), unlocked: [], xp: {}, counts: {} };
}

export function xpOf(progress: CraftProgress, tier: CraftTier): number {
  return progress.xp[String(tier)] ?? 0;
}

export function withXp(progress: CraftProgress, tier: CraftTier, xp: number): CraftProgress {
  const capped = Math.min(PROF_MAX_XP, Math.max(0, Math.round(xp)));
  return { ...progress, xp: { ...progress.xp, [String(tier)]: capped } };
}

export function materialCount(progress: CraftProgress, id: MaterialId): number {
  return progress.materials[id] ?? 0;
}

export { blueprintBase };
