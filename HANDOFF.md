# 会话交接（2026-11-19）

> 给下一个会话的上手摘要。看完这份 + `AGENTS.md` + `TODO.md` 就能接上。

---

## 一、当前状态

- 仓库 `D:\reverseGame`，分支 `main`，HEAD `6b3a8ef`（M41），工作区干净（仅剩两个未跟踪的素材 zip，不入库）。
- 测试基线：`npm run test` = 5 files / **74 tests** 全绿；`npm run check` 0 error / 0 warning（含命名红线门禁）。
- 本地服务（会话重启后需重开）：
  - `cd mobile-pwa && npm run dev` → http://127.0.0.1:5199/game/
  - `python -m http.server 5200 --bind 127.0.0.1`（根目录 `D:\reverseGame`）→ http://127.0.0.1:5200/

## 二、最近的里程碑

| 编号 | 内容 | 提交 |
| --- | --- | --- |
| M35 | 铁匠铺打造进工程（图纸/材料/三段小游戏/开光批注/老板代打/熟练度） | `35a8978` |
| M36 | 重洗开光锁定（耗砺石磨刀砂保留一条开光批注） | `09dd38e` |
| M37 | 修复铁匠铺滚动卡死（嵌套滚动容器） | `4889db0` |
| M38 | 首批美术接入（12 张图纸卡面） | `8b9e50c` |
| M39 | 手账贴纸视觉 + 人物提示词改二次元 | `77040d2` / `11e8325` |
| M40 | 批次 B 英雄二次元立绘全面接入（18 张） | `f2f02ef` |
| M41 | 《三岔口》世界观重构（姓名/城镇/契约/敌人/兵器术语/剧本）+ 命名红线门禁 | `6b3a8ef` |

更早的 M31–M34 见 `PROJECT_HANDOFF.md`。

## 三、新增的关键文件

| 文件 | 作用 |
| --- | --- |
| `src/engine/blueprintData.ts` | 12 张图纸、7 种材料、每部位 8 条打造词条池 |
| `src/engine/craftEngine.ts` | 备料计价、熟练度、锻造状态机、词条生成、代打、分解回收、图纸掉落 |
| `src/components/BlacksmithView.tsx` | 铁匠铺全部界面（5 个页签 + 小游戏 + 成品弹层） |
| `src/config/artAssets.ts` | 各类美术资源的路径候选链 |
| `src/components/ui/ArtImage.tsx` | 依次尝试候选图，失败自动回落 |
| `docs/ART_ASSETS.md` | 美术规格 + 77 张图清单 + 可直接粘贴的提示词 |
| `scripts/gen_item_art.mjs` | 生成 12 张 SVG 占位卡面的脚本 |
| `public/art/items/*.webp` | 12 张已交付的图纸插画 |
| `docs/LEXICON_AND_GATES.md` | 命名五铁律 + 世界观一页版 + 术语表 + 文案改动规约（**改文案必读**） |
| `docs/RENAME_STAT_REFERENCE.md` | 材料/图纸/开光批注旧→新对照，注明数值未动 |
| `docs/BACKLOG_WORLDVIEW_V2.md` | 世界观二期计划：营地磨刀拭甲、望山堡、九职业名、契约区域化 |
| `docs/worldview_data/` | 重构包原始数据稿（P0/P1/P2） |
| `scripts/check_naming.mjs` | 命名红线门禁（扫字符串/模板串/JSX，跳过注释，零豁免） |
| `scripts/naming_rules.mjs` | 门禁规则：25 个禁用字 + 跳过清单 |

## 四、必须遵守的约定

1. **不要用 PowerShell 读写含中文的文件**（`Get-Content -Raw` + `Set-Content` 会二次编码，字会永久丢失）。用 `edit` / `write` 工具，或 Node `fs.readFileSync/writeFileSync(path, 'utf8')`。
2. **页框三件套 `.pz-page / .pz-page-fixed / .pz-page-scroll` 只能出现在页面根节点**。子组件一律用 `.pz-col`，再套一层 `pz-page-scroll` 会在手机上锁死手势。
3. **美术素材**：生成的图先放仓库根 `artResources/`（已 gitignore），校验通过后再复制到 `mobile-pwa/public/art/{items|heroes|enemies|towns|stages|npc|materials}/`。界面通过 `ArtImage` 读取，缺图自动回落，**不需要改代码**。
4. **改数值前先跑** `node scripts/sim_balance.mjs`。
5. **提交前** `npm run check`（含命名门禁）；**提交后**推两个远程 `git push origin main` + `git push github main`（PowerShell 会把 git 的 stderr 包成红色报错，只要看到 `xxx..yyy  main -> main` 就是成功）。
6. 调试参数：`?tab=` / `?b=` / `?panel=` / `?smith=` / `?bp=`，详见 `AGENTS.md`。
7. **改任何对外文案前先读 `docs/LEXICON_AND_GATES.md`**，改完同步 `AGENTS.md` 与 `PROJECT_HANDOFF.md`；门禁零豁免，没有例外名单。

## 五、下一步待办

**P0｜世界观二期（见 `docs/BACKLOG_WORLDVIEW_V2.md`）**
- 营地改成「开锋磨刃 / 桐油拭甲 / 校弦缠柄」三选一，替掉现在的吃饭休整（动 `DungeonView` 营地房 + `dungeonEngine.onCampRest` + buff 类型 + 干粮经济）。
- 新增第五城望山堡（`TownId` 扩容 + 构造函数字典 + 存档迁移登记）。
- 九职业显示名武侠化（现仍是 护卫/守望者/圣武士/剑圣/奥术师/游侠/牧师/德鲁伊/乐师）。
- 契约区域化：每类契约绑定对应板块与副本，替掉「每城随机抽 6 类」。
- 美术继续：敌人（战斗结算/图鉴）、城镇横幅、地牢底图、NPC、材料图标——路径与 `*ArtSources` 已就位。

**P1｜玩法**
- 开光批注的真实战斗特效（数值已通过 `statResolver` 生效，缺"特效类"）。
- 图纸残页合成、委托队列。
- 战斗状态效果、技能库扩容、压力崩溃接入战斗。

**P2｜技术债**
- `App.tsx` 按 tab 拆到 `screens/`。
- 引擎里可变类（`TownEngine`）做不可变化重构。

## 六、已知环境坑

- `browser.screenshot` 需要可见窗口（最小化时会报 `Screenshot needs a visible tab`）；headless Chrome CLI 截图**每次要新建唯一 `--user-data-dir`**，否则会拿到 PWA 缓存或静默失败。
- `/game/*` 下的任意路径都会被 Vite SPA fallback 成应用，不能当作"空白同源页"来写 localStorage。要改存档：先关掉所有 `/game/` 标签页，再打开 `/favicon.svg` 写 `starfall.save.v1`。
- 当前存档结构：`{town, roster, deployedHeroIds, formationPreset, formationAssignments, inventory, craft, dungeon, version, savedAt}`，`SAVE_VERSION` 仍为 **1**（新字段靠 normalize 补默认，没有迁移负担）。
