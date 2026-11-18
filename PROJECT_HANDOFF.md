# 《星原战纪》（Chronicles of Starfall）项目交接与开发设计全景文档

> **创建日期**: 2026-11-16  
> **最新更新**: 2026-11-17  
> **文档定位**: 专为多轮会话切换、Agent 任务接力、技术方案追溯而建立的权威工程上下文与开发白皮书。

---

## 1. 项目愿景与设计哲学

### 1.1 核心玩法构想
本项目是将**《Dungeons & Dynasties》（地牢与门阀）**解构出的优秀战术与身心养成底层算法，与**《Battle Brothers》（战场兄弟）**的团队经营和**《龙与地下城》(D&D) / JRPG 探险史诗**深度融合的移动端 **PWA（渐进式 Web 应用）** 游戏。

- **四大核心基调**：
  - **探险 (Exploration)**：未知探索的好奇心，涵盖异族据点（哥布林）、飞龙与猛兽巢穴、天然地质晶石迷宫、前朝关隘武库与实战演武场。
  - **生存 (Survival)**：拒绝绝望泥潭自虐，转向《迷宫饭》式的野外露营、烹饪热汤野炊、修补兵刃的丰饶生活感。
  - **浪漫羁绊 (Camaraderie)**：东亚二次元风，男女参半，全员英姿飒爽、各有千秋、强劲实力，彼此信任、并肩作战。
  - **对抗危机 (Crisis)**：边境风云与魔物狂潮侵袭，自由探险团的抉择改变大陆格局。
- **【核心世界观铁律·严格线性历史】**：
  - **绝对不存在“远古高等文明”、“超古代遗迹”、“失落科技魔法”、“先史文明降级”**。
  - **严禁出现“青铜守卫”、“古代守卫傀儡”等科幻/非线性元素**。
  - 当代城邦的铁器锻造、火器火铳、奇门机关与地脉阵法，即为文明一步一个脚印演进的最高峰。
- **佣兵团沉浸感**：
  - **主角亲历前线**：玩家创建探险团长，亲自上阵拼杀。
  - **酒馆与公会循环**：在各城邦（霜月城、听风关、碧落行坞等）招揽英才，签署星级委托。
  - **软着陆死亡保护**：保留伤残与肢体创伤（可在医馆疗养），英雄阵亡后可在城镇圣所付出高额代价召回魂魄复活。

---

## 2. 部署与服务器基础设施档案 (来自 D:\life)

已完成对本地及远端部署环境的完整调查：

| 配置项 | 环境参数与规范 |
| :--- | :--- |
| **云端服务器** | 腾讯云轻量服务器（Lighthouse，上海，Ubuntu 24.04，Docker 29.6.1） |
| **服务器公网 IP** | `1.15.243.27` |
| **SSH 快捷登录** | `ssh sparky-server`（本机已配置密钥 `~/.ssh/id_ed25519`，用户 `ubuntu` 免密） |
| **公网域名与出口** | **Cloudflare Tunnel 出站隧道** 对外暴露为 `https://orange-fit.top` |
| **反向代理配置** | 前端通过 Docker Compose 内网 Nginx 代理，直接挂载静态文件或作为独立站点部署。 |
| **移动端分发形式** | **PWA（iOS 纯 Web 全屏应用）**。手机 Safari 访问域名后选择“添加到主屏幕”，免 App Store 审核，支持离线 LocalStorage 运算。 |

---

## 3. 已交付产物与工程状态

### 3.1 逆向工程与数据层
- **逆向白皮书**: `D:\reverseGame\DUNGEONS_AND_DYNASTIES_REVERSE_ENGINEERING_WHITEPAPER.md`（完整记录了 30 维属性、CA/PA 算式、111 种特质互斥矩阵、9 大职业基础属性、Gambit 规则、DDZ1 编解码器与防篡改签名校验算法）。
- **存档编解码工具**: `save_codec.js` 与 `save_tool.js`（支持双向无痕加解密、查改存档）。

### 3.2 移动端工程骨架 (Milestone 1)
- **工程目录**: `D:\reverseGame\mobile-pwa`（Vite + React 18 + TypeScript + Lucide Icons + PWA Manifest）。
- **已实现核心模块**:
  1. `src/types/hero.ts`: 严谨的英雄实体定义（CA/PA、30维属性、隐藏心理抗压属性、Gambit 战术规则）。
  2. `src/engine/heroFactory.ts`: 角色生成工厂（严格复刻原版职业修正比、HP 计算公式、随机特质与薪酬）。
  3. `src/engine/combatEngine.ts`: 战术推演战场（支持 Gambit 自动索敌集火、攻击间隔算法、伤害与治疗结算、生命值与终极技能能量循环）。
  4. `src/App.tsx`: 专门适配 **iPhone 竖屏** 的单手操作界面：
     - **大招托管/手动一键切换**：支持全员自动释放大招，也可随时切换为“手动点按释放大招”（能量满后屏幕卡片金光高亮并震动提示）。
     - **即时战斗日志流**：分类展示攻击、治疗、大招与死亡战况。
     - **三 Tab 导航架构**：🗡️ 地牢交战 / 👥 佣兵名册 / 🏰 城镇与公会。
- **构建状态**: 已通过严格 TypeScript 编译检查，`npm run build` 打包成功（生成 `dist/` 单页产物）。

---

## 4. 后续开发路线图（Roadmap & Milestones）

任何后续接入的 Agent 或开发者请按以下里程碑顺序继续推进：

### Milestone 2: 城邦据点循环与佣兵团运营系统 (已完成交付 ✅)
- [x] **大地图与据点节点 (Town Nodes)**:
  - 建立 4 个核心据点：霜月城（主城/北境商盟中枢）、听风关（峡谷关隘）、碧落行坞（水上行坞）、朱雀回廊（红枫圣所）。
  - 实现城邦好感度计量槽（冷淡 -> 中立 -> 友善 -> 崇拜），动态影响物价折扣与委托任务赏金倍率。
- [x] **酒馆招募 (Tavern)**:
  - 动态刷新待雇佣伙伴，支持迷雾星级查看潜力区间与身世背景，签订佣兵契约。
- [x] **冒险者公会契约 (Guild Contracts)**:
  - 随机生成 1~5 星委托（黑火盗贼团营寨、暗影林地巨兽、古代墓穴死者暴动等），完成获得金币、声望与稀有魂晶。
- [x] **圣所与医馆 (Sanctuary & Infirmary)**:
  - 伤残疗愈（支持快速包扎、清除严重创伤与缓解压力）。
  - **灵魂召回仪式（软着陆死亡保护）**：展示已阵亡队员魂魄，扣除魂晶与金币破界召回复活并附带还魂虚弱代偿。
- [x] **经济与后勤引擎 (Logistics Engine)**:
  - 行军与探险天数流逝，每日消耗口粮（Rations），每周结算队员周薪，欠薪与断粮触发士气打击与压力惩罚。
- [x] **移动端交互界面 (TownView)**:
  - 完整适配 iPhone 竖屏单手操作，集成据点转移弹窗、公会、酒馆、市集、医馆、圣所全功能交互。

### Milestone 3: 深度地牢生成与天灾大事件 (Crisis Engine)
- [x] **程序化地牢探索界面**:
  - 还原房间序列（战斗房、陷阱房、宝箱房、扎营休整房、Boss 首领房）。
  - 营地休息分工：医护管事（Tender 1.8x 疗愈）与警戒哨兵（Sentry 降压翻倍）。
  - 战后暗黑式装备掉落（白/绿/蓝/紫/橙随机词缀）。
- [x] **天灾事件系统 (Crisis)**:
  - 第一期天灾：**【星原异动 · 极夜狂暴兽潮】**（原「夜王复苏 · 亡灵狂潮」已于 Milestone 7 重构）。
  - 天灾倒计时与预警传闻，前线关隘受袭，主城发布大型战役委托（听风关守卫战、讨伐霜甲巨猿王）。
  - 天灾专属防线契约与决战兽王终局任务，击破即可逆转威胁度并解除受袭据点围困。

### Milestone 4: 服务器上线与 iPhone PWA 实装
- [x] 利用本地 SSH（`ssh sparky-server`）将 `mobile-pwa/dist` 部署至腾讯云上海服务器。
- [x] 在 Cloudflare Tunnel / Nginx 中配置二级子路径 `https://orange-fit.top/game/`。
- [x] 适配 iOS PWA Manifest、安全区域与独立全屏运行模式 (`standalone`)。
- [x] 公网连通性与静态资源透传验证完毕（HTTP 200，全套 JS/CSS/Manifest 正常运行）。
- [ ] 真机 Safari 测试，验证添加到 iPhone 主屏幕后的手感、离线存储与触控响应。

### Milestone 5: 去网文味暗黑叙事系统、生成管线与 Ink.js DSL 互动物语引擎 (已完成交付 ✅)
- [x] **暗黑低魔叙事数据层与质检拦截 (`mobile-pwa/src/types/narrative.ts`)**:
  - 严谨定义 `DungeonEvent`, `EventChoice`, `ChoiceRequirement`, `ChoiceConsequence`, `CampDialogue` 数据结构。
  - 建立包含 40+ 网文套路词、无谓血浆描写的负面词库 `PURPLE_PROSE_BLACKLIST`（严格拦截“瞳孔骤缩、血雾、脑浆、桀桀、倒吸一口凉气”等）。
  - 实现 `validateNarrativeQuality` 质量校验器，强制限制字数顶格与白描冷峻风格。
- [x] **金标样本库 (`mobile-pwa/src/data/mockNarratives.ts`)**:
  - 提供倾覆补给车、无脸神龛、坐化巡林客等高沉浸感暗黑抉择样本，以及基于性格与压力的 7 种营地短台词。
- [x] **AI 批量生成与自动化质检验收流水线 (`scripts/generate_narrative_pipeline.mjs`)**:
  - 构建符合叙事策划规范的结构化 Prompt，支持接入大模型 API，自动过滤网文词并产出 `generated_narratives.json`。
- [x] **前端暗黑地牢 / 战场兄弟风格 UI 组件**:
  - `DungeonEventModal.tsx`: 暗黑羊皮纸/黑铁质感事件模态框，支持队伍属性与职业检定及数值惩罚代偿。
  - `CampBarkBubble.tsx`: 营地冷峻短台词气泡，直观反映佣兵性格与压力变化。
  - `DungeonView.tsx`: 在扎营阶段直显角色台词，并提供探查深渊残迹的抉择交互。
- [x] **游戏剧本 DSL（Ink.js）引擎接入与物语运行器**:
  - 引入 `inkjs/full` 编译器与运行器，支持浏览器端即时编译与运行 Ink 分支文本。
  - 编写《古墓无头骑士的信物》与《绞架林与盲眼斥候》两个多分支、含内部状态变量（`squad_stress`, `gold_gained`, `morale` 等）的高质量剧本 (`src/data/sampleInkStories.ts`)。
  - 实现 `InkStoryRunner.tsx`，支持实时查看/在线修改 Ink 源码与即时编译。
  - `App.tsx` 扩展第 5 个 Tab「📜 物语」，将分支推进结果双向同步至当前小队与据点后勤。

### Milestone 6: 探险基调重构、东亚二次元男女平权人设与线性历史铁律 (已完成交付 ✅)
- [x] **游戏命名与世界观重塑**:
  - 正式将游戏升级为 **《星原战纪》（Chronicles of Starfall）**，剔除绝望与纯受虐压抑基调，确立**【探险、生存、浪漫、对抗危机】**四大核心支柱。
  - **核心铁律·禁远古高等文明**：彻底排除“远古超科技”、“失落神殿文明”、“青铜守卫傀儡”等降级科幻设定，确立严格线性的人类历史进程。
- [x] **东亚二次元男女参半·全员实力人设矩阵 (`mobile-pwa/src/data/characterNamePool.ts`)**:
  - 打造 5 男 5 女全员实力派人设：
    - 🚹 男：沈云舒（惊鸿剑）、陆曜（玄武之盾）、裴少陵（观星策士）、秦渊（追影）、顾平川（烈阳神射）。
    - 🚺 女：楚清弦（破阵戟）、季秋水（折月刀）、温竹君（悬壶金针）、白苏（千机火器师）、墨微凉（影缚使）。
  - 地理据点（霜月城、听风关、碧落行坞、朱雀回廊）与五大多元生态场景（哥布林矿洞、雷鸣飞龙崖、雪猿窟、晶石溶洞迷宫、前朝关隘沉陷武库）。
- [x] **反网文/禁远古词拦截黑名单升级 (`types/narrative.ts` & `scripts/generate_narrative_pipeline.mjs`)**:
  - 违禁词库扩展：除网文词外，严格拦截“远古、超古代、古文明、青铜守卫、先祖科技、失落文明”等词汇。
  - 提示词全面升级为东方二次元探险战记基准。
- [x] **真实反重力代理接入与生成验证**:
  - 本地运行 `node scripts/generate_narrative_pipeline.mjs`，通过 `http://127.0.0.1:8317/v1` 的 `gemini-3.8-flash-tiered` 生成了高品质的奇遇事件与生活野炊台词，100% 通过质检验收并持久化至 `data/generated_narratives.json`。
- [x] **DSL 剧本与前端全面适配**:
  - `sampleInkStories.ts` 替换为《边塞残关老校尉的誓铁》与《赤耳哥布林矿洞奇袭》。
  - 全局完成对《星原战纪》标题与微标的无缝替换。
  - `mobile-pwa` 执行 `npm run build` 0 报错构建通过。

### Milestone 7: 核心引擎层全面去欧化——据点、契约、天灾、人设四引擎同步改造 (已完成交付 ✅)
- [x] **英雄工厂重构 (`engine/heroFactory.ts` & `types/hero.ts`)**:
  - `Hero` 新增 `gender: 'male' | 'female'` 字段。
  - 弃用旧西式姓名池（亚瑟/罗兰/灰烬/碎颅等），改为东亚姓氏库（沈陆裴秦顾楚季温白墨…）+ 男女分列名库 + 东方称号库，并优先复用 `HERO_PROFILES` 十人主力名录。
  - 新增 `heroRoleLabel()`，将 `tank/dps/healer` 内部枚举统一渲染为「职业·定位」（如「剑圣·输出」）。
  - 初始名册固定 2 男 2 女；酒馆招募随机生成时男女各 50%。
- [x] **四大据点与契约生态重构 (`engine/townEngine.ts` & `types/world.ts`)**:
  - `TownId` 改为 `frostmoon_keep | breeze_bastion | azure_wharf | vermilion_corridor`，对应霜月城、听风关、碧落行坞、朱雀回廊。
  - `ContractType` 以 `goblin_mine` 取代 `undead_crypt`；契约标题/描述全部重写为东亚探险战记风格（哥布林矿洞、断龙崖流寇、雪莲商队、前朝沉陷关隘）。
  - 酒馆招募背景故事、圣所引渡文案同步替换。
- [x] **天灾引擎重构 (`engine/crisisEngine.ts`)**:
  - 第一期天灾由「夜王复苏 · 亡灵狂潮」改为 **「星原异动 · 极夜狂暴兽潮」**（id `stellar_beast_surge`）。
  - 三阶段文案、受袭据点（朱雀回廊 → 听风关）、契约（听风关守卫战 / 讨伐霜甲巨猿王）全部重写，基调转为「对抗危机 + 反攻大捷」。
- [x] **地牢与 UI 文案收尾**:
  - `types/dungeon.ts` 主题枚举新增 `wilds`；`dungeonEngine` 房间标题改为「山道暗器埋伏」「幽谷险隘」等线性历史措辞。
  - `CrisisAlert` 受袭据点显示中文名；`TownView` 圣所改为「星原引魂坛」；`DungeonView` 敌方编制显示中文职业名。
- [x] **验证**:
  - `npm run build`（tsc + vite）0 报错。
  - 浏览器实测：页头「第 1 天 · 霜月城」、异动栏「星原异动 · 极夜狂暴兽潮」、名册 2 男 2 女（团长·韩素问 / 洛破军 / 白苏 / 陆怀瑾）、公会契约与 Ink 剧本均为东方风。

### Milestone 8: 聚焦地下城探索与战斗 — 世界天灾暂时下线 (已完成交付 ✅)
- [x] 新增功能开关 `mobile-pwa/src/config/features.ts`，导出 `ENABLE_WORLD_CRISIS = false`。
- [x] `App.tsx` 中 `<CrisisAlert />` 与 `crisisEngine.advanceDay()` / `resolveCrisisVictory()` 全部收进开关分支；关闭时不渲染异动横幅、不推进天灾计时，正常结算契约收益。
- [x] `crisisEngine.ts` 与 `CrisisAlert.tsx` 代码完整保留，改为 `ENABLE_WORLD_CRISIS = true` 即可原样恢复。
- [x] 重申开发重点：**地下城探索 + 战斗循环打磨**（房间推进、事件抉择、战斗数值与反馈）。
- [x] 验证：`npm run build` 0 报错；浏览器实测顶栏下直接进入 Tab 区，无「世界异动」横幅，控制台无报错。

### Milestone 9: 战斗数值体系真实化与 PoE/LoL 混合装备系统重构 (已完成交付 ✅)
- [x] **九项核心属性面板 (LoL 扁平化，`types/hero.ts` & `engine/statResolver.ts`)**:
  - 定义 `CoreStatKey`: 物攻(ad)、法攻(ap)、物防(armor)、法防(magicResist)、攻速(attackSpeed)、暴击率(critChance)、暴击伤害(critDamage)、穿透(penetration)、生命上限(maxHp)、治疗强度(healingPower)、韧性(tenacity)。
  - `statResolver.ts` 纯函数推导：`baseStats(hero)` 从 30 项底层基础属性推导 9 维基础值；`resolveStats(hero)` 叠加装备基础值与词条加成（绝对值 flat 与百分比 percent）。
  - **绝不篡改英雄本体属性**：穿脱装备只替换引用，不累加污染英雄底层属性。
  - 护甲减伤公式：`mitigation = effectiveDef / (effectiveDef + 80)`（上限 75%），有效防御 = `max(0, defense - penetration)`。
- [x] **PoE 风格装备系统 (`types/hero.ts` & `engine/dungeonEngine.ts`)**:
  - 装备结构：装等(tier) + 12 种装备基础模板 + 0~4 条词条（粗制 0、精良 1、稀有 2、史诗 3、传奇 4）。
  - 部位专属词缀池：武器（物攻%/法攻%/攻速%/暴击/穿透）、防具（生命%/物防/法防/韧性）、饰品（暴伤/治疗/法攻/暴击/物攻）。
- [x] **真实战斗引擎升级 (`engine/combatEngine.ts`)**:
  - 战斗单位绑定 `ResolvedStats`。
  - 伤害机制：物理/魔法判定、±8% 伤害浮动、护甲与抗性减伤、护甲穿透、暴击率与暴击伤害乘区。
  - 治疗与大招全面接入实际战斗属性；大招与击杀触发对应战斗日志。
- [x] **敌方队伍生成与星级数值梯度 (`engine/enemyFactory.ts`)**:
  - 解决 1★ 4v5 必死问题：1★~4★ 普通房固定 3 名敌人；5★ 进阶 4 名敌人；Boss 专注于单体强化（2.05x HP）而非盲目加人数。
  - 星级属性倍率与血量曲线集中于 `ENEMY_TUNING`，便于调优。
- [x] **地牢节奏与战后包扎 (`engine/dungeonEngine.ts` & `App.tsx`)**:
  - 5~7 房节奏；6 房及以上深度地牢配置 2 处营地，遏止损耗雪球。
  - 战斗胜利：队伍全员获得 8% 生命上限包扎恢复；倒地英雄保留 15% 残命（附带「重伤」伤残与压力增加），不再原地暴毙。
  - 溃退惩罚：保留 20% 生命、+30 压力、-15 士气，给玩家重整旗鼓的机会。
  - 队伍公共背包系统：支持地牢战利品回收、名册界面点击槽位卸下装备、从背包一键穿戴。
- [x] **自动化平衡测试框架与通关率验证 (`scripts/sim_balance.mjs`)**:
  - 基于 Vite SSR 运行千次蒙特卡洛地牢推演。
  - 实测通关率曲线达到预期：**1★ 78%（新手友好且终局 Boss 有压迫感）/ 2★ 90% / 3★ 80% / 4★ 80% / 5★ 28%（需要配装与精细操作的终局挑战）**。
- [x] 验证：`npm run build`（tsc -b && vite build）0 报错。

### Milestone 11: 战术阵型系统（极简二字命名 · 3×3 九宫格战棋沙盘 · 前后排仇恨与近战阻挡）
- [x] **极简阵型类型系统 (`types/formation.ts`)**:
  - 3×3 战术网格：前排 (front)、中排 (mid)、后排 (back)，各包含上中下 3 个槽位。
  - 极简二字命名阵型预设库：【盾墙】(Schildwall)、【锋矢】(Speerspitze)、【坚壁】(Die Mauer)、【散兵】(Scharmützel)、【双医】(Zuflucht)、【疾攻】(Wilde Jagd)、【自由】(Custom)。
  - 阵型健康度校验：检测并警示「无人守住阵线」、「阵中无人疗伤」、「几无杀伤之力」、「脆弱成员置于前锋线」。
- [x] **阵型计算与战位属性修正引擎 (`engine/formationEngine.ts`)**:
  - 前排 (Front)：基础仇恨倍率 4.5x，承伤减免 -10%。
  - 中排 (Mid)：基础仇恨倍率 1.2x，暴击率 +5%，输出 +5%。
  - 后排 (Back)：基础仇恨倍率 0.55x，输出 +10%，治疗效能 +12%。
- [x] **战斗引擎阵型联动 (`engine/combatEngine.ts`)**:
  - 战术寻敌：近战单位必须优先攻击敌方前排，前排存活时无法越线直击后排；远程猎手与法系单位可跨越前线精准狙击。
  - 坦克战吼终极技附加 1.5x 额外仇恨吸引。
- [x] **3×3 拟真战术棋盘 UI (`components/FormationModal.tsx`)**:
  - 彻底摆脱未编译类名依赖，使用原生稳定的 Flex/Grid 内联样式。
  - 敌军来袭标尺 ➔ 前排防守线、中排机动线、后排施法线。
  - 触控反馈：点按角色即亮起金黄色呼吸光圈，点选目标格子瞬间完成移动或对调；底部常驻出战人员快捷药丸槽。
- [x] 验证与平衡推演：`scripts/sim_balance.mjs` 验证盾墙阵型实战表现稳定（1★ 79% / 2★ 85% / 3★ 59% / 4★ 44% / 5★ 7%），后排医官生存率提升 90% 以上。

### Milestone 13: 沉浸式战术战斗表现打磨 (已完成交付 ✅)
- [x] **地牢主题环境层与舞台氛围 (`config/stageThemes.ts`)**:
  - 支持根据当前探索地牢的 `theme`（幽暗矿道 `catacomb`、残破关隘 `ruins`、深林猎场 `wilds`、极夜覆雪 `crypt` 等）自动渲染对应的深邃光影、暗角视差（Vignette）与地坪网格线。
- [x] **角色战术舞台卡与未来立绘/模型统一插槽 (`components/CombatActorCard.tsx`)**:
  - 打造高质感立式卡牌，包含前/中/后排战位徽章、职业徽章与定位标签。
  - 规范化抽象 **Actor Visual Slot**：当前阶段使用精致职业剪影与发型标识，预留未来直接接入高分辨率立绘或 Spine 骨骼模型的文件与插槽标准。
- [x] **物理浮动伤害跳字系统 (`components/FloatingCombatText.tsx` & `types/combatVisual.ts`)**:
  - 普通物理/法术伤害：清脆白/紫字浮动升起。
  - 暴击伤害：大号金红粗体炸裂放大回弹动效 (`CRIT! -xxx`)。
  - 治疗与格挡：翡翠绿柔光升起与硬朗冰蓝盾光。
  - 自动防堆叠横向随机微偏移与 1.2 秒平滑淡出垃圾回收。
- [x] **微打击感反馈管线与全屏微震动**:
  - 攻击冲刺：近战出手时向前突刺并回弹，法系后仰施法。
  - 受击反馈：受击方瞬间应用高亮红光闪烁 (`brightness/contrast`) 并产生受击弹簧震颤。
  - 暴击微震：出现暴击时舞台触发 140ms 屏幕微震动。
- [x] **终极技能视觉演出横幅 (`components/UltCinematicOverlay.tsx`)**:
  - 大招爆发时全场微暗暗屏聚焦，屏幕顶部划过技能醒目斜切通告横幅（如【破空斩】/【回春圣域】/【战吼】）与专属剑芒裂隙。
- [x] **战斗操控与战术交互升级 (`App.tsx`)**:
  - 集成 **1x / 2x 倍速切换** 与 **自动/手动大招** 状态锁。
  - 实现 **点击锁定集火标记（Tap to Focus Target）**：战斗中点击敌方卡片即可亮起红色准星，我方猎手与先锋优先集火该目标。

### Milestone 14: 双向 3×3 自走棋微缩战场重构 (已完成交付 ✅)
- [x] **双向 3×3 战术棋盘与交锋线 (`components/CombatStage.tsx`)**:
  - 彻底淘汰双列卡片布局，升级为左侧 3×3（蓝方先遣阵：后排/中坚/前锋）与右侧 3×3（红方据守阵：前锋/中坚/后排）对称对峙的微缩自走棋战场。
  - 战场中路设立「前沿阻截」战术中线，清晰呈现前线交火与前后排纵深。
- [x] **自走棋微缩可动战斗棋子 (`components/BattlePawn.tsx`)**:
  - 原型复刻反编译 D&D 原作的 Token 棋子系统，圆形立体底座徽章、职业图标、三字短名与盾/刃/医职能微型角标。
  - 棋子底部自带超细血条（HP% 动态三色渐变）与能量条（满气力金芒外溢）。
  - 内置丰富物理微动效：近战向前大跨步突撞（Lunge）、远程/法系浮空蓄力施法（Cast）、受击震颤回退（Hurt）、阵亡倒地下沉灰化（Token Drop）。
- [x] **敌方阵型生成引擎与 3×3 真实网格落地 (`types/enemyFormation.ts` & `engine/combatEngine.ts`)**:
  - 敌方拥有【铁卫突刺阵】、【散兵游猎阵】、【两翼包抄阵】、【众星捧月阵】4 大预设站位。
  - 敌方坦克、刺客、后排法医各司其位，彻底实现两军真实阵型博弈。
- [x] **投射物与粒子弹道系统 (`components/CombatProjectiles.tsx`)**:
  - 游侠箭矢（带尾迹抛物线光影）、奥术师紫芒法球、牧师回春圣光球，实时从施法者棋子划过全场飞向受击目标。
- [x] **移动端垂直纵向对垒布局重构 (Milestone 15: 解决横向三格截断问题)**:
  - 彻底将双侧左右 6 列布局升级为垂直上下对垒架构：上方敌军据守阵（后卫/中坚/前锋向南推进），中央横向战术交火线，下方我方先遣阵（前锋/中坚/后卫迎击北上）。
  - 完美契合手机屏幕纵向宽高比，无需横向滚动或微缩字号，左右 3 列整齐对称，敌人与友军全部 100% 完整可视。
  - 重写 `FloatingCombatText.tsx`：强化浮动伤害跳字（普通打击白字升腾、暴击金黄爆裂放大、治疗绿字光环），去除外层容器限制，直接绝对定位在受击棋子正上方，打击反馈强烈。
  - 战况日志重构为可折叠抽屉：默认收起展示最新摘要（节约大片垂直屏幕空间聚焦战场），点击即可一键展开完整滚动推演记录。
- [x] 验证：`npm run build`（tsc -b && vite build）0 报错，耗时 904ms；浏览器实机验证无横向溢出，动态跳字正常触发。

- [x] **首发/替补轮换系统 (Milestone 16: 招新人可编入出战队伍)**:
  - 根因：出战队伍与阵型布阵此前全部硬编码 `roster.slice(0, 4)`，酒馆招募的第 5 人永远无法上阵。
  - `App.tsx` 新增 `deployedHeroIds: string[]` 首发名单状态与 `deployedSquad` 派生队伍；战斗、地牢、事件、阵型弹窗全部改用该名单（`startRoomBattle`、`DungeonView`、`DungeonEventModal`、`FormationModal`）。
  - `handleSwapHeroDeploy(outgoingId, incomingId)`：一对一换人，替补英雄继承被换下者的 3×3 阵位，并推送系统提示。
  - 名册卡片新增状态徽章：【⚔️ 首发出战 (阵位名)】/【💤 驻营待命】，替补卡片带「换上出战 🔁」下拉可直接选择替换哪位首发出战成员；首发出战卡片提供「调位」入口。
  - `FormationModal.tsx` 重构：新增 `allHeroes` 与 `onSwapHeroDeploy` 属性，棋盘下方同时展示【首发出战先遣队 4/4】与【驻营待命替补席】，点选替补再点棋盘主力格子即可一键轮换上阵 + 继承阵位。
  - `startRoomBattle` 首发存活不足时自动从替补中补足，避免首发重伤导致无法出征。
  - 验证：`npm run build` 0 报错；浏览器实测「酒馆签约温飞燕 → 名册 5/8 显示驻营待命 → 下拉换上出战 → 阵型弹窗替补席点选上阵 → 进入地牢战斗蓝方先遣阵 4/4 含温飞燕」全链路通过。

- [x] **地牢探索深化、去深渊化与清爽冒险体验 (Milestone 17: P1落地)**:
  - 敌人命名去撞名与生态化：在 `engine/enemyFactory.ts` 彻底消除人类姓名生成，依据契约生态类型（哥布林矿洞、流寇营寨、荒原兽潮、沉陷关隘等）构建对应的群怪名称（如赤耳盾手、矿坑大盾哥布林、雪原白额狼、前朝折冲都尉），保留盾/刃/医定位。
  - 去“深渊”化与网文形容词清洗：全项目清洗“深渊”字眼，改为“极夜覆雪古战场”、“险隘探索”；精简所有契约、房间及界面文案，杜绝AI滥用形容词。
  - 分支选路推进（双岔路机制）：引入 `event` 奇遇房间节点，每次清空房间后弹出二选一分支（例如左侧干道迎敌 vs 右侧险隘奇遇），赋予玩家路线选择权。
  - 自然融入奇遇事件：移除原先浮夸的右侧悬浮测试假按钮，奇遇房间通过地牢推演自然触发，由 `DungeonEventModal` 结算全队属性检验与奖励。
  - 一键营地暖汤整备：移除全员固定刷屏的气泡台词；改为一键选食单（热汤暖胃/炙烤干肉/松针清茶），附加队伍属性增益（攻击/防御/治疗加成）与自然闲聊。
  - 验证：`npm run build` 0 报错；浏览器实机验证二选一分支推进、奇遇房间进入与暖汤营地整备全链路通过。

- [x] **地牢节奏优化与战后居中结算 (Milestone 18: 用户反馈打磨)**:
  - 节奏去疲劳：调整 `engine/dungeonEngine.ts`，不再每一关强制弹出二选一岔路（概率控制在特定探索层的 35%~40%），其余为直行干道推进，避免频繁机械选择；
  - 战斗中央浮层结算：修改 `CombatStage.tsx` 与 `App.tsx`，将战后结果（斩杀强敌/撤回医馆、返回沙盘）从页面底部移至微缩战场正中央毛玻璃半透明浮层（`resultOverlay`），对局结束瞬间视觉重心集中在战局正中，符合主流自走棋与地牢游戏结算体验。
  - 验证：`npm run build` 0 报错（399ms）；浏览器实测战斗胜利后中央结算卡片自然浮现居中展示，点击直接平滑返回探险沙盘。

- [x] **战斗结算面板细化与战利品开箱替换 (Milestone 19: 战后两步走与装备对比系统)**:
  - **核心结算与数据引擎 (`types/combatSettlement.ts` & `engine/combatEngine.ts`)**:
    - 在战斗过程中实时统计每个单位的输出伤害 (`damageDealt`)、承受伤害 (`damageTaken`)、治疗量 (`healingDone`)、击杀数与暴击次数。
    - 引入加权算法计算全场 MVP 战力积分（输出 1.0 + 承伤 0.75 + 治疗 1.25 + 击杀 80 + 暴击 25），评选出本场最佳 MVP 英雄。
  - **战绩统计面板组件 (`BattleStatsModal.tsx`)**:
    - 战局结束首先弹出居中统计面板，顶部展示耗时与全场黄金 MVP 勋章；
    - 提供三 Tab 自由切换：⚔️ 输出榜、🛡️ 承伤榜、💚 治疗榜，并附带动态高亮彩色占比百分比横条。
  - **战利品掉落与装备对比替换弹窗 (`LootDropModal.tsx`)**:
    - 支持两步走节奏：胜利后点击“查看战利品与翻牌”进入翻牌流程；
    - 卡牌背面点击翻开，带有装等与品阶对应流光光效（普通灰、优秀绿、精良蓝、史诗紫、传说金）；
    - 智能推荐算法：根据掉落装备类型（物理推先锋、法杖推法师、大盾推前锋）自动高亮推荐适格出战英雄，亦可随时横向点选任意 4 名出战队员；
    - 装备对比栏：呈现当前穿戴 vs 新掉落替换效果，各项核心属性直观标出绿增（↑ +N）与红降（↓ -N）差值；
    - 支持「直接穿戴并替换」与「存入行囊备用」两用操作。
  - **地牢宝箱房间直接掉落打通 (`App.tsx` & `DungeonView.tsx`)**:
    - 宝箱房间启封时若开出珍稀装备，自动弹出同款品质光效与装备对比替换弹窗，可在地牢现场立即武装队员。
  - **构建与测试验证**:
    - 执行 `npm run build` 编译 0 报错；在浏览器中实机全流程测试战役推进、榜单统计切换、装备对比与智能穿戴替换。

### Milestone 20: 装备属性词条白话规范化与地牢流心结算优化 (已完成交付 ✅)
- [x] **词条与属性彻底对齐面板九维属性 (`dungeonEngine.ts` & `statResolver.ts`)**:
  - 根除"必杀/窥机/凝神"等玄学暗号,词条标签直接采用标准九维属性名称：
    - `必杀 +0.41` -> 统一规范为 **`暴伤 +41%`**；
    - `窥机 +0.08` -> 统一规范为 **`暴击 +8%`**；
    - `凝神 +14.05` -> 统一规范为 **`法攻 +14`**（整型属性彻底取整，杜绝零碎小数）；
    - `锋锐 / 通脉` -> 规范为 **`物攻 +% / 法攻 +%`**。
  - 修复浮点百分比属性取整归零 Bug：暴击率、攻速、韧性等百分比属性不再盲目 `Math.round` 导致变成 `0`，而是以百分比或保留有效精度规范呈现。
  - 优化队伍背包与装备描述：基础属性过滤为 0 的项，词条加成以天蓝色独立高亮，条目清晰易读。
- [x] **地牢探索流心去疲劳打磨 (`App.tsx`)**:
  - 普通小怪房间胜利：去除全场 MVP 战绩大弹窗与强制翻牌步骤，战胜后只保留中央快捷过场卡片（一键点击「返回探险沙盘 · 推进路线 🧭」快速切关），不塞背包、不打断探索沉浸感。
  - 仪式感聚焦：全场战役总评（MVP 勋章、三榜条形图统计）与高阶装备大翻牌仅在**关底最终首领（Boss 房间）**斩杀胜利或**开启宝箱房间**时触发。
- [x] **构建与运行验证**:
  - `npm run build`（tsc -b && vite build）编译 0 报错，耗时 297ms。
  - 浏览器动态导入与实机测试验证：词条格式化输出如「史诗·青木法杖：法攻 40 · 治疗 22 | 穿透 +21 · 物攻 +25% · 暴击 +10%」，与英雄九维属性完全一一对应。

### Milestone 21: 公会任务板升级 — S-D等级系统、生活化城镇重构与魔物生态扩充 (已完成交付 ✅)
- [x] **阶段1: 城镇架构与生态词库重构 (`types/world.ts`, `engine/townEngine.ts`, `data/characterNamePool.ts`)**:
  - 淘汰旧武侠风城镇ID（霜月城/听风关/碧落行坞/朱雀回廊），引入4座《迷宫饭》风格生活冒险城镇：
    - 🌾 `ambermill_town` **麦浪与风车镇** — 平原粮仓/麦芽酒香/新手启程地，所有建筑齐全，距离0。
    - ♨️ `verdant_spring` **翡翠泉与铃兰宿** — 温泉疗养/草药宿坊（医馆 + 圣所），距离1。
    - ⚒️ `hammerdeep_hold` **黑铁与汽锤堡** — 蒸汽锻炉/精钢打造，距离1。
    - ⚓ `tidesong_haven` **潮鸣与灯塔港** — 海风港口/飞空艇枢纽（圣所），距离2。
  - 新增 `slime_infestation` 契约类型，六大生态拓展：史莱姆/盗贼/野兽/哥布林/商队/遗迹，各包含怪物名单与特产战利品描述（甜味史莱姆凝胶/拟态怪硬壳/雪花野猪五花肉/枭熊厚绒皮/飞龙胸脯肉）。
  - 扩充 `PURPLE_PROSE_BLACKLIST`：严禁废弃/荒废/幽暗/阴暗/阴森/深渊/修道院/教团/极/失落/远古/超古代等AI套路词。
  - 更新天灾系统受袭城镇ID（`tidesong_haven`, `hammerdeep_hold`, `ambermill_town`）。
- [x] **阶段2: S/A/B/C/D任务板类型与胜率演算引擎 (`types/guild.ts`, `engine/guildEngine.ts`)**:
  - 定义 `GuildContractRank` (S/A/B/C/D) 与星级映射（S=5★, A=4★, B=3★, C=2★, D=1★）。
  - `estimateContractOdds(party, contract)` 计算队伍综合战力 vs 敌人战力，输出胜率百分比与4级危险度标签：
    - `breeze` (≥90% 轻松碾压 🟢)
    - `balanced` (75-89% 势均力敌 🟡)
    - `tough` (50-74% 苦战险胜 🟠)
    - `perilous` (<50% 九死一生 🔴)
  - `generateTacticTip()` 输出怪物特定战术建议（史莱姆物理免伤高建议法系破防；拟态怪下颚护甲硬法系绕后或穿透；枭熊皮糙肉厚带足治疗集火击破）。
- [x] **阶段3: 敌人与魔物生态库重构 (`engine/enemyFactory.ts`)**:
  - 新增 `slime_infestation` 生态敌人名册（石盾史莱姆/电浆史莱姆王/巨型胶质王等）。
  - 为 `beast_hunt` 生态注入枭熊（穴居公枭熊/狂暴穴居枭熊王）、双足翼手飞龙、苍空翼龙霸主。
  - 为 `ruins_cleansing` 生态注入拟态怪（拟态宝箱怪/拟态圣遗物箱/巨口拟态宝箱王）、食人魔（食人魔蛮力士/双头食人魔/暴怒双头食人魔酋长）、巨型洞穴捕鸟蛛、发条重装步兵与失控发条术士。
- [x] **阶段4: 升级TownView公会任务板UI (`components/TownView.tsx`)**:
  - 引入 S-D 等级印章（紫/红/橙/黄/绿渐变配色），卡片左侧突出显示任务等级。
  - 展示讨伐目标怪物名、特产战利品描述（史莱姆凝胶/拟态怪硬壳/枭熊皮等）。
  - 实时计算并显示出战队伍预估胜率百分比 + 危险度标签（轻松碾压/势均力敌/苦战险胜/九死一生）。
  - 提供战术建议气泡（💡 史莱姆物理免伤高，建议法系破防）。
  - 新增 🔍 打探刷新按钮（消耗 50G 手动刷新契约榜单）。
  - 接取按钮限制：出战队伍至少需要 2 人才能接取契约。
- [x] **阶段5: 全链路打通与验证**:
  - `App.tsx` 传递 `deployedHeroIds` 给 `TownView`，任务承接正常触发地牢生成。
  - `npm run build` 编译 0 报错（288ms）。
  - 浏览器实机验证：公会任务板显示 S-D 印章、胜率评估、战术建议、刷新按钮全部功能正常。

### Milestone 22: 英雄经验、等级与 CA 成长系统 (已完成交付 ✅)
- [x] **经验曲线与等级 (`types/progression.ts`, `engine/progressionEngine.ts`)**:
  - 复刻反编译白皮书曲线：`xpTotalForLevel(level) = ceil(0.9x² + 6x)`（x = level-1），等级上限 20。
  - 关键阈值：Lv2=7、Lv3=16、Lv4=27、Lv5=39、Lv6=53、Lv10=127、Lv15=261、Lv20=439。
  - 经验来源：普通战斗房 `2+星级`、首领房 `6+星级×2`、契约通关 `8+星级×3`；战败仅结算 30%；MVP 额外 ×1.15。
  - 兼容旧存档：`hero.experience` 缺失时按当前等级阈值反推，不破坏已有名册。
- [x] **CA 能力成长与属性分配**:
  - `growHeroAbility()`：潜力余量（PA-CA）、推荐等级差（每级 ±15%）、战斗场次、队伍缺员补偿、适应性共同决定 CA 增长，基础系数 2.2。
  - 小数余量写入 `growthCarry` 跨契约累计，避免低成长被反复抹零。
  - 每点 CA 产出 `max(1, round(CA×1.75))` 点属性，按九职业成长权重在 30 维属性中加权随机分配，单项上限 30。
  - 每份契约仅在地牢通关（首领战胜利）时结算一次 CA，普通房间只累积经验。
- [x] **等级压制与胜率联动 (`engine/combatEngine.ts`, `engine/guildEngine.ts`)**:
  - 战斗中每级差 ±2% 伤害，上下限 ±15%（`levelSuppressionMultiplier`）。
  - 公会胜率接入队伍平均等级与推荐等级差，修正系数 ±15%；胜率曲线改为幂函数 `100×ratio^0.55`，D 级 1★ 约为 86%，C 级 2★ 约为 57%，避免全榜「九死一生」。
- [x] **UI 呈现 (`App.tsx`, `components/BattleStatsModal.tsx`)**:
  - 名册英雄卡新增经验条（`经验 into/need`）与成长进度（`CA / PA`），满级显示金色进度条。
  - 战后结算新增「📈 战后成长结算」：逐人显示经验、CA、`⬆ Lv.a → Lv.b` 金光徽章、属性成长明细；MVP 标注并提示经验 +15%。
  - 普通房间胜利仅提示升级信息，不打断探索节奏。
- [x] **构建与实机验证**:
  - `npm run build`（tsc -b && vite build）0 报错，耗时 259ms。
  - 实机 1★ 契约全流程：三场普通战斗累积经验 3/6/9，首领战通关结算经验 +11、四人全部升级（Lv.7→8 / 3→4 / 5→6 / 6→7），萧凌霄 CA 51→52 并成长「反应+1 · 格挡+1」，MVP 季秋水获得 +13 经验，战利品翻牌与契约结算正常。
  - 回城后胜率随等级提升由 86% → 87%，英雄卡经验条同步刷新。

### Milestone 23: 铁匠铺 — 打造、重铸、洗练与分解 (已完成交付 ✅)
- [x] **装备品质模型 (`types/hero.ts`, `engine/dungeonEngine.ts`)**:
  - 放弃数值化 +1~+9 强化，改用原版品质系数：装备生成时 roll `0.82~1.18` 的 `quality`，并直接折算进基础属性与词缀。
  - 品质分档：`<0.875 粗劣`、`<1 普通`、`<1.125 精良`、`≥1.125 极品`（破损档保留给未来战损装备）。
  - 每件装备附带一次性 `reforged` 标记，重铸后全部基础属性与词缀 ×1.18，名称加「重铸·」前缀。
- [x] **铁匠铺引擎 (`engine/blacksmithEngine.ts`)**:
  - `tierForHeroLevel(level) = ceil(level/4)`：铁匠按队伍最高等级准备对应装等（1-5）。
  - 打造：消耗金币 `90+60×装等`、晶石 `2×装等`、玄铁 `装等`，品质按装等加权随机（`rollRarity(tier×6)`）。
  - 重铸：金币 `50+35×装等`，每件一次，属性 +18%。
  - 洗练：金币 `40×装等` + 晶石 `2×装等`，保留词条数量与品质，重掷词缀；粗制装备无词缀不可洗练。
  - 分解：回收金币、晶石与玄铁（稀有以上产出玄铁），装等越高回收越多。
- [x] **城镇接入 (`types/world.ts`, `engine/townEngine.ts`, `components/TownView.tsx`, `App.tsx`)**:
  - 新增 `blacksmith` 建筑类型与 ⚒️ 铁匠铺标签：麦浪与风车镇、黑铁与汽锤堡可用。
  - 汽锤堡老师傅坐镇，打造/重铸/洗练费用 -15%。
  - 后勤新增「锻造晶石」「玄铁锭」两种材料，初始 12 / 6，铁匠铺顶部实时显示。
  - 四个子页：🔨 打造（部位 + 装等 + 图纸）、🔥 重铸、🎲 洗练、♻️ 分解（含二次确认）。
  - App 将背包 `inventory` 与 `onInventoryChange` 传入城镇界面，打造产物直接入包，分解即时移除。
- [x] **构建与实机验证**:
  - `npm run build`（tsc -b && vite build）0 报错，耗时 1.01s。
  - 实机：Lv.8 队伍默认 T2 打造，精钢长剑产出「精良·精钢长剑（品质 0.87）」，扣费 210G/4晶石/2玄铁。
  - 装备后英雄物攻由基础值提升至 41；重铸后词缀法攻 +13% → +16%，洗练再随机至 +22%。
  - 分解粗制长剑回收 20G + 2 晶石，背包与材料同步刷新。

### Milestone 24: 纸面 UI 全面改版 + 隐形格战场 (已完成交付 ✅)
- [x] **设计地基 (`index.css`, `index.html`)**:
  - 建立羊皮纸设计 Token：纸面三层 `#DCCDAE / #EFE3C8 / #E3D3B0 / #F7EFDD`、墨色三阶、黄铜与酒红强调色，以及城邦/地牢/战斗/安全/秘法五个语义色。
  - 字号八级、间距、圆角、描边、阴影全部 Token 化；正文最小 12px，10-11px 仅用于 2-6 字标签。
  - 补齐 `fadeIn / riseIn / popIn / pulseGlow / breathe` 关键帧（此前 4 处引用但从未定义，动画一直不生效）。
  - 新增 `components/ui` 公共件：`Masthead / Card / Btn / Seal / Tag / StatBar / WinRing`。
- [x] **城镇 (`TownView.tsx`)**: 羊皮纸横幅 + 声望胶囊、建筑签 3+2 换行、公会悬赏卡（等级印章 / 胜率环 / 战术提示 / 50G 打探）、酒馆、市集、医馆、铁匠铺四子页、圣所、转移抽屉全部重做；URL `?b=blacksmith` 可直达建筑页。
- [x] **名册 (`RosterView.tsx`)**: 3×3 编队盘 + 首发/待命卡 + 生命/经验双条 + 九维面板 + 装备三槽 + 团队背包。
- [x] **地牢 (`DungeonView.tsx`)**: 手绘路线图（34px 圆形节点、已清/当前/未达三态）、房间卡、营地三选一料理、岔路选择、队伍血量卡。
- [x] **战场 (`CombatStage.tsx`, `BattlePawn.tsx`, `config/stageThemes.ts`)**:
  - 双方各一块 3×3 **隐形格**：格线平时完全不画，但坐标真实；首领占 2×2，随从与英雄各占 1 格，人数不足时敌人按列对称铺开。
  - 首领会缓慢呼吸（4.8s 缩放 1.028 + 上浮 3px），受击/攻击动效与呼吸互不打断。
  - 场景是**一整间窟室**：石砖后墙 + 两支壁炬、地面横缝、四角收暗、中央空地散落断矛/破盾/血痕 + 3 颗浮尘，不再有「交锋带」这条空白腰带。
  - 造型槽接受剪影：英雄为统一人形 + 职业武器（盾/剑/弓/杖/斧），小怪为哥布林体型，首领为带角枭熊；后续接立绘或模型只需替换 SVG。
  - 名牌改为纸签 + 短血条，首领额外带「首领」徽章；远程弹道改为实测棋子中心坐标，缩放后仍能命中。
- [x] **构建与实机验证**:
  - `npm run build` 0 报错（多次，最新 7.59s）。
  - 浏览器实测战斗页：`.cs-zone` 2 个、`.cs-cell` 18 个、`.cs-unit` 6 个，无横向溢出，console 0 error。
  - 390×844 截图确认：后墙砖缝与壁炬、中央散落物、四英雄剪影与纸签血条、控制台与战况简报均已羊皮纸化。
- [x] **剩余四屏纸面化 (`DungeonEventModal` / `FormationModal` / `UltCinematicOverlay` / `InkStoryRunner`)**:
  - 秘境奇遇：深木顶栏 + 黄铜类别签，正文改衬线，选项按是否满足条件分有底/压暗两态，成功率用等宽数字配色，底部按钮固定。
  - 战术阵型：预设/九宫格/首发/替补四段，职业改 lucide 图标（盾/叶/剑）与三色区分，替补选中用秘法紫虚线提示可换人。
  - 大招特写：纯黑幕改墨夜径向渐变 + 纸纹颗粒，按角色分黄铜/苔绿/酒红三色，名牌改衬线大字 + 上下黄铜细线。
  - 物语页：剧本选择改横滚签、源码编辑器改凹面纸、叙事正文改衬线卷轴并带黄铜左脊，「你选择了」改为酒红斜体小签。
  - 营地碎念：九种性格色全部换为低饱和印刷色，头像 emoji 换成衬线「话」字。
- [x] **战役页状态修复**:
  - 新增 `resetCombatSession()`，在撤离、通关回城、进入新战斗三处清空 `engine / combatUnits / 浮字 / 弹道 / 结算四态`，修复「已通关后点战役仍是上一轮战场」。
  - 战役页新增空态「战场空着」（去看榜 / 回到地牢）。
  - 战斗进行中底部导航除「战役」外全部变灰，点击只提示不跳转；结算未确认时同理。战斗中阵型按钮禁用，顶栏新增「撤退」按钮。
  - 构建 789ms 0 报错；`?tab=story` / `?tab=combat` 实测 console 0 error、无横向溢出。

### Milestone 25: 存档持久化 + 待办蓝图 (已完成交付 ✅)
- [x] **路线蓝图 (`TODO.md` 全量重写)**:
  - M1–M24 已完成摘要表；P0 存档持久化 / P0 数值校准 / P1 性能剩余 / P1 表现 / P2 功能五段分级，附目标胜率曲线（1★≈85% … 5★≈22%）与工程约定（构建门禁、无 Tailwind、改数值先跑 sim）。
- [x] **存档引擎 (`engine/saveEngine.ts`)**:
  - `SAVE_KEY = 'starfall.save.v1'`、`SAVE_VERSION = 1`；`SaveData` 覆盖城镇五字段、名册、首发、阵型预设与槽位、背包、进行中的契约与地牢（含 `roomIndex`）。
  - `loadSave` 逐项体检版本与字段类型，结构不符只 `console.warn` 不删档；`writeSave` 捕获配额/隐私模式异常静默失败；`clearSave` 与 `formatSavedAt`。
  - `suspendSave()` 写入总闸：重开新档时先关闸，避免「清档 → 刷新」之间 800ms 防抖定时器把旧快照写回（实测触发过该竞态，已修）。
- [x] **App 接线 (`App.tsx`)**:
  - 启动时一次性读档（`useRef` 记忆，避免重复解析），`townEngine` 构造后 `applyTownSave`，名册/首发/阵型/背包/契约/地牢全部优先取存档值。
  - 每次渲染把快照写入 `snapshotRef`，无依赖数组的 `useEffect` 设 800ms 防抖定时器落盘——战斗中每 200ms 重渲染会不断重置定时器，等价于「战斗不写盘」；另挂 `pagehide` 与 `visibilitychange` 立即落盘。
  - 有进行中的地牢时，启动默认落在战役页。
- [x] **城镇横幅 (`TownView.tsx`)**: 新增「进度自动保存 · 第 N 天」与「重新开始」（二次确认 → `suspendSave` + `clearSave` + reload）。
- [x] **实机验证**:
  - 打探 50G 后落盘 27284 bytes，`savedGold 1150`；刷新后金币仍 1150，console 0 error。
  - 接取契约后存档写入 `dungeon` 与 `roomIdx`；刷新直接回到「草药商队峡谷护送 · 第 1 / 7 间」，路线与当前房间完整保留。
  - 重新开始后回到 1200 G / 第 1 天 / 无地牢的新局，旧档未复活。
  - `npm run build` 725ms 0 报错。





### Milestone 27: 仓库卫生、README 与 CI (已完成交付 ✅)
- [x] **根目录清理 (`tools/re/`)**:
  - 74 个一次性逆向脚本（`analyze_*` / `extract_*` / `inspect_*` / `find_*` / `parse_*` / `check_*` / `decode_save*`）与 `save_codec.js` / `save_tool.js` 全部 `git mv` 到 `tools/re/`，保留历史但不参与构建。
  - 未跟踪的大体积产物（`game_bundle.js` 34MB、`extracted_index.html`、`save_decompressed_sample.json` 等）一并移入该目录，仍由 `.gitignore` 忽略，不会误提交。
  - 删除根目录 `__pycache__/`。根目录此后只剩工程文件：`AGENTS.md` / `TODO.md` / `PROJECT_HANDOFF.md` / 白皮书 / `deploy-pwa.sh` / `.env*`。
  - 新增 `tools/re/README.md`：说明这批脚本的性质、运行前提（需自备 `game_bundle.js`），并指明结论已沉淀到白皮书与 `mobile-pwa/src/engine/`。
- [x] **`mobile-pwa/README.md` 重写**（原为 Vite 默认模板）:
  - 快速开始、固定端口说明、`?tab=` / `?b=` 调试参数表。
  - 命令表（dev / check / test / build / verify / setup:hooks）与 pre-commit 钩子说明。
  - 项目结构树（含「引擎层不得 import React」约束）、玩法系统一览、质量与流程、部署方式。
- [x] **CI (`.github/workflows/ci.yml`)**:
  - push 到 `main` / PR / 手动触发时，在 `mobile-pwa` 下依次跑 `npm ci` → `npm run check` → `npm test` → `npm run build`，并上传 `dist` 产物（保留 7 天）。
  - 带 `concurrency` 分组，同分支只保留最新一次运行。
  - 主远端为 Gitee，若改用 Gitee Go，按同样四步配置即可（README 已注明）。
- [x] **验证**: `npm run check` EXIT=0（仅既有 warning）；`npx vitest run` 4 files / 30 tests 全绿，435ms。

### Milestone 28: 质量门禁清零与性能收尾 (已完成交付 ✅)

- [x] **oxlint 41 → 0 warning**
  - `App.tsx` 启动引导由 `bootSaveRef`（render 期读 `ref.current`，10 条 `react(refs)`）改为惰性 `useState(() => {...})` 一次性装箱；删除挂载后补初始化首发/阵型的 effect（同时消除 `exhaustive-deps` 与 `set-state-in-effect`）。
  - 自动保存快照从 render 期赋值改为在无依赖 `useEffect` 内构造并写 ref，仍保持 800ms 防抖。
  - 战斗心跳 effect 补齐 `currentDungeon` / `currentContract` 依赖（战斗中途二者身份不变，不会重启计时器）。
  - `InkStoryRunner` 的挂载同步用 `// oxlint-disable-next-line react/set-state-in-effect` 精准抑制（圆括号形式不生效，必须斜杠形式）。
  - `statResolver.describeBase` 用解构空位 `([, value])` 消除未使用参数。
  - `.oxlintrc.json` 关闭 `react/immutability`，理由：引擎为可变领域对象架构，彻底改不可变需大重构，已记入 `TODO.md` 技术债。

- [x] **性能收尾**
  - 删除 3 处 `backdrop-filter: blur()`（`DungeonEventModal` / `FormationModal` / `CombatStage` 结算遮罩），改用加深的半透墨底（`.62` / `.62` / `.6`），视觉几乎无差别、移动端 GPU 开销显著下降。
  - `index.css` 的 `.pz` 加 `font-variant-numeric: tabular-nums`，血量/金币/伤害刷新不再抖动。
  - `InkStoryRunner` 改为 `React.lazy` + `Suspense` 懒加载：主包 **681 kB → 425.64 kB**，另出 `InkStoryRunner` 独立 chunk **256.87 kB**（gzip 66.49），构建警告消失。

- [x] **CI 真正可跑**
  - 新增 `.workflows/ci.yml`（Gitee Go）：`npm ci` → `check` → `test` → `build`。需在仓库网页端「流水线」开通并选中该 YAML。
  - 保留 `.github/workflows/ci.yml`（镜像到 GitHub 时直接生效），二者等价。

- [x] **蓝图更新**
  - `TODO.md` 全量重写为当前状态：M1–M28 摘要表、P0 数值校准（暂缓，附目标胜率曲线）、P1 性能剩余（战场单单位 memo）、P2 未来玩法（**《杀戮尖塔》式地牢路线图**三项拆解 + 技能库/状态效果/压力崩溃/羁绊/天灾/iOS）、技术债（引擎不可变化重构）。

- [x] **验证**
  - `npm run check` → 零 error 零 warning。
  - `npx vitest run` → 4 files / 30 tests 全绿。
  - `npm run build` → 838ms，主包 425.64 kB + 懒加载 chunk 256.87 kB。


### Milestone 29: 战场渲染 memo 化 — 性能项清零 (已完成交付 ✅)
- [x] **`BattlePawn` 改为 `React.memo` + 逐字段比较 (`components/BattlePawn.tsx`)**:
  - 战斗心跳每 200ms 执行 `setCombatUnits([...engine.units])`，数组是新的但 unit 对象是**原地 mutate** 的，所以默认浅比较会误判「没变化」而冻结血量。改为显式比较 `hero.id / currentHp / maxHp / resource / isDead / slotId / autoUlt / isSelected / isInteractable`。
- [x] **修掉一个会让 memo 完全失效的陷阱 (`components/CombatStage.tsx`)**:
  - 原本每次都写 `visualState={{ ...visualStates[id], focused }}`，每次渲染都是新对象引用；若按引用比较则永远不相等。改为 `sameVisual()` 逐字段比较 7 个视觉状态位（`isAttacking / attackMotion / isHit / isCritHit / isHealing / isDead / focused`）。
  - `onFocus` 每次都是新的内联箭头函数，但只做 id 透传、功能等价，故不参与比较。
- [x] **构建验证**:
  - `npm run check`（tsc -b && oxlint）零 error、零 warning。
  - `npm run build` 992ms 成功，主包 426.20 kB（gzip 134.06）、InkStoryRunner 懒加载块 256.87 kB（gzip 66.49）、CSS 14.44 kB，**chunk-size 警告已消失**。
- [x] **结果**: `TODO.md` 中 P1「战场单单位 memo 重渲染」清零；至此性能优化清单（跳字 rAF、样式注入、布局回流、日志拷贝、backdrop-filter、tabular-nums、代码拆分、单单位 memo）全部完成。
