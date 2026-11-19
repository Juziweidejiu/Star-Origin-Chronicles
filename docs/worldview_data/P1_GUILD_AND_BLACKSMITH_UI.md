# P1 `guildEngine.ts` 战术提示与 `BlacksmithView.tsx` 界面文案替换

> 对齐《百炼行》世界观与 v2 命名铁律（零颜色字、零冷热词、无网文腔）。

## 1. `guildEngine.ts` · 悬赏战术提示（`generateTacticTip`）

```
import type { ContractType } from '../types/world';

const TACTIC_TIPS: Record<ContractType, string[]> = {
  // 塌方老矿 · 井下胶妖
  slime_infestation: [
    '井下胶妖软韧抗劈砍，普通刀剑砍上去容易卸力，建议带上阵法或火器手从旁破防。',
    '老矿积水多、胶妖会缠住前排脚踝，前锋记得在营地抹好桐油，避免护甲吃瘪。',
  ],
  // 塌方老矿 · 尖耳山魈
  goblin_mine: [
    '矿坑山魈爱举木盾抱团，还带投石手躲在后排砸人，让游侠先点掉后排投石手最稳。',
    '山魈敲锣会引来矿道深处的帮手，前排尽量快刀压住阵脚，别拖太久。',
  ],
  // 风口岭 · 山贼营寨
  bandit_camp: [
    '风口岭山贼懂阵型，寨门盾手死扛正面，后排火铳和弩手专点脆皮，阵型别把医官放太靠前。',
    '山贼放出的铁背山猪冲撞很猛，前锋站稳盾墙抗住第一波，再集火拆掉对面的输出手。',
  ],
  // 三岔口 / 沉船湾 · 官道护镖与水匪
  caravan_escort: [
    '官道劫匪和苇丛水匪最爱绕后偷袭，中排最好摆一个能兼顾保护的剑客或长枪手。',
    '水区泥龟硬壳难啃，别把主力输出全耗在前排龟壳上，找机会用高穿透兵刃开缝。',
  ],
  // 百草涧 / 北松岭 · 山林异兽
  beast_hunt: [
    '毒斑巨蛙喷的瘴雾会持续掉血，进百草涧务必带上百草堂医官清创止毒。',
    '北松岭头狼和山牛皮糙肉厚、扑咬狠，出门前多备点磨刀石，把暴击与穿透拉起来再打。',
  ],
  // 西关旧垒 · 前朝旧关与机关
  ruins_cleansing: [
    '发条木甲卫和箱魅甲片极厚，建议给主力换上带“三棱透甲”或“重脊压锋”开光的兵器。',
    '旧垒深处独眼巨汉单下劈砍极疼，千万别带轻伤硬撑，伤重了先去汤泉镇泡汤养好再来。',
  ],
};

export function generateTacticTip(contractType: ContractType, seed = 0): string {
  const pool = TACTIC_TIPS[contractType] ?? TACTIC_TIPS.caravan_escort;
  return pool[Math.abs(seed) % pool.length];
}

```

## 2. `BlacksmithView.tsx` & `craftEngine.ts` · 九阴式界面文案对照表

### 一、页签与核心概念词替换

| 原界面文案 | 替换为（《百炼行》九阴武侠风） | 所在位置 | 
| ----- | ----- | ----- | 
| 打造 / 锻造台 | **开炉打造** | 页签与主标题 | 
| 重铸（`reforge`） | **回炉精淬** | 页签与按钮 | 
| 洗练（`reroll`） | **重洗开光** | 页签与按钮 | 
| 分解（`salvage`） | **拆解回料** | 页签与按钮 | 
| `重铸·精钢长剑` | **`精淬·百炼直剑`** | 装备名称前缀（`craftEngine.ts`） | 
| 词条 / 词缀（Affix） | **开光批注** | 装备详情与洗练面板 | 
| 1/2/3/4 条词条 | **开光一重 / 二重 / 三重 / 四重圆满** | 成品弹层与列表副标题 | 
| 星陨砂 | **砺石磨刀砂** | 洗练锁定费用行 | 
| 锻造晶石 / 玄铁锭 | **精煤 / 精钢锭**（或沿用材料名） | 顶部材料栏 | 

### 二、打造与洗练交互提示文案（可直接替换）

* **老板代打按钮说明**：

  `请老师傅代打（1.6 倍工钱）：出制式好兵，品质稳在 1.00–1.06，不带个人落款，不涨匠艺熟练度。`

* **自己动手锻造说明**：

  `亲自掌锤打造：火候、落锤、淬火三关合一，品质 ≥ 1.10 可在兵刃上刻下自己的落款！`

* **铸剑谷专属折扣提示**：

  `天工匠门地界 · 铸剑谷内打造、精淬、重洗开光工钱一律九折再减半（-15%）。`

* **洗练锁定提示（未锁 vs 已锁）**：

  * 未锁：`点选下方任意一条开光批注，可耗 1 份砺石磨刀砂将其定锋锁住`

  * 已锁：`已定锋锁住 1 条批注（消耗：砺石磨刀砂 ×1），其余开光重洗`

* **手打落款拼装逻辑（`craftEngine.ts` 示例）**：

```
// 自己手动打造且品质 >= 1.10 时，自动附上打造者落款
export function formatCraftedWeaponName(
  baseName: string,
  quality: number,
  crafterName?: string,
  reforged?: boolean,
): string {
  const prefix = reforged ? '精淬·' : '';
  const sign = quality >= 1.1 && crafterName ? `（${crafterName}·铸）` : '';
  return `${prefix}${baseName}${sign}`;
}

// 开光重数文案映射
export function getKaiguangLabel(affixCount: number): string {
  switch (affixCount) {
    case 0:
      return '凡铁（未开光）';
    case 1:
      return '精工 · 开光一重';
    case 2:
      return '宝兵 · 开光二重';
    case 3:
      return '名器 · 开光三重';
    default:
      return '神兵 · 开光四重圆满';
  }
}

```