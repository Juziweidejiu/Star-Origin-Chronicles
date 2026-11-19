/**
 * 《三岔口》角色、地名与生态场景数据池
 *
 * 核心设计规范（见 docs/NAMING_STYLE_GUIDE_V2.md）：
 * 1. 人名：常见江湖大姓 + 器物/节气字，或市井绰号；禁用网文高危姓与字眼。
 * 2. 城镇：地形/水文/建筑/物产 + 镇/渡/口/驿/堡/关/谷/湾/集。
 * 3. 副本：近三十年事由/地貌 + 具体场所，禁止远古文明与失落科技。
 * 4. 零颜色字、零冷热词、零野炊食材名。
 */

import type { ClassId } from '../types/hero';

export interface HeroProfilePreset {
  name: string;
  title: string;
  gender: 'male' | 'female';
  preferredClass: ClassId;
  bio: string;
}

/** 兼容旧引用名 */
export type CharacterProfile = HeroProfilePreset;

// 常见江湖大姓
export const SURNAMES = [
  '陈', '周', '林', '张', '徐', '唐', '宋', '石', '许', '方',
  '吴', '郑', '胡', '邓', '冯', '赵', '王', '李', '韩', '丁',
];

// 男名池：器物、节气、日常字与江湖小名
export const MALE_GIVEN_NAMES = [
  '砚', '铁山', '轻舟', '言', '远', '阿七', '阿九', '小满',
  '安', '平', '仲', '伯仲', '知行', '承业', '石', '山',
];

// 女名池：草木、节气、干脆单字或小名
export const FEMALE_GIVEN_NAMES = [
  '禾', '英', '秋', '半夏', '巧', '小锤', '阿秋', '宁',
  '桐', '满', '枝', '穗', '双', '岚', '小满', '安',
];

// 市井绰号（酒馆随机招募的老兵/斥候可用）
export const FOLK_NICKNAMES = [
  '独眼', '快手', '哑巴', '铁嘴', '豁牙', '大个子', '老实', '笑面',
];

// 随机侠客的称号池：按职业取，避免张冠李戴
export const TITLES_BY_CLASS: Record<ClassId, string[]> = {
  guardian: ['重盾护手', '守阵力士', '扛旗老卒'],
  warden: ['山道斥候', '探路快手', '识途老手'],
  paladin: ['长戟前锋', '持枪校尉', '破阵力士'],
  blademaster: ['单刀游侠', '百炼剑客', '快刀手'],
  arcanist: ['奇门策士', '行会账房', '阵盘先生'],
  ranger: ['山林弓手', '猎户神射', '追风箭手'],
  cleric: ['百草医官', '细针医手', '草药先生'],
  druid: ['匠门学徒', '修械匠人', '驯兽把式'],
  bard: ['游方乐师', '说书先生', '鼓书艺人'],
};

// 10 位主力预设侠客（5 男 5 女，江湖市井风）
export const HERO_PROFILES: HeroProfilePreset[] = [
  {
    name: '陈砚',
    title: '百炼剑客',
    gender: 'male',
    preferredClass: 'blademaster',
    bio: '石桥镇长大的游侠，背着一把自己攒钱在铸剑谷打的直剑，接单向来利落。',
  },
  {
    name: '石铁山',
    title: '重盾护卫',
    gender: 'male',
    preferredClass: 'guardian',
    bio: '原是望山堡边军出身，退役后靠一面包铁厚盾在行会护镖讨生活。',
  },
  {
    name: '许知微',
    title: '行会账房',
    gender: 'male',
    preferredClass: 'arcanist',
    bio: '落第书生，随身带铜制算盘与奇门阵盘，最擅长算清地形与敌人破绽。',
  },
  {
    name: '冯阿七',
    title: '老练斥候',
    gender: 'male',
    preferredClass: 'warden',
    bio: '江湖人称“快手阿七”，曾在风口岭跑过多年信差，走山路极熟，从不用火把。',
  },
  {
    name: '唐远',
    title: '山林弓手',
    gender: 'male',
    preferredClass: 'ranger',
    bio: '北松岭猎户之子，使一张山牛角反曲弓，三十步外箭无虚发。',
  },
  {
    name: '赵英',
    title: '长戟女将',
    gender: 'female',
    preferredClass: 'paladin',
    bio: '前朝边军将门之后，性子直爽，一杆点钢长枪常年顶在队伍最前头。',
  },
  {
    name: '徐阿秋',
    title: '单刀游侠',
    gender: 'female',
    preferredClass: 'blademaster',
    bio: '芦洲渡漕帮出身，一把柳叶单刀使得极快，最烦别人拖泥带水。',
  },
  {
    name: '许半夏',
    title: '百草医官',
    gender: 'female',
    preferredClass: 'cleric',
    bio: '汤泉镇百草堂弟子，背着药箱与细针匣走南闯北，专治各种皮外内伤。',
  },
  {
    name: '丁小锤',
    title: '匠门学徒',
    gender: 'female',
    preferredClass: 'druid',
    bio: '铸剑谷铁铺的小学徒，带着一管手铳和各种修甲工具出来历练长见识。',
  },
  {
    name: '林禾',
    title: '游方乐师',
    gender: 'female',
    preferredClass: 'bard',
    bio: '抱着桐木琴跑遍六合行会的姑娘，打起架来靠琴音替队友定神提气。',
  },
];

// 繁华城镇与安全据点（id 保持不变，兼容存档）
export const REGIONAL_HUBS = [
  { id: 'ambermill_town', name: '石桥镇', desc: '官道与漕河交汇的枢纽大镇，镇口一座三孔老石桥，六合行会总会与镖局都设在此处。' },
  { id: 'verdant_spring', name: '汤泉镇', desc: '群山环抱的天然温泉谷地，百草堂大夫在此行医晒药，疗伤与减压花销更省。' },
  { id: 'hammerdeep_hold', name: '铸剑谷', desc: '两崖之间的冶铁深谷，山涧水车日夜带动大铁锤，天工匠门老师傅坐镇于此。' },
  { id: 'tidesong_haven', name: '芦洲渡', desc: '大江入海前的千亩芦苇渡口，盐船与海商楼船云集，能买到海外图谱与桐油。' },
  { id: 'wangshan_fort', name: '望山堡', desc: '北境关山的军商重堡，边军与行会在此换防补给（远期开放）。' },
];

// 多元生态探索场景（id 保持不变）
export const EXPLORATION_ZONES = [
  { id: 'orchard_slime_grove', name: '塌方老矿·渗水巷道', type: 'subterranean_cavern', desc: '二十年前暴雨封井后积水的旧巷道，成群胶妖顺着通风口爬上地面伤人。' },
  { id: 'spider_aqueduct', name: '旧驿道断桥', type: 'labyrinth', desc: '石桥镇外坍了半边的旧驿桥，桥洞与苇丛里藏着截道的散兵与野物。' },
  { id: 'goblin_red_mine', name: '塌方老矿·北坡矿坑', type: 'goblin_cave', desc: '尖耳山魈霸占的旧矿坑，拿着矿工留下的铁镐与木盾四处劫掠运煤车。' },
  { id: 'mimic_mist_forest', name: '西关旧垒·前朝兵库', type: 'frontier_fort', desc: '三十年前撤防留下的空边关，军械箱里混着伪装成箱笼的箱魅。' },
  { id: 'thunder_wyvern_cliff', name: '北松岭', type: 'beast_den', desc: '北境松林与山脊，独眼头狼与巨角山牛在雪线边缘成群出没。' },
  { id: 'owlbear_hollow', name: '百草涧', type: 'beast_den', desc: '药谷深处的湿涧，毒斑巨蛙与厚皮枭熊盘踞在药农常走的采药径旁。' },
  { id: 'clockwork_arsenal', name: '千尺矿井', type: 'mine', desc: '铸剑谷最深的竖井，井壁还留着天工匠门改良水力锻锤前的旧凿痕。' },
];
