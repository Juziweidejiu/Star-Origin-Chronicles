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

export interface Equipment {
  id: string;
  name: string;
  slot: 'weapon' | 'armor' | 'trinket';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  bonusDamage?: number;
  bonusHp?: number;
  bonusArmor?: number;
  affixText?: string;
}

export interface Hero {
  id: string;
  name: string;
  title?: string;
  isLeader?: boolean;
  race: string;
  classId: ClassId;
  role: Role;
  age: number;
  level: number;
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
