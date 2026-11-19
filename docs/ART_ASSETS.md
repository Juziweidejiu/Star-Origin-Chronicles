# 《星原战纪》美术资源生成说明书

> 用途：把这份文档直接喂给网页版 AI 生图（Google 图片生成 / Nano Banana、即梦、Midjourney 等），按批次产出图片。
> 目标：**生成即用**——文件名与游戏内资源路径一一对应，丢进 `mobile-pwa/public/art/` 就生效，不需要改代码。
>
> 版本：v1 · 对应 `SAVE_VERSION 1` / M37 之后
> 维护：新增图纸、职业、生态时，先在这里补一行，再交给生图。

---

## 0. 怎么用这份文档（三步）

1. **先粘「通用风格后缀」**（见 §1.3），它保证 70 张图看起来是同一套。
2. **再粘单个条目的提示词**（§4 起，每条都有中英双版本，任选其一）。
3. **生成后按 §2 的规格裁剪 / 压缩 / 命名**，放进对应目录，刷新页面即可看到。

> 生图工具通常一次出一张。批量时建议按「同批次 × 同一后缀」连发，风格最稳。

---

## 1. 风格总纲（Style Bible）

### 1.1 一句话定调

**纸上手绘的东方奇幻佣兵团手账**：细墨线勾边 + 水彩淡彩晕染 + 黄铜与酒红点缀，米黄纸底，安静、耐看、有年代感。

不是：厚涂写实、3D 渲染、霓虹赛博、暗黑血腥、欧美卡牌高饱和。

### 1.2 色板（必须遵守，取自 `mobile-pwa/src/index.css`）

| 名称 | 色值 | 用在哪 |
| --- | --- | --- |
| 纸底 paper | `#EFE3C8` | 背景、留白、纸纹 |
| 更深纸 sunken | `#E3D3B0` | 页眉、压暗区 |
| 亮纸 raised | `#F7EFDD` | 卡片、高光面 |
| 墨 ink | `#2A2418` | 线稿主色（**不要纯黑**） |
| 墨灰 ink-2 | `#5C513C` | 次级线条 |
| 墨淡 ink-3 | `#8A7B5F` | 远景、纹理 |
| 黄铜 brass | `#D9A45B` | 金属、边框、光 |
| 深铜 brass-deep | `#A9793A` | 黄铜阴影 |
| 酒红 wine | `#8A3B32` | 危险、敌方、印章 |
| 城镇 town | `#E8A44A` | 暖光、火光 |
| 地牢 dungeon | `#5CC8FF` | 冷光、矿脉、魔法 |
| 战斗 combat | `#E4573D` | 伤害、警示 |
| 成功 success | `#6FBF8B` | 治疗、生机 |
| 奥术 arcane | `#9B7BD4` | 法术、灵体 |

**品阶色**（用于图纸外圈与角标，务必一致）：

| 品阶 | 色值 |
| --- | --- |
| T1 学徒 | `#7A6C55` |
| T2 匠作 | `#3F7E6B` |
| T3 名匠 | `#6B4E9E` |
| T4 大师 | `#B4632A` |
| T5 传说 | `#A9761F` |

### 1.3 通用风格后缀（每条提示词后面都粘这段）

**中文版**

```
东亚奇幻手绘插画，纸本水彩淡彩配细墨线勾边，米黄纸底（#EFE3C8），
墨色为深褐而非纯黑，黄铜（#D9A45B）与酒红（#8A3B32）作点缀，
柔和的暖侧光，干净的剪影轮廓，主体居中，四周留白 8%，
无文字、无水印、无边框、无签名，纯透明背景
```

**English**

```
East-Asian fantasy illustration, fine ink line art over light watercolor wash,
warm parchment background (#EFE3C8), ink in dark brown not pure black,
brass (#D9A45B) and wine red (#8A3B32) accents, soft warm side light,
clean readable silhouette, subject centered, 8% margin,
no text, no watermark, no frame, no signature, transparent background
```

**负面词（Negative，所有条目通用）**

```
写实照片, 3D 渲染, 塑料质感, 高光过曝, 霓虹, 赛博朋克, 科幻机甲,
欧美卡牌厚涂, 血腥, 恐怖脸, 多余手指, 畸形肢体, 文字, 水印, 边框, 签名,
过饱和, 纯黑描边, 复杂背景杂物
```

### 1.4 构图与可读性铁律

- **缩到 48px 还能认出来**：图标类不要细节堆叠，靠剪影和主色区分。
- **主体不贴边**：四周留白 ≥ 8%，方便圆角裁切。
- **背景透明**：除场景图（§7）以外全部透明底。
- **不要画文字**：所有文字由界面渲染，图里出现字会重影。

---

## 2. 技术规格

| 类别 | 输出格式 | 画布尺寸 | 建议导出 | 目录 |
| --- | --- | --- | --- | --- |
| 图纸卡面 | PNG 透明 → 转 WebP | 512×512 | 512×512，≤ 60 KB | `public/art/items/` |
| 英雄立绘（半身） | PNG 透明 → WebP | 768×1024 | 竖构图，≤ 120 KB | `public/art/heroes/` |
| 敌人立绘（半身） | PNG 透明 → WebP | 512×512 | ≤ 80 KB | `public/art/enemies/` |
| 城镇横幅 | WebP / JPG | 1200×520 | ≤ 180 KB | `public/art/towns/` |
| 地牢场景底图 | WebP / JPG | 1000×520 | ≤ 160 KB | `public/art/stages/` |
| NPC 头像 | PNG 透明 → WebP | 512×512 | ≤ 70 KB | `public/art/npc/` |
| 材料图标 | SVG 优先，否则 PNG | 128×128 | ≤ 20 KB | `public/art/materials/` |

> 应用是 PWA，首屏资源越小越好。**WebP 质量 82 足够**，透明图注意保留 alpha。
> 如果生图工具只能出 JPG，透明类条目请先用在线去背，再导出 PNG。

### 2.1 命名规则（**必须完全一致，代码按文件名取图**）

```
public/art/items/{blueprintId}.webp       例：bp_steel_sword.webp
public/art/heroes/{classId}_{gender}.webp 例：blademaster_male.webp
public/art/heroes/{heroName}.webp         例：沈云舒.webp（可选，专属立绘）
public/art/enemies/{contract}_{role}.webp 例：goblin_mine_dps.webp
public/art/towns/{townId}.webp            例：ambermill_town.webp
public/art/stages/{theme}.webp            例：catacomb.webp
public/art/npc/{npcId}.webp               例：blacksmith.webp
public/art/materials/{materialId}.webp    例：iron.webp
```

现有 12 张图纸占位是 `.svg`（`public/art/items/bp_*.svg`），**新图直接覆盖同名 `.svg` 或删掉 svg 放 `.webp` 均可**（代码先试 `.webp`，失败回落 `.svg`，再失败回落到职业图标）。

---

## 3. 清单总览

| 批次 | 类别 | 数量 | 优先级 | 现状 |
| --- | --- | --- | --- | --- |
| A | 图纸卡面 | 12 | **P0** | 已有 SVG 占位，可直接替换 |
| B | 英雄立绘（职业×性别） | 18 | **P0** | 未接入（接口已定） |
| C | 敌人立绘（生态×职能） | 24 | P1 | 未接入 |
| D | 城镇横幅 | 4 | P1 | 未接入 |
| E | 地牢场景底图 | 6 | P2 | 未接入 |
| F | NPC 头像 | 6 | P1 | 未接入 |
| G | 材料图标 | 7 | P2 | 现在用线性图标 |
| H | 名将专属立绘（可选） | 10 | P2 | 未接入 |

**合计 77 张，其中 P0 只有 30 张**（A 12 + B 18）。先把 P0 做完，游戏观感就会明显不一样。

---

## 4. 批次 A：图纸卡面（12 张，P0）

**统一约束**：512×512 透明底，单件器物居中，略微俯视 3/4 角度，器物本身占画面 72%，底部有淡淡的椭圆投影（不透明度 10%），外圈画一圈**虚线细环**（半径 46/64，用该图纸品阶色，不透明度 35%）。**不要画人物、不要画背景场景。**

| # | 文件 | 名称 / 品阶 | 画面要点 | English prompt |
| --- | --- | --- | --- | --- |
| 1 | `bp_steel_sword` | 精钢长剑 · T2 匠作 | 三尺直剑，笔直双刃，黄铜护手与圆盘剑首，剑身有细微锻打纹 | a straight double-edged jian longsword, brass crossguard and round pommel, subtle hammered pattern on the blade |
| 2 | `bp_breach_halberd` | 破阵大戟 · T3 名匠 | 长柄重戟，月牙戟头 + 破甲尖，木柄缠麻绳 | a heavy halberd with crescent axe head and armor-piercing spike, hemp-wrapped wooden shaft |
| 3 | `bp_wood_staff` | 青木法杖 · T2 匠作 | 老杉木杖，顶端缠绕青藤并嵌一颗浅青玉石 | a gnarled ash-wood staff, green vine wraps the top around a pale jade stone |
| 4 | `bp_short_bow` | 精铁短弓 · T2 匠作 | 反曲短弓，牛角与钢片复合，配一壶箭 | a short recurve bow of horn and steel laminate with a quiver of arrows |
| 5 | `bp_chainmail` | 锁子甲 · T2 匠作 | 摊平的锁甲背心，铁环细密，领口皮边 | a flat-laid chainmail vest, dense iron rings, leather-trimmed collar |
| 6 | `bp_heavy_plate` | 坚木重铠 · T4 大师 | 硬木与铁片层压的胸甲，肩甲厚重，铆钉清晰 | a lamellar cuirass of hardened wood and iron plates, heavy pauldrons, visible rivets |
| 7 | `bp_weave_robe` | 编织法袍 · T3 名匠 | 叠放的长袍，靛青麻布，领口与袖口绣银线云纹，腰间玉扣 | a folded indigo hemp robe, silver cloud embroidery at collar and cuffs, jade belt clasp |
| 8 | `bp_ranger_leather` | 巡林皮甲 · T1 学徒 | 轻便皮甲背心，粗缝线，肩部有磨损痕迹 | a light leather jerkin with coarse stitching and scuffed shoulders |
| 9 | `bp_wolf_pendant` | 狼牙吊坠 · T3 名匠 | 皮绳串起的狼牙，牙根包铜，旁边两颗小骨珠 | a wolf fang pendant on a leather cord, brass-capped root, two small bone beads |
| 10 | `bp_jade_pendant` | 翡翠玉佩 · T4 大师 | 圆形翡翠玉璧，雕螭龙纹，系红绳流苏 | a round jade bi disc carved with a coiled dragon, red cord tassel |
| 11 | `bp_star_ring` | 星辉指环 · T4 大师 | 银环镶一颗深蓝星芒石，环身刻细密星图 | a silver ring set with a deep-blue star sapphire, engraved star chart on the band |
| 12 | `bp_bronze_amulet` | 青铜护符 · T1 学徒 | 方形青铜小牌，铸简单云雷纹，边角磨圆 | a small square bronze amulet with simple cloud-thunder motif, worn rounded edges |

**提示词模板（直接替换方括号）**

```
一张游戏物品图标：[画面要点]。单件器物居中，3/4 俯视，器物占画面 72%，
底部淡淡椭圆投影，外圈[品阶色]虚线细环。
[通用风格后缀]
```

> 已有 12 张手绘 SVG 可直接用作品位参考；AI 图按同一构图替换即可。

---

## 5. 批次 B：英雄立绘（18 张，P0）

### 5.1 为什么要「职业 × 性别」而不是「每人一张」

游戏里的英雄是随机生成的（随机姓名、随机属性），只有 10 个预设人设会被随机选中。所以立绘按 **职业 + 性别** 取图最稳：

```
public/art/heroes/{classId}_{gender}.webp
例：guardian_male.webp / arcanist_female.webp
```

任何随机生成的英雄都能落到一张合适的图上。10 位名将的专属立绘（批次 H）作为可选增强。

### 5.2 通用构图

- 竖构图 768×1024，**半身像（腰以上）**，人物略偏右，视线朝画面左前方。
- 东亚面孔，20–30 岁，英气、健康、不妖艳、不卖肉。
- 服装是**实用冒险装**：布、皮、轻甲、绑腿，有磨损与使用痕迹。
- 手持标志性武器（武器要完整入画，不要被裁掉）。
- 透明背景，人物外轮廓一圈 2px 暖色描边（避免贴到纸底上发灰）。

**统一后缀追加**：`半身像，人物占画面 78%，视线朝左前方，服装有使用痕迹，透明背景`

### 5.3 逐张提示词

| # | 文件 | 职业 / 定位 | 画面要点 | English prompt |
| --- | --- | --- | --- | --- |
| 1 | `guardian_male` | 护卫 · 前锋 | 三十岁沉稳汉子，重札甲+大盾+单手钉锤，胡茬，肩宽体壮 | a steady man in his thirties, heavy lamellar armor, large round shield and a spiked mace, stubble, broad shoulders |
| 2 | `guardian_female` | 护卫 · 前锋 | 高个女武士，板甲裙+鸢盾，短发束带，表情冷静 | a tall female warrior in plated skirt armor with a kite shield, short tied hair, calm expression |
| 3 | `warden_male` | 守望 · 前锋 | 山林守望者，皮甲+双手长斧，披狼皮斗篷，脸上有旧疤 | a woodland warden in leather armor with a two-handed axe, wolf-pelt cloak, old scar |
| 4 | `warden_female` | 守望 · 前锋 | 女猎手装束，长斧斜背，腰间挂号角与绳钩 | a huntress with a long axe slung on her back, horn and grapnel at her belt |
| 5 | `paladin_male` | 圣武 · 前锋 | 银白半甲+圣徽胸挂+长柄锤，短须，神色平和 | a man in silver half-plate with a holy sigil pendant and a long-hafted hammer, short beard, serene |
| 6 | `paladin_female` | 圣武 · 前锋 | 白袍外罩胸甲，手持祝福长枪，发髻利落 | a woman in a white robe over a breastplate, holding a blessed spear, neat bun |
| 7 | `blademaster_male` | 剑圣 · 输出 | 轻装直剑士，交领短打+护腕，剑锋斜指，衣角带风 | a light-armored swordsman in a crossed-collar tunic and bracers, blade angled down, hem in motion |
| 8 | `blademaster_female` | 剑圣 · 输出 | 黑长直束发女刀客，双手横刀，眼神锐利 | a female swordmaster with long black hair tied back, two-handed saber, sharp gaze |
| 9 | `arcanist_male` | 奥术 · 输出 | 青灰长袍+铜制浑天仪手炉，指尖有蓝紫微光 | a man in blue-grey robes holding a brass armillary censer, faint violet light at his fingertips |
| 10 | `arcanist_female` | 奥术 · 输出 | 深蓝学者袍，悬浮符纸环绕，单片铜镜 | a female scholar in deep-blue robes, floating paper talismans circling her, a brass monocle |
| 11 | `ranger_male` | 游侠 · 输出 | 猎户青年，反曲弓半拉，皮护臂，箭袋在腰后 | a young hunter drawing a recurve bow halfway, leather bracer, quiver at the hip |
| 12 | `ranger_female` | 游侠 · 输出 | 短发女斥候，短弓+飞爪绳，轻便斗篷 | a short-haired female scout with a short bow, grapnel rope, light cloak |
| 13 | `cleric_male` | 牧师 · 医官 | 素色长袍+药囊+银针盒，手持经卷 | a man in plain robes with a medicine satchel and silver needle case, holding a scroll |
| 14 | `cleric_female` | 牧师 · 医官 | 青衫女医，金针囊与缠手布，温而不弱 | a female physician in blue-green robes, gold needle case, wrapped hands |
| 15 | `druid_male` | 德鲁伊 · 医官 | 藤甲+草药束+木杖，肩头停一只小鸟 | a man in vine-woven armor with herb bundles and a wooden staff, a small bird on his shoulder |
| 16 | `druid_female` | 德鲁伊 · 医官 | 苔绿斗篷，鹿角木杖，赤足绑腿 | a woman in a moss-green cloak with an antler-topped staff, bare feet with leg wraps |
| 17 | `bard_male` | 乐师 · 医官 | 便携古琴/短笛，靛青外袍绣云纹，腰间酒壶 | a man with a portable zither and short flute, indigo robe with cloud embroidery, wine flask at his belt |
| 18 | `bard_female` | 乐师 · 医官 | 怀抱琵琶，红绳束发，笑意明亮 | a woman holding a pipa lute, hair tied with red cord, bright smile |

**提示词模板**

```
一位东亚奇幻冒险者的半身像：[画面要点]。
[通用风格后缀]
```

> 18 张建议一次连续生成，保持同一支笔的质感。生成后统一裁成 768×1024，人物底部切在腰线。

---

## 6. 批次 C：敌人立绘（24 张，P1）

### 6.1 命名按「生态 × 职能」

```
public/art/enemies/{contract}_{role}.webp
contract: slime_infestation | goblin_mine | bandit_camp | beast_hunt | caravan_escort | ruins_cleansing
role:     tank | dps | healer | boss
```

战斗里敌人只显示小尺寸单位（约 40–56px），**剪影和主色比细节重要**。每个生态固定一套主色调：

| 生态 | 中文 | 主色 | 氛围 |
| --- | --- | --- | --- |
| `slime_infestation` | 史莱姆泛滥 | 草莓红 + 半透明青绿 | 果园、水渠、黏滑 |
| `goblin_mine` | 哥布林矿洞 | 赤褐 + 铜绿 | 矿道、火把、粗糙铁器 |
| `bandit_camp` | 山贼营寨 | 土黄 + 暗红 | 破布、皮甲、弯刀 |
| `beast_hunt` | 野兽狩猎 | 松绿 + 骨白 | 毛皮、獠牙、兽骨 |
| `caravan_escort` | 商队护卫（敌方为劫匪与野兽混编） | 灰蓝 + 土褐 | 夜路、斗篷、火把 |
| `ruins_cleansing` | 旧墟清剿 | 石灰 + 青苔 + 暗金 | 断墙、苔藓、旧甲 |

### 6.2 六生态 × 四职能的画面要点

| 生态 | tank | dps | healer | boss |
| --- | --- | --- | --- | --- |
| 史莱姆 | 石壳巨史莱姆，岩片嵌在胶质上 | 带刺酸液史莱姆，边缘滴落黏液 | 半透明核心史莱姆，内部有绿色光点 | 三层复合的史莱姆王，裹着铁壳与矿石 |
| 哥布林 | 赤耳大盾哥布林，木盾包铁 | 双刃哥布林，赤褐皮，獠牙 | 哥布林巫医，骨饰与药罐 | 哥布林矿主，铁盔+蒸汽钻机 |
| 山贼 | 寨门大盾手，杂色札甲 | 亡命刀客，蒙面，双刀 | 随军医手，背药箱 | 山贼头目，厚披风+斩马刀 |
| 野兽 | 厚皮枭熊，正面立起 | 双足飞龙，展翼俯冲 | 苔藓鹿，鹿角缠藤 | 巨熊/飞龙首领，体型 1.5 倍 |
| 劫匪 | 重甲截道者，塔盾 | 飞刀流寇，轻装疾行 | 驯鹰人，鹰停在臂上 | 商道匪首，双钩+锁甲 |
| 旧墟 | 发条重装步兵，锈蚀板甲 | 拟态宝箱怪，箱盖裂开露齿 | 苔藓祭祀，破袍+骨杖 | 食人魔，粗木棒+皮围裙 |

**提示词模板**

```
一个奇幻游戏敌人的半身立绘：[画面要点]，该生态主色为[主色]。
剪影清晰、缩到 48 像素仍可辨识，不要过多细节。
[通用风格后缀]
```

> Boss 单独追加：`体型比普通同类大 1.4 倍，甲片更厚，眼神更有威胁感，但保持同一画风`

---

## 7. 批次 D/E：场景

### 7.1 城镇横幅（4 张，P1）

`public/art/towns/{townId}.webp` · 1200×520 · **横向宽幅，左右两侧留出压暗区**（界面会在上面叠标题与按钮）。

| 文件 | 城镇 | 画面要点 |
| --- | --- | --- |
| `ambermill_town` | 麦浪与风车镇 | 金黄麦田、木风车、石砌面包房冒烟，清晨暖光 |
| `verdant_spring` | 翡翠泉与铃兰宿 | 山谷温泉、木回廊、晒草药的竹架、薄雾 |
| `hammerdeep_hold` | 黑铁与汽锤堡 | 山体内锻炉、红砖烟囱、蒸汽锻锤、铁水红光 |
| `tidesong_haven` | 潮鸣与灯塔港 | 石砌海堤、灯塔、停泊帆船、黄昏海雾 |

提示词模板：

```
一幅横向场景插画（无人物）：[画面要点]。
俯视微高机位，画面左右两侧略暗以衬托前景文字，中间留出开阔天空。
[通用风格后缀]（背景改为场景而非透明）
```

### 7.2 地牢场景底图（6 张，P2）

`public/art/stages/{theme}.webp` · 1000×520 · **低对比**（战斗单位要叠在上面，背景不能抢戏）。

| 文件 | 主题 | 画面要点 |
| --- | --- | --- |
| `catacomb` | 矿道与暗河 | 潮湿矿道、木支架、地下河反蓝光 |
| `ruins` | 关隘与旧墟 | 断裂城墙、塌陷箭楼、散落砖石 |
| `wilds` | 深林与猎场 | 高大针叶林、蕨类、斑驳阳光 |
| `crypt` | 覆雪古战场 | 雪覆残旗与断矛、灰白天空 |
| `forest` | 山丘与兽林 | 低矮灌木、兽径、远处山脊 |
| `citadel` | 堡垒与要塞 | 石砌内庭、火盆、铁闸门 |

> 这批可以用「远景 + 中景两层」的思路，前景留空给单位。

---

## 8. 批次 F：NPC 头像（6 张，P1）

`public/art/npc/{npcId}.webp` · 512×512 透明底 · 半身到胸像，正面略侧。

| 文件 | 角色 | 画面要点 |
| --- | --- | --- |
| `guild` | 公会登记员 | 中年文吏，袖套+账本+羽毛笔，眼镜链 |
| `tavern` | 酒馆掌柜 | 壮实妇人/汉子，围裙，手拿木酒杯 |
| `market` | 集市商人 | 精明小贩，肩搭布匹，腰间钱袋 |
| `infirmary` | 医务室医师 | 老年医者，药碾与绷带 |
| `blacksmith` | 铁匠铺老板 | 赤膊围皮裙的壮汉，单边护目镜，手持火钳 |
| `sanctuary` | 圣所祭司 | 素袍老者，手持引魂灯，眼神温和 |

---

## 9. 批次 G：材料图标（7 张，P2）

`public/art/materials/{materialId}.webp` · 128×128 透明底 · 单件静物，正俯视。

| 文件 | 材料 | 画面要点 |
| --- | --- | --- |
| `iron` | 精铁锭 | 两块叠放铁锭，锤痕 |
| `wood` | 老杉木 | 一截原木，年轮朝外 |
| `leather` | 硝制兽皮 | 卷起的皮革，粗绳捆扎 |
| `jade` | 珠玉 | 三颗大小不一的青玉原石 |
| `coal` | 精煤 | 几块带棱角的黑煤，微反光 |
| `oil` | 淬火油 | 小陶瓶，瓶口塞布 |
| `sand` | 星陨砂 | 皮袋倒出一小堆泛蓝光的砂 |

---

## 10. 批次 H：名将专属立绘（可选，10 张）

`public/art/heroes/{姓名}.webp`（中文文件名，如 `沈云舒.webp`）。命中姓名时优先于职业图。

| 姓名 | 称号 | 画面要点 |
| --- | --- | --- |
| 沈云舒 | 惊鸿剑 | 男，轻装直剑士，衣袂翻飞，剑随身走 |
| 陆曜 | 玄武之盾 | 男，重盾+钢锏，宽肩，沉稳 |
| 裴少陵 | 观星策士 | 男，铜制浑天手炉，目光锐利，腹黑笑意 |
| 秦渊 | 追影 | 男，双曲刃+飞爪，兜帽，身形低伏 |
| 顾平川 | 烈阳神射 | 男，重型反曲弓，阳光健朗，晒痕 |
| 楚清弦 | 破阵戟 | 女，亮银鱼鳞甲，六十斤方天戟，豪迈 |
| 季秋水 | 折月刀 | 女，黑长直，霜纹横刀，居合起手 |
| 温竹君 | 悬壶金针 | 女，青衫，金针囊，腕缠布 |
| 白苏 | 千机火器师 | 女，单边黄铜护目镜，三管重火铳，工坊少女 |
| 墨微凉 | 影缚使 | 女，黑钢锁链，符印微光，冷静锐利 |

---

## 11. 验收清单（每张图过一遍）

- [ ] 背景真的是透明的（不是白底、不是棋盘格截图）
- [ ] 缩到 48px 仍能认出是什么
- [ ] 主色落在 §1.2 色板里，没有荧光色
- [ ] 没有文字、水印、签名、边框
- [ ] 主体四周留白 ≥ 8%，没被裁切
- [ ] 线条是深褐墨色，不是纯黑
- [ ] 同一批次放在一起时，像同一个人画的
- [ ] 文件名与 §2.1 规则**逐字一致**（区分大小写、下划线）

---

## 12. 建议生成顺序

| 轮次 | 产出 | 预计张数 | 说明 |
| --- | --- | --- | --- |
| 第 1 轮 | 图纸卡面 12 张 | 12 | 已有占位可对比，最快看到效果 |
| 第 2 轮 | 英雄立绘 18 张 | 18 | 先做 4 个职业验证画风，再补剩余 |
| 第 3 轮 | NPC 6 + 城镇 4 | 10 | 界面「有人味」的关键 |
| 第 4 轮 | 敌人 24 + Boss | 24 | 先做 1 个生态（史莱姆）验证尺寸 |
| 第 5 轮 | 场景 6 + 材料 7 | 13 | 收尾 |

---

## 附：资源接入现状（给开发看）

| 类别 | 代码读取 | 说明 |
| --- | --- | --- |
| 图纸卡面 | ✅ 已接入 | `BlacksmithView.tsx` 的 `BlueprintArt`，先 `.webp` → `.svg` → 职业图标 |
| 材料图标 | ⬜ 待接入 | 现在 `MATERIALS` 用 lucide 线性图标 |
| 英雄立绘 | ✅ 已接入名册卡头像 | `heroArtSources(hero)`：先姓名专属图，再职业×性别，都没有则显示姓名末字 |
| 敌人立绘 | ⬜ 待接入 | 接口已定：`{contract}_{role}`；战斗单位目前是矢量小兵，建议先用在战斗结算 / 图鉴 |
| 城镇横幅 | ⬜ 待接入 | 在城镇页横幅卡背景处铺图 + 压暗遮罩 |
| 地牢场景 | ⬜ 待接入 | 与 `stageThemes` 的 6 个主题一一对应 |
| NPC | ⬜ 待接入 | 各建筑子页顶部头像位 |

> 所有未接入项都会走「取图失败回落现有图标/纯色」的逻辑，**图片没生成也不会崩**，可以边生成边上线。
