/**
 * 英雄属性与能力定义
 * 源自《Dungeons & Dynasties》解构算法与《Battle Brothers》佣兵系统
 */

export type Role = 'tank' | 'dps' | 'healer';

export type ClassId = 
  | 'guardian' | 'warden' | 'paladin' 
  | 'blademaster' | 'arcanist' | 'ranger' 
  | 'cleric' | 'druid' | 'bard';

export interface HeroAttributes {
  // 战斗机能
  weaponSkill: number;
  marksmanship: number;
  power: number;
  spellcraft: number;
  armorUse: number;
  parry: number;
  evasion: number;
  criticalStrike: number;
  // 战术心智
  composure: number;
  bravery: number;
  decisions: number;
  anticipation: number;
  teamwork: number;
  leadership: number;
  concentration: number;
  aggression: number;
  discipline: number;
  resolve: number;
  // 身体基底
  strength: number;
  agility: number;
  stamina: number;
  vitality: number;
  speed: number;
  reflexes: number;
  // 专精效能
  threat: number;
  mitigation: number;
  healing: number;
  support: number;
  crowdControl: number;
  positioning: number;
}

export interface HiddenAttributes {
  consistency: number;   // 稳定性
  bigGame: number;       // 大场面发挥
  pressure: number;      // 抗压性 (>=15 绝境坚守)
  deathProneness: number;// 濒死受创率
  loyalty: number;       // 忠诚度
  adaptability: number;  // 战术适应性
}

export interface GambitRule {
  id: string;
  target: 'lowestAlly' | 'self' | 'lowestEnemy' | 'highestEnemy' | 'nearestEnemy' | 'backlineEnemy' | 'allyAttacker';
  condition: 'always' | 'allyHpBelow50' | 'selfHpBelow40' | 'enemyNear' | 'targetHpBelow30';
  action: 'attack' | 'skill' | 'taunt' | 'heal' | 'defend';
}

/**
 * 九项核心属性（LoL 式扁平面板）
 * 人物由 30 维属性推导得出基础值，装备以「基础值 + 词条」叠加在其上。
 */
export type CoreStatKey =
  | 'ad'            // 物理攻击
  | 'ap'            // 法术攻击
  | 'armor'         // 物理防御
  | 'magicResist'   // 法术防御
  | 'attackSpeed'   // 攻击速度（换算为攻击间隔）
  | 'critChance'    // 暴击率
  | 'critDamage'    // 暴击伤害倍率
  | 'penetration'   // 穿透（削减敌方护甲/法防）
  | 'maxHp'         // 生命上限
  | 'healingPower'  // 治疗强度
  | 'tenacity';     // 韧性（控制减免，v1 预留）

export interface Affix {
  stat: CoreStatKey;
  kind: 'flat' | 'percent';
  value: number;      // flat: 绝对值；percent: 0.12 表示 +12%
  label: string;      // 展示名，如「物攻」
}

export interface Equipment {
  id: string;
  name: string;
  slot: 'weapon' | 'armor' | 'trinket';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  tier: number;       // 装等（跟随契约星级）
  base: Partial<Record<CoreStatKey, number>>;
  affixes: Affix[];
  affixText?: string;
}

/** 战斗时实际生效的最终属性（基础值 + 装备，不写回 hero） */
export interface ResolvedStats {
  maxHp: number;
  ad: number;
  ap: number;
  armor: number;
  magicResist: number;
  attackInterval: number;
  critChance: number;
  critDamage: number;
  penetration: number;
  healingPower: number;
  tenacity: number;
}

export interface Hero {
  id: string;
  name: string;
  title?: string;
  gender: 'male' | 'female';
  isLeader?: boolean;
  race: string;
  classId: ClassId;
  role: Role;
  age: number;
  level: number;
  experience?: number;     // 累计经验（缺省时按等级阈值反推）
  growthCarry?: number;    // CA 成长的小数余量，跨契约累计
  currentAbility: number;  // CA (1-200)
  potentialAbility: number;// PA (1-200)
  currentHp: number;
  maxHp: number;
  resource: number;       // 能量/法力/怒气
  maxResource: number;
  stress: number;         // 压力 (0-100)
  morale: number;         // 士气 (0-100)
  wage: number;           // 每日/周薪金
  attributes: HeroAttributes;
  hidden: HiddenAttributes;
  gambits: GambitRule[];
  equipment: {
    weapon?: Equipment;
    armor?: Equipment;
    trinket?: Equipment;
  };
  traits: string[];
  injuries: string[];
}
