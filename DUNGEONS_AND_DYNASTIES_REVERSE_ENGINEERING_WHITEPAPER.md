# 《Dungeons & Dynasties》（地牢与门阀）核心逆向工程与系统架构白皮书

---

## 目录
1. **逆向分析概述与工程环境**
2. **存档系统与安全机制（DDZ1 编解码与防作弊校验）**
3. **英雄能力体系（FM 足球经理风格模型：CA/PA、30维主属性与隐藏属性）**
4. **种族生命周期与衰老曲线（Lifespan & Age Decay Curves）**
5. **职业体系与数值战斗公式（HP/伤害/攻击间隔/暴击/仇恨/抗性）**
6. **战术指令引擎（FF12 式 Gambit 自动化作战队列）**
7. **地牢探索与程序化生成逻辑（Delve & Room Distribution）**
8. **扎营修整系统（Camp Rest Engine）**
9. **心能压力与崩溃系统（The Break: 暗黑地牢式的决断与折磨）**
10. **伤痕、创伤与持久损伤（Injuries & Trauma）**
11. **特质矩阵与性格冲突（Traits & Conflict Matrix）**
12. **誓愿、缺陷与信念系统（Vows, Flaws & Convictions）**
13. **公会联赛金字塔与王朝模拟（League, Wages & Patron Investors）**
14. **开发实用工具集使用说明（save_tool.js）**

---

## 1. 逆向分析概述与工程环境

- **游戏本体路径**: `D:\Program Files (x86)\Steam\steamapps\common\Dungeons & Dynasties`
- **底层架构**: Tauri v2 桌面跨平台壳层 + Windows WebView2 前端引擎 + Steamworks API (`steam_api64.dll`) 集成。
- **资源打包格式**:
  - PE 二进制 `Dungeons & Dynasties.exe` 在二进制偏移量 `0x721bcb` 处内嵌 Brotli 压缩包（约 9.1MB）。
  - 解压后展开为单文件前端 Bundle（37.9MB HTML/JavaScript），包含完整 React 18/19 运行时、Tone.js 音频合成引擎、Zustand 响应式全局状态树与全套国际化字典（27,500+ 条多语言词条）。

---

## 2. 存档系统与安全机制（DDZ1 编解码与防作弊校验）

### 2.1 存储位置与封包结构
- **存储路径**: `%APPDATA%\io.itch.brettlittle.dungeons-and-dynasties\saves\slot{N}.sav`
- **外层信封 (JSON Envelope)**:
  ```json
  {
    "v": 1,
    "writtenAt": 1773669145952,
    "data": "\u0001DDZ1:..."
  }
  ```

### 2.2 DDZ1 自定义压缩协议
`data` 字段使用前缀 `\x01DDZ1:`（或空格前缀 ` DDZ1:`）。其数据流由两层编码构成：
1. **15-Bit 紧凑字符编码**:
   - 头部 2 个字符声明原始 Deflate 流字节长度：
     $$\text{orig\_len} = (c[0] - 32) \mid ((c[1] - 32) \ll 15)$$
   - 每个字符承载 15 bit 有效数据（字符偏移基数 `0x20 = 32`），通过位移累加器打包为 8-bit 无符号字节流。
2. **Deflate / Zlib 压缩**:
   - 解包后的字节流通过标准 Zlib Inflate 解压为明文 JSON 字符串。

### 2.3 防作弊签名算法 (Save Signature)
游戏根状态包含 `sig` 字段：
```javascript
function computeSig(str) {
  let a = 2166136261, i = 16777619;
  for (let r = 0; r < str.length; r++) {
    const s = str.charCodeAt(r);
    a = Math.imul(a ^ s, 16777619) >>> 0;
    i = Math.imul(i + s, 2246822507) >>> 0;
  }
  return a.toString(36) + '.' + i.toString(36);
}
```
游戏加载时执行防作弊校验：
$$\text{sig} \neq \text{computeSig}(\text{JSON.stringify}(\text{guild}))$$
若不匹配，游戏将给公会打上 `tampered = true` 篡改标记，并限制 demo/天数推进。本工具集已完全攻克该签名算法，可实现无痕双向回写。

---

## 3. 英雄能力体系（FM 足球经理风格模型）

### 3.1 核心评价指标
- **Current Ability (CA)**: 当前综合能力点（1 ~ 200），决定当前战力总评。
- **Potential Ability (PA)**: 职业天花板上限点（1 ~ 200），决定英雄成长潜力。
- **Ability Stars & Potential Stars**: 界面展示的星级评价（0.5 ~ 5.0 星）。

### 3.2 30 维主属性划分
| 属性分类 | 对应属性项 |
| :--- | :--- |
| **物理/战斗技能** | `weaponSkill` (武器技能), `marksmanship` (箭术), `power` (威力), `spellcraft` (法术造诣), `armorUse` (防具运用), `parry` (招架), `evasion` (闪避), `criticalStrike` (暴击) |
| **心智/战术意识** | `composure` (沉着), `bravery` (勇敢), `decisions` (决断), `anticipation` (预判), `teamwork` (团队协作), `leadership` (领袖气质), `concentration` (专注), `aggression` (侵略性), `discipline` (纪律性), `resolve` (坚毅) |
| **基础身体机能** | `strength` (力量), `agility` (敏捷), `stamina` (耐力), `vitality` (体质), `speed` (速度), `reflexes` (反射) |
| **战斗职责特化** | `threat` (仇恨制造), `mitigation` (伤害减免), `healing` (治疗强化), `support` (辅助效能), `crowdControl` (控制能力), `positioning` (走位战术) |

### 3.3 隐藏属性 (Hidden Attributes)
不直接在面板显示，但在底层模拟中起到关键作用：
1. `consistency` (稳定性): 影响单场战斗发挥波动的概率。
2. `bigGame` (大场面发挥): 决赛、杯赛、生死战中的属性加成。
3. `pressure` (抗压能力): 处于濒死或残局时的应激抗性，$\ge 15$ 时在精神崩溃时能保持理智（Held）。
4. `deathProneness` (死亡倾向): 濒死判定中受致命伤的概率。
5. `loyalty` (忠诚度): 降薪续约意愿与抵御其他公会挖角（Poaching）的能力。
6. `adaptability` (适应性): 转会入队或战术位置变更后的磨合速度。
7. `dirtiness` (肮脏小动作): 竞技中的隐蔽犯规与攻击倾向。

---

## 4. 种族生命周期与衰老曲线

游戏根据种族设定了严格的生涯年龄区间与成长衰退规律：

| 种族 (Race) | 职业生涯区间 | 成长速率修饰 (growthMod) | 传授修饰 (teachingMod) | 衰退拐点 (fadeBand) |
| :--- | :--- | :--- | :--- | :--- |
| **Human (人类)** | 16 ~ 40 岁 | 1.08 | 1.00 | 0.65 |
| **Elf (精灵)** | 30 ~ 80 岁 | 0.95 | 1.15 | 0.82 |
| **Dwarf (矮人)** | 25 ~ 63 岁 | 0.95 | 1.45 | 0.76 |
| **Halfling (半身人)** | 20 ~ 56 岁 | 1.00 | 1.20 | 0.70 |
| **Half-Orc (半兽人)** | 14 ~ 36 岁 | 1.00 | 0.90 | 0.65 |
| **Tiefling (提夫林)** | 18 ~ 42 岁 | 1.00 | 1.00 | 0.65 |
| **Dragonborn (龙裔)** | 16 ~ 46 岁 | 1.00 | 1.30 | 0.64 |
| **Gnome (侏儒)** | 22 ~ 64 岁 | 0.95 | 1.40 | 0.80 |
| **Goliath (巨人裔)** | 16 ~ 36 岁 | 1.00 | 0.95 | 0.65 |
| **Aasimar (阿斯莫)** | 20 ~ 58 岁 | 1.00 | 1.50 | 0.76 |

### 生涯六阶段划分
根据生涯完成度 $P = \frac{\text{age} - \text{minAge}}{\text{maxAge} - \text{minAge}}$：
- **初出茅庐 (Greenhorn)**: $P < 0.10$
- **冉冉新星 (Rising)**: $0.10 \le P < 0.28$
- **黄金巅峰 (Prime)**: $0.28 \le P < 0.45$
- **成熟中坚 (Seasoned)**: $0.45 \le P < 0.65$
- **身经百战 (Veteran)**: $0.65 \le P < 0.85$（身体属性开始明显衰退，心智属性达到顶峰）
- **暮年老将 (Twilight)**: $P \ge 0.85$（退役或转为导师 Mentor / 驻城住民）

---

## 5. 职业体系与数值战斗公式

### 5.1 九大职业与三大核心职责

| 职责 | 职业 | 资源类型 | 生命修正 (hpMod) | 伤害修正 (damageMod) | 核心主/副属性 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tank** | **Guardian (护卫)** | 体力 (Stamina) | 1.70 | 0.70 | weaponSkill / armorUse |
| **Tank** | **Warden (守望者)** | 怒气 (Rage) | 1.70 | 0.85 | strength / power |
| **Tank** | **Paladin (圣武士)** | 法力 (Mana) | 1.65 | 0.80 | weaponSkill / spellcraft |
| **DPS** | **Blademaster (剑圣)** | 体力 (Stamina) | 1.30 | 1.50 | weaponSkill / power |
| **DPS** | **Arcanist (奥术师)** | 法力 (Mana) | 0.80 | 1.60 | spellcraft / power |
| **DPS** | **Ranger (游侠)** | 专注 (Focus) | 0.95 | 1.40 | marksmanship / speed |
| **Healer**| **Cleric (牧师)** | 法力 (Mana) | 0.95 | 0.60 | spellcraft / healing |
| **Healer**| **Druid (德鲁伊)** | 专注 (Focus) | 1.00 | 0.60 | spellcraft / support |
| **Healer**| **Bard (吟游诗人)** | 专注 (Focus) | 1.00 | 0.70 | weaponSkill / support |

### 5.2 核心派生公式

1. **生命值上限 (Max HP)**:
   $$\text{MaxHP} = \text{round}\Big((40 + \text{vitality} \times 6 + \text{strength} \times 1.5) \times \text{hpMod}\Big)$$
2. **普通攻击伤害 (Attack Damage)**:
   $$\text{BaseDamage} = \text{round}\Big((\text{Attr}_{\text{primary}} \times 0.72 + \text{Attr}_{\text{secondary}} \times 0.28) \times 1.1 \times \text{damageMod} \times \text{roleMod}\Big)$$
3. **攻击间隔秒数 (Attack Interval)**:
   $$\text{Interval} = \text{clamp}\Big((2.0 - \text{speed} \times 0.04) \times \big(1 - 0.02 \times (\text{decisions} - 10)\big),\; 0.7,\; 2.6\Big)$$
4. **暴击率与暴击伤害 (Crit Rate & Multiplier)**:
   $$\text{CritChance} = \text{clamp}(0.02 + \text{criticalStrike} \times 0.012,\; 0.02,\; 0.35)$$
   $$\text{CritDamage} = 1.5 + 0.5 \times \frac{\text{clamp}(\text{criticalStrike}, 1, 20) - 1}{19}$$
5. **伤害减免与吸收 (Mitigation & Soak)**:
   $$\text{PercentMitigation} = 0.6 \times \text{mitigation}$$
   $$\text{FlatSoak} = \text{mitigation} \times 0.4 \times 20$$
6. **仇恨机制 (Threat Multiplier)**:
   $$\text{EffectiveThreat} = \text{RoleThreat}[\text{role}] \times (1 + \text{threat} \times 0.06)$$
   *(Tank 基础仇恨为 4.5，DPS 为 1.0，Healer 为 0.55)*
7. **团队协作效应 (Teamwork Cohesion)**:
   $$\text{Cohesion} = \text{clamp}(1 + 0.01 \times (\text{AvgTeamwork} - 10),\; 0.85,\; 1.15)$$

---

## 6. 战术指令引擎（Gambit 自动化战术系统）

战斗以 60 FPS 连续时间步进行，每位英雄根据自定义指令优先级从上到下检索条件并执行：

### 6.1 目标选择器 (Target Selectors)
- **友方**: `self` (自身), `lowestAlly` (生命百分比最低队友), `frailestAlly` (最脆皮队友)。
- **敌方位置**: `nearestEnemy` (最近敌人), `farthestEnemy` (最远敌人), `rangedEnemy` (远程敌人), `backlineEnemy` (后排脆皮), `meleeEnemy` (近战敌人)。
- **敌方状态**: `lowestEnemy` (残血斩杀目标), `highestEnemy` (最强敌人), `priorityEnemy` (高危首要目标), `supportEnemy` (敌方治疗/辅助), `clusteredEnemy` (密集区 AoE 目标)。
- **仇恨战术**: `allyAttacker` (正在攻击队友的敌人 - 坦克保护), `myAttacker` (攻击自身的敌人), `focusedEnemy` (全队集火目标)。

### 6.2 触发条件 (Trigger Conditions)
`always`, `allyHpBelow(X%)`, `selfHpBelow(X%)`, `selfHpAbove(X%)`, `targetHpBelow(X%)`, `targetHpAbove(X%)`, `abilityReady`, `allyDowned`, `alliesHurt(N)`, `outnumbered`, `fightOpening(前12秒)`, `fightLate`, `enemyWithin(距离)`.

---

## 7. 地牢探索与程序化生成逻辑

- **危险等级 (Danger Level)**: 1 到 9 级，对应怪物属性倍率与掉落装等。
- **房间类型生成**:
  - `combat`: 常规战斗。
  - `hazard`: 机关陷阱，考验队员的敏捷、反射与专注判定。
  - `puzzle`: 解密房间，考验决断、法术与智商。
  - `rest`: 扎营篝火房间（Camp）。
  - `treasure`: 宝箱房。
  - `boss`: 最终层首领。

---

## 8. 扎营修整系统（Camp Rest Engine）

在探索遭遇扎营点时，队伍可分工执行职能：
- **医护管事 (Tender)**: 指定一名治疗者负责治疗全队，队友生命恢复效率提高至 1.8 倍。
- **警戒哨兵 (Sentry)**: 指定一名队员守夜，守夜者自身恢复减半，但使队伍全员压力减退效率翻倍（从 7 点降压跃升至 14 点）。
- **数值恢复结算公式**:
  $$\Delta\text{HP} = \text{round}(\text{maxHP} \times 0.25 \times \text{Mod})$$
  $$\Delta\text{Resource} = \text{round}(\text{maxResource} \times 0.6 \times \text{Mod} \times (\text{isTender} ? 0.5 : 1.0))$$
  $$\Delta\text{Stress} = -7 \times (\text{hasSentry} \;\&\&\; \text{!isSentry} ? 2 : 1)$$

---

## 9. 心能压力与崩溃系统（The Break: 折磨与决断）

当英雄在战斗中累积压力到达极限阈值（$\text{Stress} \ge 100$）时，将触发心能崩溃判定 `w_e(hero)`：

1. **坚守抗压 (Held)**:
   - **触发条件**: 隐藏属性 $\text{pressure} \ge 15$。
   - **效果**: 英雄顶住绝望，保持 100% 战力，不产生负面行为。
2. **狂暴鲁莽 (Reckless)**:
   - **触发条件**: $\text{aggression} \ge \text{bravery}$。
   - **效果**: 伤害提高 +12%，但放弃防御，仇恨混乱，易被敌方集火。
3. **虚无绝望 (Hollow)**:
   - **触发条件**: $\text{resolve} \le 8$。
   - **效果**: 伤害与治疗效率双降 12%，拒绝受控。
4. **恐慌溃逃 (Fearful)**:
   - **触发条件**: 默认状态。
   - **效果**: 伤害下降 12%，退居后排，走位退缩。

---

## 10. 伤痕、创伤与持久损伤（Injuries & Trauma）

战斗失利或承受过量单体打击时将产生创伤：
- **轻微伤痛 (Minor Injuries, 权重 2~6, 愈合周期 3~12 天)**:
  - 腕部扭伤 (Sprained Wrist)、肋骨挫伤 (Bruised Ribs)、脚踝扭伤 (Twisted Ankle)、额头裂口 (Gashed Brow)、轻度脑震荡 (Concussion)、指节骨裂 (Cracked Knuckles)、背部扭伤 (Wrenched Back)、手部灼伤 (Scorched Hands)、嘴唇破裂 (Split Lip)、腿筋拉伤 (Pulled Hamstring)、耳鸣 (Ringing Ears)、冻伤手指 (Frostnipped Fingers)、咬伤前臂 (Bitten Forearm)。
- **重度致残伤 (Severe / Grave Injuries, `grave: true`, 权重 1, 愈合周期 7~38 天)**:
  - 深度撕裂伤 (Deep Laceration)、重度烧伤 (Severe Burns)、肩膀脱臼 (Dislocated Shoulder)、肋骨折断 (Broken Ribs)、手掌粉碎 (Shattered Hand)、腿骨骨折 (Broken Leg)、颅骨破裂 (Cracked Skull)。
- **伤势恶化机制**: 带伤出战的英雄在后续地下城中受到攻击时，有概率发生 `worsened: true`，转变为长期伤残甚至导致永久属性衰退。

---

## 11. 特质矩阵与性格冲突（Traits System）

游戏包含 **111 种独立特质**。特质引擎内置冲突互斥矩阵 `CFe`：
- `[brave, cowardly]`: 勇敢 vs 怯懦
- `[humble, arrogant]`: 谦逊 vs 傲慢
- `[professional, reckless]`: 敬业 vs 鲁莽
- `[team-player, lone-wolf]`: 团队至上 vs 独行孤狼

### 典型地下城机制特质
- **幽闭恐惧症 (`claustrophobic`)**: 进入地下城第 5 个房间后，每穿过一个房间增加 3 点压力。
- **寻路者 (`pathfinder`)**: 探索扫荡产出稀有遗物的概率翻倍至 25%，增加 5% 远征准备度。
- **嗜血成性 (`blood-drunk`)**: 残血时攻击力最高飙升 +50%，免疫士气溃散。
- **晨起好手 (`early-riser`)**: 扎营与休整时疲劳削减速度提高 25%。

---

## 12. 誓愿、缺陷与信念系统

1. **55 种信念 (Convictions)**: 例如 `the-shield` (盾牌守护者)、`no-one-left` (决不放弃队友)、`mercy-first` (宽容慈悲)、`old-ways` (旧日古法)。信念决定英雄在特定事件中的选择偏好与人际羁绊（Bonds）。
2. **54 种个人缺陷 (Flaws)**: 例如 `pride` (傲慢)、`greed` (贪婪)、`unlocked-door` (疏忽大意)、`old-guilt` (昔日负疚)、`the-bottle` (沉迷杯中物)、`short-fuse` (脾气暴躁)、`haunted` (怨魂缠身)。缺陷会在重大危机或压力超标时触发负面剧情事件。
3. **39 种生涯誓愿 (Vows)**: 包含血脉誓约、宿敌斩杀、丰碑建立等，完成誓愿可解锁永久美德（Virtues）与属性突破。

---

## 13. 公会联赛金字塔与王朝模拟

- **六级联赛金字塔 (Tier 1 ~ Tier 6)**:
  - 每赛季 11 轮联赛循环积分赛 + 冠军淘汰杯赛（Cup Bracket）。
  - 升降级机制：联赛排头晋升，垫底降级。
- **薪资与合同制 (Wages & Oaths)**:
  - 每位英雄拥有每周誓约薪水 `oathWage`、剩余周数 `oathLeft`、签约时实力水平 `oathCa`。
  - 英雄声望随 CA 提升，续约时会索要更高周薪。
- **迷雾球探体系 (Scouting Fog of War)**:
  - 自由转会市场与选秀中，球员的属性与 PA 受公会球探等级遮蔽（表现为星级区间预测，而非精准数值）。
- **赞助人门阀财团 (Patron Investors)**:
  - 赞助商门阀（武德门阀、奥术门阀、贸易门阀等）提供资金支持，但附带严苛的年度任期目标（Mandates）：声望指标、净利润指标、零阵亡要求。
  - 赞助人信任度（Patron Confidence, 0~100%）过低将触发公会清算与解职。

---

## 14. 实用存档工具集说明（save_tool.js）

为方便快速验证、修改与调试游戏数据，已在工作区提供全自动编解码与签名工具 `save_tool.js`：

### 核心命令
```bash
# 1. 查看指定存档（默认 Slot 1）的公会概况与队员数据
node save_tool.js view 1

# 2. 导出解密 JSON 明文
node save_tool.js export 1 decrypted_slot1.json

# 3. 将修改后的 JSON 文件加密并回写存档（自动生成备份并重算 sig）
node save_tool.js import 1 decrypted_slot1.json

# 4. 一键修改公会金币
node save_tool.js modify-gold 1 999999

# 5. 一键修改英雄能力（CA 与 PA）
node save_tool.js modify-hero 1 乌尔苏拉 180 200

# 6. 一键全队恢复（清空压力、疲劳与一切伤病）
node save_tool.js heal-all 1
```
