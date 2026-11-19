/**
 * 美术资源路径约定
 *
 * 规则见 docs/ART_ASSETS.md：文件名即 id，图片缺失时调用方回落到现有图标/纯色，
 * 所以「先跑起来、后补图」是安全的。每个函数返回**候选路径数组**，按顺序尝试。
 */

const BASE = import.meta.env.BASE_URL;

const path = (p: string) => `${BASE}${p}`;

/** 图纸卡面：先用 webp，其次保留旧的 SVG 占位 */
export function itemArtSources(blueprintId: string): string[] {
  return [path(`art/items/${blueprintId}.webp`), path(`art/items/${blueprintId}.svg`)];
}

/**
 * 英雄立绘：优先专属立绘（按姓名），其次职业 × 性别。
 * 姓名里的「团长·」「敌·」「👑」前缀要先剥掉。
 */
export function heroArtSources(hero: { name: string; classId: string; gender?: 'male' | 'female' }): string[] {
  const cleanName = hero.name.replace(/^(团长·|敌·|👑)/, '').trim();
  const sources: string[] = [];
  if (cleanName) sources.push(path(`art/heroes/${encodeURIComponent(cleanName)}.webp`));
  const gender = hero.gender === 'female' ? 'female' : 'male';
  sources.push(path(`art/heroes/${hero.classId}_${gender}.webp`));
  return sources;
}

/** 敌人立绘：生态 × 职能（tank / dps / healer / boss） */
export function enemyArtSources(contract: string, role: 'tank' | 'dps' | 'healer' | 'boss'): string[] {
  return [path(`art/enemies/${contract}_${role}.webp`)];
}

/** 城镇横幅 */
export function townArtSources(townId: string): string[] {
  return [path(`art/towns/${townId}.webp`)];
}

/** 地牢场景底图（对应 stageThemes 的 6 个主题） */
export function stageArtSources(theme: string): string[] {
  return [path(`art/stages/${theme}.webp`)];
}

/** 建筑 NPC 头像：guild / tavern / market / infirmary / blacksmith / sanctuary */
export function npcArtSources(npcId: string): string[] {
  return [path(`art/npc/${npcId}.webp`)];
}

/** 材料图标：iron / wood / leather / jade / coal / oil / sand */
export function materialArtSources(materialId: string): string[] {
  return [path(`art/materials/${materialId}.webp`)];
}
