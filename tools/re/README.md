# tools/re — 逆向分析一次性脚本

这里的文件是项目早期为了搞清楚原版《Dungeons & Dynasties》机制而写的一次性脚本，
**不参与构建、不被任何应用代码引用**，只作为考古档案保留（部分公式推导过程可回溯）。

## 目录内容

| 类别 | 说明 |
| --- | --- |
| `analyze_*.py` | 扫描前端库、系统清单、玩法术语 |
| `extract_*.py` | 从包里提取种族表、翻译、JS 资源 |
| `inspect_*.py` | 逐段查看反编译 bundle 里的职业 / 战斗 / 扎营 / 特质 / 伤害 / Gambit 等实现 |
| `find_*.py` | 定位存档键、编解码器、引用位置 |
| `parse_*.py` / `decode_save*.py` | 解析存档结构与 CVF 压缩块 |
| `check_*.py` / `test_*.py` | 当时的临时验证脚本 |
| `save_codec.js` / `save_tool.js` | 存档编解码（Tauri 端逻辑复刻） |
| `game_bundle.js` | 反编译产物（约 34MB，**已在 .gitignore 中忽略，不纳入版本库**） |
| `extracted_index.html` | 原始前端入口页（同样忽略） |

## 结论去哪了

脚本产出的可复用结论已经沉淀到：

- `DUNGEONS_AND_DYNASTIES_REVERSE_ENGINEERING_WHITEPAPER.md` — 机制白皮书（能力体系、战斗公式、扎营、压力、特质、联赛）
- `mobile-pwa/src/engine/` — 落地实现（`statResolver` / `combatEngine` / `progressionEngine` / `enemyFactory` …）

**不要在这里新增业务逻辑。** 需要重新挖原版数据时再临时加脚本，用完请连同结论一起写进白皮书。

## 运行方式

需要 Python 3.11+，且 `game_bundle.js` 已放回本目录（默认不随仓库分发）：

```powershell
cd tools/re
python inspect_combat_engine.py
```

多数脚本硬编码了相对路径（`../game_bundle.js` 或本目录），搬家后可能需要微调路径。
