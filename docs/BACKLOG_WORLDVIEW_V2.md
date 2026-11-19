# 世界观重构二期计划（本轮只记录，不开发）

> 本文件对应 M41 换皮完成后的待办。每条都写清"为什么先不做"与"真要做时动哪里"，避免下次接手的人重新摸一遍。

## 1. 营地整备：从「生火做饭」改为「磨刀拭甲」

**现状**：`DungeonView` 营地房为三选一吃食（热汤/炙肉/清茶），消耗全队干粮，给 `healBonusPercent / adBonusPercent / armorBonusPercent`。

**目标**（包 `P1_P2_CAMP_AND_NARRATIVE_DATA.md`）：

| id | 名称 | 消耗 | 效果 |
| --- | --- | --- | --- |
| sharpen_blade | 开锋磨刃 | 磨刀石 / 砺石磨刀砂 | 暴击 +8%、穿透 +6、压力 -8、回血 18% |
| oil_armor | 桐油拭甲 | 桐油 | 护甲 +10、压力 -10、回血 25% |
| tune_string | 校弦缠柄 | 韧兽筋 / 麻绳 | 攻速 +10%、压力 -16、回血 20% |

每条还带 `campBarkPool` 台词（陈砚/徐阿秋/独眼老冯/石铁山/赵英/许半夏/唐远/丁小锤/林禾）。

**为什么先不做**：这不是换皮，要改 `dungeonEngine.onCampRest` 的签名、`DungeonView` 的 `MEALS`、Buff 类型（新增 `stressDelta` 与 `critChanceBonus` 等），还要重新平衡干粮 vs 材料的消耗节奏。

**动手时改**：`types/narrative.ts`（新增 `CampWeaponPrepOption`）→ `engine/dungeonEngine.ts`（结算）→ `components/DungeonView.tsx`（选项 UI）→ 补单测。

## 2. 第五城：望山堡

**现状**：`TownId` 只有 4 个值，`TownEngine` 构造器里写死 4 城字典。

**目标**：`wangshan_fort`（北境关山·军商重堡），解锁条件建议绑主线进度或声望，城内卖高阶图谱残页与精钢锭。

**为什么先不做**：要扩 `TownId` 联合类型、四张字典（towns / contracts / tavernRecruits / 行军距离）、`docs/SAVE_MIGRATION.md` 登记、TownView 布局校验（多一个城不能溢出）。

**注意**：`characterNamePool.ts` 的 `REGIONAL_HUBS` 已预留望山堡条目（标注"远期开放"），仅作图鉴展示。

## 3. 九个职业显示名

**现状**：`CLASS_CONFIG` 仍是 护卫 / 守望者 / 圣武士 / 剑圣 / 奥术师 / 游侠 / 牧师 / 德鲁伊 / 乐师（西幻混搭）。

**已做的准备**：英雄称号已按职业武侠化（重盾护卫 / 山道斥候 / 长戟前锋 / 百炼剑客 / 行会账房 / 山林弓手 / 百草医官 / 匠门学徒 / 游方乐师），`TITLES_BY_CLASS` 与 `HERO_PROFILES.preferredClass` 接口已就绪。

**为什么先不做**：等世界观那边给出正式职业名，避免二次返工。落地时只改 `CLASS_CONFIG[classId].name`，但会牵动 `CLASS_CONFIG` 在 `statResolver` / `DungeonView` / `RosterView` 的展示，需回归截图。

**候选**（待定，勿直接使用）：重盾卫 / 游哨 / 持戟卫 / 剑客 / 术算 / 弓手 / 医官 / 匠师 / 乐师。

## 4. 契约区域化

**现状**：每个城镇都从 6 类契约里随机抽，不区分地理。契约卡 `targetMonster` 会带地点名（如「井下胶妖（塌方老矿·渗水巷道）」），按"行会跨区发榜"解释。

**目标**：按 `WORLD_MAP_V3.md` 绑定区域（石桥镇＝三岔口/旧驿道断桥，铸剑谷＝塌方老矿/风口岭/千尺矿井，汤泉镇＝百草涧/雾林药坡，芦洲渡＝沉船湾/芦苇水寨/礁石岛，望山堡＝北松岭/西关旧垒/北坡点将台），并让难度随区域递进。

**为什么先不做**：会改变契约池分布与难度曲线，属于玩法+数值改动，需要和 `sim_balance.mjs` 一起做。

## 5. 旧存档

用户决定：**旧存档可忽略甚至删除，本轮不写迁移代码**。`SAVE_VERSION` 保持 1；旧档里的旧姓名原样加载，不影响功能；新招募走新姓名池。

若日后要清理，方案是按"同职业同性别"映射新姓名池，并幂等改写 `重铸·` → `精淬·`。
