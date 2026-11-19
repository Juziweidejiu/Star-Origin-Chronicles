# 换名数值对照说明

> 本轮世界观重构（M41）的硬原则：**只换显示名，不动任何数值、字段名、id、随机区间与品质公式。**
> 本文留档"旧名 → 新名"的对应关系，供后续调数值时对照；任何数值调整都要单独提交并附 `scripts/sim_balance.mjs` 结果。

## 1. 材料（`MATERIALS`，id 不变）

| id | 旧名 | 新名 | 现有数值/用途（未改） |
| --- | --- | --- | --- |
| iron | 精铁锭 | 生铁锭 | base，刀剑与重甲骨架 |
| wood | 老杉木 | 老榆木 | base，杖身、弓臂与木甲 |
| leather | 硝制兽皮 | 熟牛皮 | base，轻甲与缠柄 |
| jade | 珠玉 | 璞玉料 | base，饰品的灵性来源 |
| coal | 精煤 | 精煤 | fuel，每份拓宽火候容错 |
| oil | 淬火油 | 桐油 | quench，起步品质抬到 0.98 |
| sand | 星陨砂 | 砺石磨刀砂 | quench，额外一条开光批注 |

## 2. 图谱（`Blueprint`，id 与 `templateIndex` 不变，`cost` 全部保留现值）

| id | 旧名 | 新名 | 部位 / tier |
| --- | --- | --- | --- |
| bp_steel_sword | 精钢长剑 | 百炼直剑 | weapon / T2 |
| bp_breach_halberd | 破阵大戟 | 破阵大戟 | weapon / T3 |
| bp_wood_staff | 青木法杖 | 药杵木杖 | weapon / T2 |
| bp_short_bow | 精铁短弓 | 山牛角短弓 | weapon / T2 |
| bp_chainmail | 锁子甲 | 连环锁甲 | armor / T2 |
| bp_heavy_plate | 坚木重铠 | 水龟甲重铠 | armor / T4 |
| bp_weave_robe | 编织法袍 | 麻布道袍 | armor / T3 |
| bp_ranger_leather | 巡林皮甲 | 斥候软皮甲 | armor / T1 |
| bp_wolf_pendant | 狼牙吊坠 | 狼牙护腕 | trinket / T3 |
| bp_jade_pendant | 翡翠玉佩 | 雕龙玉佩 | trinket / T4 |
| bp_star_ring | 星辉指环 | 天工扳指 | trinket / T4 |
| bp_bronze_amulet | 青铜护符 | 六合铜牌 | trinket / T1 |

> 注意：图谱名由 `EQUIPMENT_TEMPLATES`（`src/engine/dungeonEngine.ts`）派生，改名必须改模板，否则图纸会对不上装备。
> 包内给了另一套材料消耗数值（如直剑 iron 6 + wood 2），本轮**未采纳**。

## 3. 开光批注（`CRAFT_AFFIX_POOL`，stat / kind / min / max / grade 全部未动）

### weapon（顺序＝现有池顺序）
| 旧名 | 新名 | stat |
| --- | --- | --- |
| 锋锐 | 百炼锻实 | ad % |
| 穿云 | 三棱透甲 | penetration flat |
| 疾风 | 轻柄配重 | attackSpeed % |
| 狂澜 | 血槽开锋 | critChance |
| 裂甲 | 重脊压锋 | critDamage |
| 守夜 | 包铁护手 | tenacity |
| 断岳 | 熟铁包刃 | ad flat |
| 汲魂 | 加厚柄芯 | maxHp % |

### armor
| 旧名 | 新名 | stat |
| --- | --- | --- |
| 磐石 | 双层夹铁 | armor flat |
| 静水 | 密缝防潮 | magicResist flat |
| 铁壁 | 厚背护心 | maxHp % |
| 不移 | 稳固护肘 | tenacity |
| 龟息 | 鱼胶粘合 | maxHp flat |
| 定神 | 夹层衬绢 | magicResist % |
| 灵便 | 活扣束腰 | attackSpeed % |
| 磐岳 | 熟牛皮垫肩 | armor % |

### trinket
| 旧名 | 新名 | stat |
| --- | --- | --- |
| 通灵 | 养神玉扣 | ap flat |
| 灼心 | 破甲棱 | critDamage |
| 慈航 | 定心雕纹 | healingPower |
| 鹰眼 | 薄刃开尖 | critChance |
| 疾行 | 合手缠绳 | attackSpeed % |
| 长息 | 固本铜环 | maxHp % |
| 洞明 | 井水淬尖 | penetration |
| 净心 | 缠丝护腕 | tenacity |

## 4. 品阶与命名

- 品阶文案由 `getKaiguangLabel(affixCount)` 生成：0＝凡铁、1＝精工·开光一重、2＝宝兵·开光二重、3＝名器·开光三重、≥4＝神兵·开光四重圆满。
- 打造结算名：`品阶·图纸名`；自打品质 ≥1.10 追加 `（匠人名·铸）`；回炉精淬前缀 `精淬·`。
- 旧存档里已带 `重铸·` 的装备统一显示为 `精淬·`（只改显示，`reforged` 标记与 +18% 不变）。

## 5. 参考：包内建议数值（**未启用**，仅备查）

- 图纸材料消耗、开光批注数值、品质保底区间在 `docs/worldview_data/P1_BLUEPRINT_DATA_REPLACEMENT.md` 与 `WUXIA_WEAPON_AND_CRAFTING_SYSTEM.md` 中有另一套。
- 若后续要切到那套数值：先跑 `node scripts/sim_balance.mjs` 对比曲线，再更新本文件与 `TODO.md` 的平衡目标。
