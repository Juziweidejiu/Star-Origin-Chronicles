/**
 * 《星原战纪》东方二次元探险战记 Ink 互动剧本集
 * 
 * 核心基调：探险、生存、浪漫羁绊、对抗危机
 * 坚守铁律：
 * 1. 严格线性历史，杜绝“远古文明/超古代科技/失落神殿/青铜守卫”。
 * 2. 角色：男女参半，全员英姿飒爽、实力强劲（沈云舒、楚清弦、陆曜、季秋水等）。
 * 3. 拒绝压抑绝望与浮夸网文，强调战术协作、羁绊互信与开拓浪漫。
 */

export interface InkStoryMeta {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  source: string;
}

export const SAMPLE_INK_STORIES: InkStoryMeta[] = [
  {
    id: 'border_commander',
    title: '边塞残关老校尉的誓铁',
    summary: '三十年前沉陷的边防要塞武库前，一具覆甲的枯骨依靠在箭剁旁，腰挂残缺校尉铜牌，手握未出鞘的精锻直刀。',
    tags: ['前朝关隘', '战术抉择', '伙伴羁绊'],
    source: `
VAR squad_stress = 0
VAR gold_gained = 0
VAR got_blade = false

-> fort_entrance

=== fort_entrance ===
山谷风声呼啸，穿过断壁残垣发出如笛声般的呜咽。
沉陷的边关箭垛旁，坐着一位三十年前血战到底的前朝老校尉遗骸，甲胄虽锈，腰间横刀却保养在油布鞘中。
沈云舒握紧剑柄，楚清弦举戟警戒，陆曜已横盾护在队伍侧翼。

+ [沈云舒拂开尘灰，辨认腰牌] -> read_token
+ [楚清弦以巧劲挑开油布刀鞘] -> inspect_blade
+ [陆曜合掌致敬，引队绕行] -> bypass

=== read_token ===
~ squad_stress = squad_stress - 5
沈云舒蹲下身，轻轻擦去青铜腰牌上的灰尘。
上面工整刻着：“定边第三营校尉 陆天齐。死守栈道，绝不弃关。”
陆曜目光微动：“……是我祖父那一辈的定边军先锋。”
老校尉的遗蜕在风中显得沉稳肃穆，全队的士气为之一振。

+ [献上行军清酒以敬英灵] -> offer_wine
+ [搜寻老校尉遗留的行军地图] -> search_map

=== offer_wine ===
~ got_blade = true
~ squad_stress = squad_stress - 15
陆曜解下皮囊，将一口烈酒洒在砖石上。
“后辈佣兵陆曜，领小队借道巡防，愿老校尉英魂庇佑前路。”
微风吹拂，横刀上的油布自然滑脱，露出一柄淬钢横刀【定边寒芒】。
沈云舒赞道：“好一柄千锤百炼的实战好刀，今后定不负先烈之名。”
-> story_end

=== search_map ===
~ gold_gained = 60
~ squad_stress = squad_stress + 5
你们在护胸内衬中起出一张油纸绘制的【边塞暗河水文图】与半袋制钱。
图纸虽泛黄，但清晰标注了通往碧落湖的捷径，能免除数日荒野跋涉。
楚清弦点头：“带上它，尽快赶往听风关报信。”
-> story_end

=== inspect_blade ===
~ squad_stress = squad_stress + 10
楚清弦戟尖轻挑，刀鞘应声弹出三寸。
刹那间，机关内残存的干硫磺发烟筒被引燃，浓烈的呛人白烟散开！
陆曜大喝一声展开重盾封堵烟尘，沈云舒迅速斩断引绳。
烟雾散去，刀已入手，但全队防备落石耗费了不少体力。
-> story_end

=== bypass ===
“先烈为国捐躯，莫要扰其安宁。”
陆曜低头致敬，带领全队沿右侧马道悄无声息地穿过废墟。
虽然未取寸铁，但队伍心中踏实而从容。
-> story_end

=== story_end ===
{ got_blade:
  小队继承了老校尉的定边战刀，步伐愈发矫健沉稳。
- else:
  { gold_gained > 0:
    获得了关键水文图纸与盘缠，前路方向逐渐明朗。
  - else:
    队伍整理装备，继续踏上穿越边塞的征程。
  }
}
边塞探索告一段落。
-> END
`
  },
  {
    id: 'goblin_mine_ambush',
    title: '赤耳哥布林矿洞奇袭',
    summary: '赤耳矿洞深处，十余只手持短矛的哥布林正围着篝火分食偷猎的岩羊。',
    tags: ['哥布林矿洞', '战术突袭', '男女协同'],
    source: `
VAR gold_gained = 0
VAR rations = 4
VAR morale = "高昂"

-> ambush_prep

=== ambush_prep ===
矿洞狭长，岩壁滴水，前方火光摇曳。
十多只赤耳哥布林正叽里呱啦分食着烤岩羊，几口行商大木箱被堆在角落。
季秋水按住横刀低声道：“侧面风道很窄，我可以居合瞬杀两只哨兵。”
楚清弦横执大戟：“正面冲阵交给我，陆曜断后堵门。”
白苏则在调试折叠火铳的散弹针。

+ [由季秋水暗度风道突袭哨兵] -> stealth_assault
+ [楚清弦正面突进大戟破阵] -> frontal_charge
+ [白苏在洞口安置震天雷封堵伏击] -> trap_ambush

=== stealth_assault ===
~ gold_gained = 120
~ rations = rations + 2
季秋水身影如墨燕般穿过阴影，双刀如电光一闪，哨兵无声倒地。
楚清弦与沈云舒如猛虎下山般跟进，瞬息间击溃溃逃的群怪。
全队缴获了完整的烤羊腿两副，以及行商丢失的精铁矿石与整袋银两！
-> conclusion

=== frontal_charge ===
~ gold_gained = 80
~ morale = "亢奋"
楚清弦娇喝一声，六十斤方天画戟横扫千军，将洞口木栅栏砸得粉碎！
哥布林被这气吞山河的气势吓得魂飞魄散，抱头乱窜。
陆曜重盾压阵，轻松打扫战场，全队豪情万丈。
-> conclusion

=== trap_ambush ===
~ gold_gained = 150
~ rations = rations + 1
白苏手速飞快，在回廊处拉开三道淬火钢丝并埋入震天雷。
秦渊飞爪将引诱石块掷入火堆，受惊的哥布林涌向出口，被连环爆破震得丢盔弃甲。
战术大获全胜，无一人擦伤，辎重全数收缴。
-> conclusion

=== conclusion ===
战斗结束，伙伴们分工默契：
楚清弦擦拭戟尖，陆曜清点补给，温竹君检查全员状态，沈云舒升起温暖营火。
当前全队士气：{morale}。
朝阳即将洒满峡谷，新的冒险正在前方等待！
-> END
`
  }
];
