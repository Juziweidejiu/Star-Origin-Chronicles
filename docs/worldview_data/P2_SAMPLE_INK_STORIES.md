# P2 `sampleInkStories.ts` 替换剧本（《百炼行》v2 终版）

> 保留原有 `squad_stress`、`gold_gained`、`morale` 三个 Ink 全局变量以兼容 `InkStoryRunner.tsx` 的双向同步逻辑；全文严格零颜色字、零冷热词、零网文套路词。

```
export interface SampleInkStory {
  id: string;
  title: string;
  summary: string;
  inkSource: string;
}

export const SAMPLE_INK_STORIES: SampleInkStory[] = [
  {
    id: 'west_pass_ledger',
    title: '西关旧垒的残册',
    summary: '三十年前前朝撤防留下的旧值房里，压着半本兵器图谱与发条木甲的暗门。',
    inkSource: `VAR squad_stress = 0
VAR gold_gained = 0
VAR morale = 0

-> entry

=== entry ===
西关旧垒北门内侧的石砌值房半塌着，门框上的铁环早锈死了。
桌上压着半本抄录兵器锻法的旧册子，旁边还放着一面刻了番号的铜腰牌。
走廊尽头突然传来“咔哒、咔哒”的木齿轮咬合声——有发条木甲卫正往这边巡哨。

* [先抓起桌上的兵器图谱残页再说]
    ~ gold_gained += 95
    ~ squad_stress += 6
    你一把抄起旧册子塞进怀里，刚转身，木门外就撞进来一具半人高的发条木甲卫。
    石铁山举盾硬架住它第一记铁棍，你们趁机从破窗翻了出去。虽然惊出一身汗，但残页到手了。
    -> wrap_up

* [让冯阿七先去门后拆掉警铃拉线]
    ~ morale += 6
    ~ squad_stress -= 4
    冯阿七摸到门框边，两指一捏就把连着铜铃的细铁丝剪断了。
    你们屏住气等木甲卫走过走廊，再从容把桌上的铜腰牌和残页一并收好。
    -> wrap_up

* [只收起阵亡边军的铜腰牌，不贪旧册子]
    ~ morale += 10
    ~ gold_gained += 45
    你把铜腰牌擦干净收进包里，打算回望山堡交给巡检司备案。
    队伍里的老兵们没说话，但一路上走得比先前更稳当了。
    -> wrap_up

=== wrap_up ===
出了旧垒石门，风声在关墙豁口处呼呼作响。大家各自检查了一遍刀鞘与箭袋，继续往下一段路走去。
-> END
`,
  },
  {
    id: 'collapsed_mine_cart',
    title: '塌方老矿的货车',
    summary: '矿场集的运铁车翻在二号坑道口，尖耳山魈正拿着铁镐撬锁。',
    inkSource: `VAR squad_stress = 0
VAR gold_gained = 0
VAR morale = 0

-> mine_gate

=== mine_gate ===
塌方老矿二号坑道口横着一辆翻倒的木轮矿车，麻袋裂了个口子，滚出七八块生铁锭。
三只尖耳山魈蹲在车辕旁，正拿捡来的短铁镐使劲撬箱锁。
斜下方积水洼里时不时冒出一串浊泡——那是井下胶妖聚在暗沟里的动静。

* [趁山魈低头撬锁，从侧翼绕过去抢铁锭]
    ~ gold_gained += 80
    ~ squad_stress += 5
    陈砚和徐阿秋一左一右贴着岩壁摸过去，短兵交接只用了十几个呼吸。
    山魈丢下铁镐往深处逃窜，你们扛起最沉的两袋生铁锭和一包精煤迅速撤出坑道。
    -> mine_exit

* [用石子敲响铁轨，把山魈引向水洼]
    ~ morale += 8
    ~ squad_stress -= 6
    ~ gold_gained += 60
    唐远捡起半块矿石朝水洼边的铁轨弹去，“当”的一声在坑道里来回回荡。
    尖耳山魈提着镐子冲过去探头，正好惊动了水里的胶妖，两拨东西顿时滚作一团。
    你们不费一箭，顺手把矿车上的精煤和碎铁料收拾干净。
    -> mine_exit

* [扶起随行的矿场集学徒，先保人再搬货]
    ~ morale += 12
    ~ gold_gained += 40
    你们先替摔伤脚踝的学徒包扎好，扶着他退出险地，再由石铁山断后拖出半袋铁料。
    学徒再三道谢，说回矿场集后一定把这笔救命钱记在行会账上。
    -> mine_exit

=== mine_exit ===
回到洞外平地，阳光照在沾满矿尘的护腕上，总算能喘口匀气。
-> END
`,
  },
];

```