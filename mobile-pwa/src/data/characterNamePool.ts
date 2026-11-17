/**
 * 《星原战纪》角色、地名与生态场景数据池
 * 
 * 核心设计规范：
 * 1. 角色：东亚二次元风，男女参半，全员英姿飒爽、各具特色、兼备实战实力。
 * 2. 城镇与据点：有探索欲、生活气息与开阔史诗感，拒绝绝望压抑。
 * 3. 副本生态：哥布林矿洞、巨兽与龙巢、自然迷宫、当代/前朝关隘、校场试炼。
 * 4. 严禁任何“远古高等文明”、“失落科技遗物”、“青铜守卫”等伪断代设定，文明发展为严格线性。
 */

export interface CharacterProfile {
  name: string;
  title: string;
  gender: 'male' | 'female';
  role: string;
  weapon: string;
  tagline: string;
}

// 男女参半的主力冒险者名录 (10人核心矩阵)
export const HERO_PROFILES: CharacterProfile[] = [
  // 🚹 男性主力角色 (5人)
  {
    name: '沈云舒',
    title: '惊鸿剑',
    gender: 'male',
    role: '轻装直剑士 / 疾风剑客',
    weapon: '三尺青锋直剑',
    tagline: '出剑如穿林惊鸿，既有剑客的洒脱，也有战阵的精准。'
  },
  {
    name: '陆曜',
    title: '玄武之盾',
    gender: 'male',
    role: '重装壁垒 / 守护中坚',
    weapon: '精钢方棱重盾 & 破甲钢锏',
    tagline: '站在全队最前沿的沉稳兄长，擅长防守与营地热汤烹饪。'
  },
  {
    name: '裴少陵',
    title: '观星策士',
    gender: 'male',
    role: '战术指挥 / 奇门奇术使',
    weapon: '铜质二十八宿浑天手炉',
    tagline: '洞悉地脉与敌人破绽的军师，平日腹黑毒舌，战时极其护短。'
  },
  {
    name: '秦渊',
    title: '追影',
    gender: 'male',
    role: '斥候刺客 / 机关探陷专精',
    weapon: '玄铁双曲刃 & 飞爪锁绳',
    tagline: '行动迅捷如影的探路先锋，喜欢随身揣着松子糖。'
  },
  {
    name: '顾平川',
    title: '烈阳神射',
    gender: 'male',
    role: '远程狙杀 / 荒野猎手',
    weapon: '重型筋角反曲复合弓',
    tagline: '能在暴风雪中射穿靶心的猎户青年，阳光健朗，百发百中。'
  },

  // 🚺 女性主力角色 (5人)
  {
    name: '楚清弦',
    title: '破阵戟',
    gender: 'female',
    role: '重装前锋 / 战阵破垒核心',
    weapon: '六十斤方天重戟',
    tagline: '身披亮银鱼鳞锁甲的豪迈武将，横戟立马，力拔千钧。'
  },
  {
    name: '季秋水',
    title: '折月刀',
    gender: 'female',
    role: '双手横刀 / 居合拔刀术',
    weapon: '精锻霜纹唐横刀',
    tagline: '黑长直束发、眼神清澈坚毅的顶尖刀客，一刀断甲，迅疾如电。'
  },
  {
    name: '温竹君',
    title: '悬壶金针',
    gender: 'female',
    role: '战地医官 / 金针气脉武师',
    weapon: '沉香木金针囊 & 护身缠手',
    tagline: '青衫利落的神医，一手金针起死回生，近身短打亦能力碎坚石。'
  },
  {
    name: '白苏',
    title: '千机火器师',
    gender: 'female',
    role: '重型破甲 / 工巧破城大师',
    weapon: '自制三管折叠重火铳',
    tagline: '戴着单边黄铜护目镜的天才工坊少女，沉迷火药与机械改造。'
  },
  {
    name: '墨微凉',
    title: '影缚使',
    gender: 'female',
    role: '游击控制 / 处决暗卫',
    weapon: '符印淬火黑钢锁链',
    tagline: '身法神出鬼没的锁链高手，眼神锐利冷静，外冷内热。'
  }
];

// 繁华城邦与安全据点 (日漫奇幻生活风四大城镇，依山傍水、充满烟火气与地方特产)
export const REGIONAL_HUBS = [
  { id: 'ambermill_town', name: '麦浪与风车镇', desc: '金黄麦田与风车掩映的平原城集，麦芽酒与黑麦烤面包香气四溢，新手冒险者的启程地。' },
  { id: 'verdant_spring', name: '翡翠泉与铃兰宿', desc: '暖雾蒸腾的山谷温泉宿坊，草药架排布整齐，以泉水疗伤养神与静心修养闻名。' },
  { id: 'hammerdeep_hold', name: '黑铁与汽锤堡', desc: '依山开凿的蒸汽锻炉重镇，高炉烟囱昼夜不息，精钢锻甲与机巧工坊的圣地。' },
  { id: 'tidesong_haven', name: '潮鸣与灯塔港', desc: '石砌滨海灯塔港口，咸湿海风与海珍烧烤交织，远洋船队与深海奇兽赏金集散地。' }
];

// 多元生态探索场景 (无任何远古科技，均为自然地貌、魔物生态与前朝工坊遗存)
export const EXPLORATION_ZONES = [
  { id: 'orchard_slime_grove', name: '暖阳果园与水渠', type: 'beast_den', desc: '甜汁浆果丰茂的农庄外围，常有偷吃果实的跳跳草莓史莱姆群落出没。' },
  { id: 'spider_aqueduct', name: '旧水井阴冷暗渠', type: 'subterranean_cavern', desc: '湿润滴水的镇郊老砖石水渠，盘踞着结网捕食的巨型捕鸟蛛。' },
  { id: 'goblin_red_mine', name: '赤耳哥布林矿洞', type: 'goblin_cave', desc: '停产的铜矿深处被狡诈哥布林侵占，布满捕兽夹与暗弩。' },
  { id: 'mimic_mist_forest', name: '青苔古树与假箱林', type: 'labyrinth', desc: '常年弥漫湿气的厚密针叶林，传闻有伪装成旅行宝箱的拟态怪潜伏。' },
  { id: 'thunder_wyvern_cliff', name: '雷鸣断崖翼手巢', type: 'dragon_roost', desc: '陡峭万仞的海崖岩缝，凶暴双足飞龙捕食过往海兽的巢穴。' },
  { id: 'owlbear_hollow', name: '黑松针叶林熊洞', type: 'beast_den', desc: '粗壮松木盘根错节的山坳，厚绒皮毛的狂躁成年穴居公枭熊盘踞其中。' },
  { id: 'clockwork_arsenal', name: '沉陷边关旧武库', type: 'frontier_fort', desc: '三十年前边塞战役的地下工事，依然有上足发条自主巡视的铁甲重装步兵。' }
];
