import type { ClassId, Hero, HeroAttributes, HiddenAttributes, Role } from '../types/hero';

export const CLASS_CONFIG: Record<ClassId, { name: string; role: Role; hpMod: number; dmgMod: number; resourceType: string }> = {
  guardian:    { name: '护卫', role: 'tank',   hpMod: 1.70, dmgMod: 0.70, resourceType: '耐力' },
  warden:      { name: '守望者', role: 'tank', hpMod: 1.70, dmgMod: 0.85, resourceType: '怒气' },
  paladin:     { name: '圣武士', role: 'tank', hpMod: 1.65, dmgMod: 0.80, resourceType: '法力' },
  blademaster: { name: '剑圣',   role: 'dps',  hpMod: 1.30, dmgMod: 1.50, resourceType: '耐力' },
  arcanist:    { name: '奥术师', role: 'dps',  hpMod: 0.80, dmgMod: 1.60, resourceType: '法力' },
  ranger:      { name: '游侠',   role: 'dps',  hpMod: 0.95, dmgMod: 1.40, resourceType: '专注' },
  cleric:      { name: '牧师',   role: 'healer', hpMod: 0.95, dmgMod: 0.60, resourceType: '法力' },
  druid:       { name: '德鲁伊', role: 'healer', hpMod: 1.00, dmgMod: 0.60, resourceType: '专注' },
  bard:        { name: '诗人',   role: 'healer', hpMod: 1.00, dmgMod: 0.70, resourceType: '专注' }
};

export const SURNAMES = ['灰烬', '风行', '铁壁', '碎颅', '晨光', '影沼', '冬盾', '暴风', '月溪', '石砧'];
export const FIRST_NAMES = ['亚瑟', '伊文', '雷恩', '加雷斯', '罗兰', '塞拉', '薇尔', '凯瑟琳', '布隆', '泰隆'];

function randomRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateHero(classId: ClassId, isLeader: boolean = false): Hero {
  const cfg = CLASS_CONFIG[classId];
  const name = (isLeader ? '团长·' : '') + FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)] + ' ' + SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
  
  const ca = isLeader ? randomRange(90, 110) : randomRange(50, 95);
  const pa = isLeader ? randomRange(140, 175) : Math.min(200, ca + randomRange(15, 60));

  const baseAttr = Math.round(ca / 7);
  const attributes: HeroAttributes = {
    weaponSkill: Math.max(1, baseAttr + randomRange(-2, 3)),
    marksmanship: Math.max(1, baseAttr + randomRange(-3, 2)),
    power: Math.max(1, baseAttr + randomRange(-1, 3)),
    spellcraft: cfg.role === 'healer' || classId === 'arcanist' ? baseAttr + 4 : Math.max(1, baseAttr - 4),
    armorUse: cfg.role === 'tank' ? baseAttr + 4 : baseAttr,
    parry: Math.max(1, baseAttr + randomRange(-2, 2)),
    evasion: Math.max(1, baseAttr + randomRange(-2, 3)),
    criticalStrike: Math.max(1, baseAttr + randomRange(-1, 4)),
    composure: 10,
    bravery: 10,
    decisions: 10,
    anticipation: 10,
    teamwork: 12,
    leadership: isLeader ? 16 : 8,
    concentration: 10,
    aggression: 10,
    discipline: 11,
    resolve: 10,
    strength: cfg.role === 'tank' || classId === 'blademaster' ? baseAttr + 3 : baseAttr,
    agility: classId === 'ranger' || classId === 'blademaster' ? baseAttr + 3 : baseAttr,
    stamina: 10,
    vitality: cfg.role === 'tank' ? baseAttr + 4 : baseAttr,
    speed: 10,
    reflexes: 10,
    threat: cfg.role === 'tank' ? 14 : 4,
    mitigation: cfg.role === 'tank' ? 12 : 5,
    healing: cfg.role === 'healer' ? baseAttr + 5 : 2,
    support: cfg.role === 'healer' ? baseAttr + 3 : 4,
    crowdControl: 6,
    positioning: 10
  };

  const hidden: HiddenAttributes = {
    consistency: randomRange(8, 16),
    bigGame: randomRange(8, 16),
    pressure: isLeader ? 16 : randomRange(6, 15),
    deathProneness: randomRange(4, 12),
    loyalty: isLeader ? 20 : randomRange(10, 18),
    adaptability: randomRange(8, 16)
  };

  // 严格还原原版计算公式
  const maxHp = Math.round((40 + attributes.vitality * 6 + attributes.strength * 1.5) * cfg.hpMod);

  return {
    id: 'hero_' + Math.random().toString(36).slice(2, 9),
    name,
    isLeader,
    race: '人类',
    classId,
    role: cfg.role,
    age: randomRange(18, 28),
    level: Math.max(1, Math.floor(ca / 15)),
    currentAbility: ca,
    potentialAbility: pa,
    currentHp: maxHp,
    maxHp,
    resource: 0,
    maxResource: 100,
    stress: 0,
    morale: 95,
    wage: Math.round(ca * 0.25),
    attributes,
    hidden,
    gambits: [
      { id: 'g1', target: 'lowestAlly', condition: 'allyHpBelow50', action: cfg.role === 'healer' ? 'heal' : 'defend' },
      { id: 'g2', target: 'allyAttacker', condition: 'always', action: cfg.role === 'tank' ? 'taunt' : 'attack' },
      { id: 'g3', target: 'lowestEnemy', condition: 'always', action: 'attack' }
    ],
    equipment: {},
    traits: ['坚韧', '忠心'],
    injuries: []
  };
}
