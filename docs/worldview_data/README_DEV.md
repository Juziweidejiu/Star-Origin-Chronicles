# 《百炼行》世界观重构与工程接入说明（开发必读）

> **包内定位**：本压缩包为《百炼行》（原《星原战纪》）全面重构后的**终版世界观、命名规范、大地图与前端替换数据包**。所有旧版草案（含颜色字、冷热词或野炊生态）均已剔除，可直接交由开发者或 AI 编程助手读取并落地。

---

## 一、包内文件清单与用途

| 文件名 | 类型 | 建议放入项目位置 | 用途说明 |
| :--- | :--- | :--- | :--- |
| `README_DEV.md` | 说明文档 | `docs/` | 本文件，说明目录结构、落地顺序与兼容注意事项 |
| `WORLDVIEW_MASTER_DESIGN.md` | 总纲文档 | `docs/` | 世界观铁律、大地图、武器体系总览及前端改造清单 |
| `NAMING_STYLE_GUIDE_V2.md` | 规范红线 | `docs/` | 去 AI 味命名规范 v2，文末含可直接喂给 AI 的红线约束块 |
| `WORLD_MAP_V3.md` | 地图与历史 | `docs/` | 5 大核心板块 + 2 大远期扩展区（东海列岛/南疆竹山）与近三十年历史 |
| `WUXIA_WEAPON_AND_CRAFTING_SYSTEM.md` | 系统设计 | `docs/` | 《九阴真经》式兵器形制、开光一~四重、落款、定锋洗练与精淬方案 |
| `P0_WORLDVIEW_DATA_REPLACEMENT.md` | 代码数据 | 参照替换 `src/` | `characterNamePool.ts`、`townEngine.ts`、`enemyFactory.ts` 替换代码 |
| `P1_BLUEPRINT_DATA_REPLACEMENT.md` | 代码数据 | 参照替换 `src/engine/` | `blueprintData.ts` 新图纸、材料与 24 条开光批注池 |
| `P1_GUILD_AND_BLACKSMITH_UI.md` | 代码数据 | 参照替换 `src/` | `guildEngine.ts` 战术提示与 `BlacksmithView.tsx` 界面文案 |
| `P1_P2_CAMP_AND_NARRATIVE_DATA.md` | 代码数据 | 参照替换 `src/` | `DungeonView.tsx` 营地磨刀选项与 `narrative.ts` 新版黑名单 |
| `P2_SAMPLE_INK_STORIES.md` | 剧本数据 | 参照替换 `src/data/` | `sampleInkStories.ts` 两个去 AI 味重写 Ink 分支剧本 |

---

## 二、开发落地顺序（P0 → P1 → P2）

### 第一步（P0 · 人物、城镇与敌人换皮）
1. 打开 `P0_WORLDVIEW_DATA_REPLACEMENT.md`，依次替换：
   * `mobile-pwa/src/data/characterNamePool.ts`
   * `mobile-pwa/src/engine/townEngine.ts`
   * `mobile-pwa/src/engine/enemyFactory.ts`
2. **存档兼容说明**：本包所有配置**故意保留了原有的 `TownId`（如 `ambermill_town`）、`ContractType`（如 `goblin_mine`）和 `classId` 枚举键名**，只改显示名称与描述文本，因此**不会破坏 `starfall.save.v1` 旧存档**，无需 bump `SAVE_VERSION`。

### 第二步（P1 · 兵器系统、公会提示与营地整备）
1. 打开 `P1_BLUEPRINT_DATA_REPLACEMENT.md`，替换 `mobile-pwa/src/engine/blueprintData.ts` 中的 `MATERIALS`、`BLUEPRINTS` 与 `CRAFT_AFFIX_POOL`（保留 `bp_*` 与 `iron/wood/.../sand` 键名，现有 `public/art/items/*.webp` 无需改名）。
2. 打开 `P1_GUILD_AND_BLACKSMITH_UI.md`，更新 `guildEngine.ts` 的 `generateTacticTip`，并在 `BlacksmithView.tsx` / `craftEngine.ts` 中接入“精淬·”“开光一~四重”“砺石磨刀砂”及手打落款逻辑。
3. 打开 `P1_P2_CAMP_AND_NARRATIVE_DATA.md`，将 `DungeonView.tsx` 营地休整选项替换为“开锋磨刃 / 桐油拭甲 / 校弦缠柄”。

### 第三步（P2 · 质检拦截与 Ink 剧本）
1. 将 `P1_P2_CAMP_AND_NARRATIVE_DATA.md` 第二部分的 `PURPLE_PROSE_BLACKLIST` 与 `validateNarrativeQuality` 合入 `src/types/narrative.ts`（并同步 `scripts/generate_narrative_pipeline.mjs`）。
2. 用 `P2_SAMPLE_INK_STORIES.md` 替换 `src/data/sampleInkStories.ts`。

---

## 三、开发验收门禁

每次替换完成后，请在 `mobile-pwa/` 目录下执行以下检查（遵循 `AGENTS.md`）：

```bash
npm run check   # 类型检查 + oxlint（必须 0 error 0 warning）
npm run test    # vitest 引擎单测（注意：若有旧测试断言“麦浪/星陨砂/重铸·”等旧文案，需同步更新测试断言）
npm run build   # 生产构建验证
```

> 若后续需要给新城镇（如 `望山堡`）或两大扩展区（东海列岛、南疆竹山）新增 `TownId` 与图谱节点，届时再按 `docs/SAVE_MIGRATION.md` 登记迁移函数并升级 `SAVE_VERSION`。
