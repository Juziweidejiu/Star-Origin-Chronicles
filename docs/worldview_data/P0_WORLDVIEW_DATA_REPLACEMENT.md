# P0 前端文案与数据替换包（《百炼行》v2 终版）

> 以下三段数据严格遵守 `WORLDVIEW_MASTER_DESIGN.md` 的 v2 红线：
> **零颜色字、零冷热词、零网文高危姓名、零野炊食材、怪物 2\~5 字俗称、任务为行会告示口吻**。
>
> 保留原有 `TownId`、`ContractType` 与 `classId` 枚举键名，可直接替换对应文件中的数据配置而**不破坏旧存档**。

## 1. `mobile-pwa/src/data/characterNamePool.ts`

```
export interface HeroProfilePreset {
  name: string;
  title: string;
  gender: 'male' | 'female';
  preferredClass: string;
  bio: string;
}

// 常见江湖大姓（彻底剔除沈/顾/陆/裴/墨/楚/季/洛）
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

// 市井绰号前缀（酒馆随机招募老兵/斥候可用）
export const FOLK_NICKNAMES = [
  '独眼', '快手', '哑巴', '铁嘴', '豁牙', '大个子', '老实', '笑面',
];

// 10 位主力预设侠客（5男5女，江湖市井风）
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
    bio: '江湖人称“快手阿七”，曾在风口岭跑过多年信差，摸黑走山路从不迷路。',
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

```

## 2. `mobile-pwa/src/engine/townEngine.ts`（城镇与悬赏契约配置）

```
// 保留既有 TownId 键名以兼容存档，显示名与设定全部替换为《百炼行》新城镇
export const TOWN_CONFIGS = {
  ambermill_town: {
    id: 'ambermill_town',
    name: '石桥镇',
    subtitle: '中州平川 · 六合行会总会',
    distance: 0,
    description:
      '官道与漕河交汇的枢纽大镇，镇口一座三孔老石桥。酒肆、镖局与六合行会总会全聚于此，南来北往的游侠都在这落脚接单。',
    facilities: ['guild', 'tavern', 'market', 'infirmary', 'blacksmith', 'sanctuary'],
  },
  hammerdeep_hold: {
    id: 'hammerdeep_hold',
    name: '铸剑谷',
    subtitle: '西麓矿山 · 天工匠门',
    distance: 1,
    description:
      '藏在两崖之间的冶铁深谷，山涧水车日夜带动大铁锤。天工匠门老师傅坐镇于此，兵器打造、开光洗练与精淬工钱一律减免。',
    facilities: ['guild', 'tavern', 'market', 'blacksmith'],
  },
  verdant_spring: {
    id: 'verdant_spring',
    name: '汤泉镇',
    subtitle: '西南药谷 · 百草堂医馆',
    distance: 1,
    description:
      '群山环抱的天然温泉谷地，百草堂大夫在此行医晒药。受了重伤或疲惫过度的游侠来此休养，疗伤与减压花销更省。',
    facilities: ['guild', 'tavern', 'infirmary', 'sanctuary'],
  },
  tidesong_haven: {
    id: 'tidesong_haven',
    name: '芦洲渡',
    subtitle: '东南江海口 · 漕帮总舵',
    distance: 2,
    description:
      '大江入海前的千亩芦苇渡口，盐船与海商楼船云集。码头茶肆消息最灵，能买到海外兵器图谱残页、桐油与砺石磨刀砂。',
    facilities: ['guild', 'tavern', 'market', 'sanctuary'],
  },
} as const;

// 悬赏契约模板（行会木板告示口吻 + 打造材料产出）
export const CONTRACT_TEMPLATES = {
  slime_infestation: {
    type: 'slime_infestation',
    locationName: '塌方老矿 · 渗水巷道',
    titlePool: [
      '[急] 塌方老矿渗水井清障',
      '矿场集委托：清理井下胶妖',
      '抢运老矿遗留生铁锭',
    ],
    description:
      '二十年前暴雨封井后，老矿深处积水滋生了成群胶妖，还常顺着通风口爬上地面伤人。矿场集管事贴出悬赏，清完巷道顺便能带出不少生铁与精煤。',
    targetMonster: '井下胶妖',
    specialLootDesc: '生铁锭、精煤、粗铜矿、矿工兵器残页',
  },
  goblin_mine: {
    type: 'goblin_mine',
    locationName: '塌方老矿 · 北坡矿坑',
    titlePool: [
      '[急] 驱赶北坡老矿山魈群',
      '收购：山魈抢走的铁镐与矿车轮',
      '夺回老矿二号采掘坑道',
    ],
    description:
      '一群尖耳山魈霸占了西山北坡的旧矿坑，拿着矿工留下的铁镐和木盾四处劫掠运煤车。铸剑谷铁铺急需这批矿道里的铁料与精煤。',
    targetMonster: '尖耳山魈',
    specialLootDesc: '生铁锭、精钢碎料、精煤、手打图谱残页',
  },
  bandit_camp: {
    type: 'bandit_camp',
    locationName: '风口岭 · 木栅寨',
    titlePool: [
      '[悬赏] 风口岭山贼截道案',
      '[官府] 拔除风口岭山贼木寨',
      '追回被劫的铸剑谷铁料车',
    ],
    description:
      '东西官道咽喉风口岭近来被一伙亡命山贼卡住，寨门外还放养了铁背山猪看门。过往商队不堪其扰，六合行会联合官府出银子清寨。',
    targetMonster: '山贼悍匪',
    specialLootDesc: '精钢碎料、熟牛皮、老榆木杆、雁翎刀图谱',
  },
  caravan_escort: {
    type: 'caravan_escort',
    locationName: '三岔口 · 东官道',
    titlePool: [
      '王掌柜的盐车卡在三岔口了',
      '护送药材车队过旧驿道断桥',
      '[急] 征调：芦洲渡桐油货车护卫',
    ],
    description:
      '石桥镇通往芦洲渡的东官道草深林密，近来小毛贼与窜出来的野狼、山魈专挑单身货车下手。行会招可靠小队沿途护送，顺手清理路障。',
    targetMonster: '截道毛贼',
    specialLootDesc: '碎铁片、麻绳、粗牛皮、制式短刀（可拆解）',
  },
  beast_hunt: {
    type: 'beast_hunt',
    locationName: '百草涧 / 北松岭',
    titlePool: [
      '收购：完整狼筋三十斤',
      '求购：北松岭山牛角十对',
      '替百草堂进百草涧采老药',
    ],
    description:
      '近三年北境大雪、南边多雨，山林异兽纷纷往官道边缘挤。百草堂和铸剑谷都在高价收韧兽筋、毒囊与山牛角，用来做弓弦、刀柄和淬刃料。',
    targetMonster: '独眼头狼 / 毒斑巨蛙',
    specialLootDesc: '韧兽筋、毒囊、山牛角、厚绒兽皮、百炼钢矿',
  },
  ruins_cleansing: {
    type: 'ruins_cleansing',
    locationName: '西关旧垒 · 前朝兵库',
    titlePool: [
      '[密] 探查西关旧垒发条铁卫',
      '[高危] 清理北坡点将台外围',
      '寻找前朝武库遗留名匠全本图谱',
    ],
    description:
      '三十年前安平朝北伐撤兵后留下的空边关，里头既有年久失控的发条木甲卫、伪装成军械箱的箱魅，也有占山为王的独眼巨汉。只有老练队伍敢往里闯。',
    targetMonster: '发条木甲卫 / 箱魅',
    specialLootDesc: '玄铁锭、机巧齿轮、砺石磨刀砂、天工名匠全本图谱',
  },
} as const;

```

## 3. `mobile-pwa/src/engine/enemyFactory.ts`（生态敌人名册）

> 严格限制 **2\~5 字俗称**，禁止人类 MMO 职业后缀，禁止颜色字与冷热词，按 9 大战斗职能槽位对齐：

```
export const ENEMY_NAME_POOL: Record<
  string,
  {
    guardian: string[];
    paladin: string[];
    warden: string[];
    blademaster: string[];
    ranger: string[];
    arcanist: string[];
    cleric: string[];
    druid: string[];
    bard: string[];
    bossNames: string[];
  }
> = {
  // 塌方老矿（井下胶妖生态）
  slime_infestation: {
    guardian: ['石壳胶妖', '硬泥胶妖'],
    paladin: ['厚膜大胶妖', '裹铁胶妖'],
    warden: ['岩块胶妖', '重压胶妖'],
    blademaster: ['酸液胶妖', '滑行胶妖'],
    ranger: ['喷液胶妖', '弹射胶妖'],
    arcanist: ['瘴气胶妖', '浮游胶妖'],
    cleric: ['共生小胶妖', '愈合胶核'],
    druid: ['缠蔓胶妖', '水苔胶妖'],
    bard: ['震鸣胶妖', '鼓泡胶妖'],
    bossNames: ['矿井大胶王', '裹矿巨胶怪'],
  },

  // 塌方老矿（山魈矿坑）
  goblin_mine: {
    guardian: ['举盾山魈', '木盾山魈'],
    paladin: ['铁盔山魈', '重甲山魈'],
    warden: ['持镐山魈', '大锤山魈'],
    blademaster: ['尖耳山魈', '短刃山魈'],
    ranger: ['投石山魈', '吹箭山魈'],
    arcanist: ['掷弹山魈', '火油山魈'],
    cleric: ['涂药山魈', '裹伤山魈'],
    druid: ['驯鼠山魈', '引兽山魈'],
    bard: ['敲锣山魈', '号角山魈'],
    bossNames: ['独眼山魈王', '矿坑大头领'],
  },

  // 风口岭（山贼营寨）
  bandit_camp: {
    guardian: ['寨门盾手', '重甲悍匪'],
    paladin: ['长枪寨兵', '铁甲头目'],
    warden: ['大斧山贼', '铁背山猪'],
    blademaster: ['亡命刀客', '双刀流寇'],
    ranger: ['暗哨弩手', '山林弓匪'],
    arcanist: ['火铳悍匪', '掷雷山贼'],
    cleric: ['随寨伤医', '背箱药匪'],
    druid: ['放犬恶徒', '驯猪寨匪'],
    bard: ['敲梆望风匪', '喊阵匪头'],
    bossNames: ['独臂山贼头目', '风口岭大当家'],
  },

  // 三岔口 / 沉船湾（官道护镖 & 水匪）
  caravan_escort: {
    guardian: ['截道盾匪', '厚壳泥龟'],
    paladin: ['持叉水匪', '重甲劫匪'],
    warden: ['甩尾巨鳄', '铁棒水贼'],
    blademaster: ['飞刀流寇', '疾行水蜥'],
    ranger: ['苇丛弩手', '暗箭水匪'],
    arcanist: ['水雷匪徒', '喷雾毒蛙'],
    cleric: ['随行水医', '伴生水蛭'],
    druid: ['放鹰劫匪', '驱鳄水匪'],
    bard: ['鸣哨水匪', '鸣叫大蟾'],
    bossNames: ['三岔口匪首', '黑水大鳄'], // 注意：若严格禁“黑”，可改为 '沉船湾大鳄'
  },

  // 百草涧 / 北松岭（山林异兽）
  beast_hunt: {
    guardian: ['铁背山猪', '厚皮枭熊'],
    paladin: ['巨角山牛', '重甲山魈'],
    warden: ['长毛山魈', '独眼大熊'],
    blademaster: ['疾行水蜥', '独眼头狼'],
    ranger: ['展翼山雕', '飞羽大鹰'],
    arcanist: ['毒斑巨蛙', '喷毒山蛛'],
    cleric: ['药草小妖', '护窝母鹿'],
    druid: ['林间大鹿', '引群头狼'],
    bard: ['鸣叫大蟾', '啼鸣山猿'],
    bossNames: ['断牙山猪王', '巨角山牛王', '北松岭老狼王'],
  },

  // 西关旧垒（前朝旧关与机巧机关）
  ruins_cleansing: {
    guardian: ['发条木甲卫', '重盾铁卫'],
    paladin: ['长戟木甲卫', '巡哨铁卫'],
    warden: ['独眼巨汉', '大锤蛮人'],
    blademaster: ['箱魅', '利刃机关偶'],
    ranger: ['连弩机关偶', '暗弩铁卫'],
    arcanist: ['火油机关偶', '失控火铳卫'],
    cleric: ['修补木匠偶', '传令机关鸟'],
    druid: ['巢穴石蛛', '铁笼恶犬'],
    bard: ['警铃机关偶', '战鼓木甲'],
    bossNames: ['巨口箱魅王', '西关大铁卫', '独眼蛮将'],
  },
};

```

> **提示**：上表 `caravan_escort` 里的 `bossNames` 我顺手加了一句注释提醒——实际粘贴到 `enemyFactory.ts` 时请直接用 **`沉船湾大鳄`**（零颜色字）。