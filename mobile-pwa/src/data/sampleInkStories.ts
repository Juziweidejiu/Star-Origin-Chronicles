/**
 * 暗黑地牢 / 战场兄弟 风格 Ink 互动剧本集
 * 符合去网文味、去无谓血腥、强选择与严苛代价原则
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
    id: 'crypt_knight',
    title: '古墓无头骑士的信物',
    summary: '地宫深处的石棺前，一具无头重铠静坐不语。它的剑插入铁槽，锁链缠绕。',
    tags: ['古墓', '装备抉择', '诅咒与代价'],
    source: `
VAR squad_stress = 0
VAR gold_gained = 0
VAR got_relic = false

-> crypt_entrance

=== crypt_entrance ===
地宫空气刺骨，烛光被沉重的湿气压得发绿。
石阶尽头坐着一具生锈的板甲，头盔早已遗失，颈椎断口处塞着一枚铅封军牌。
一把破损的十字大剑深插于铁槽中，粗铁链锁死了剑锷。

+ [擦拭军牌，辨认纹章] -> read_plaque
+ [蛮力撬锁，强取十字剑] -> pry_sword
+ [默哀三秒，绕行离开] -> bypass

=== read_plaque ===
~ squad_stress = squad_stress + 5
你用匕首刮去军牌表面的绿锈。
上面刻着：“第三边防营，副官雷恩。粮断于寒冬，死战不退。”
这不是怪物，而是一百年前被遗忘在这里的殿后老兵。
石铠的手指突然轻微抽动，似乎察觉到了敬意。

+ [献上一份干粮作为祭品] -> offer_rations
+ [搜查老兵腰间的钱袋] -> steal_pouch

=== offer_rations ===
~ got_relic = true
~ squad_stress = squad_stress - 10
你将硬如石块的面包放在石棺前。
咔哒一声轻响。锁链自动滑脱，大剑上的锈斑仿佛淡去了三分。
你获得了【雷恩的誓约断剑】。
全队的呼吸沉静下来，内心的焦躁被这位老兵的忠勇抚平。
-> story_end

=== steal_pouch ===
~ gold_gained = 45
~ squad_stress = squad_stress + 20
你割下了干瘪的皮袋，里面滚出45枚黑斑银币。
就在你收起硬币的刹那，石铠的断颈处喷出冰冷刺骨的死灵寒气！
所有人的手腕上多了一道发青的勒痕。
“背信弃义者……夜夜不得安眠。”
-> story_end

=== pry_sword ===
~ squad_stress = squad_stress + 15
两位前锋合力用铁撬压住锁链，金属发出凄厉的哀鸣。
砰！铁链崩断，但断刃弹起划破了佣兵的皮甲。
剑刃虽入手，但剑身已被崩出缺口，凶戾的寒意顺着剑柄渗入骨髓。
-> story_end

=== bypass ===
“死人不需要被打扰，活人更不需要找麻烦。”
你示意全队贴着湿滑的墙根悄声走过。
虽然一无所获，但至少没有惊动地底的陈旧怨恨。
-> story_end

=== story_end ===
{ got_relic:
  队伍得到了英灵的祝福。
- else:
  { gold_gained > 0:
    口袋沉甸甸的，但每一步都伴随着隐隐的悔意与寒冷。
  - else:
    队伍继续在深渊中摸索前行。
  }
}
探索尘埃落定。
-> END
`
  },
  {
    id: 'gallows_crows',
    title: '绞架林与盲眼斥候',
    summary: '荒原十字路口，枯树上悬挂着三名逃兵。树下一位盲眼斥候正在烤着干瘪的乌鸦。',
    tags: ['荒野', '道德两难', '生存资源'],
    source: `
VAR rations = 3
VAR got_map = false
VAR team_morale = "平静"

-> crossroad

=== crossroad ===
寒风呼啸着卷过光秃秃的泥泞原野。
三具干瘪的逃兵尸体挂在枯柳树下，麻绳在风中吱呀作响。
树根旁坐着一个瞎了一只眼的流浪汉，正用树枝挑着剥了皮的乌鸦在余烬上烤。
听到脚步声，他拔出了腰间的生锈匕首。

“过路的佣兵？如果是来收尸领赏的，你们来晚了；如果是来买情报的，出价吧。”

+ [询问前方的地牢入口与巡逻路线] -> ask_intel
+ [用一份军用口粮换取他的善意] -> bribe_scout
+ [割断绞索，将死者就地掘土安葬] -> bury_deserters

=== ask_intel ===
斥候冷笑一声，吐出一口浓痰。
“白打听？老头子这双眼睛就是在黑森林被挖掉的。不给口吃的，你们进去也是给渡鸦当饲料。”
+ [递给他一份肉干] -> bribe_scout
+ [拔剑威胁他老实交代] -> intimidate

=== bribe_scout ===
~ rations = rations - 1
~ got_map = true
~ team_morale = "受鼓舞"
斥候狼吞虎咽地嚼着肉干，浑浊的眼眶湿润了。
他从靴筒里摸出一卷满是油渍的羊皮纸，扔在泥地上。
“这是巡逻队的换岗暗号和侧门通风道图纸。小心第三间墓室，那里有水银陷阱。”
你们获得关键情报：【黑森林侧门哨位图】。
-> conclusion

=== intimidate ===
~ team_morale = "压抑"
前锋的长剑搭在老头的肩膀上。
老人没有闪躲，反而发出嘶哑的怪笑：“动手吧。反正我也活不过这个冬天。”
逼问之下，他吐出了几句含糊不清的路线，但眼神中的怨毒让全队心头发毛。
你们不知道这份情报究竟是生路还是圈套。
-> conclusion

=== bury_deserters ===
~ team_morale = "悲悯而坚定"
你们放下武器，用铁锹在冻土上挖出三个浅坑。
将逃兵解下、合上眼睑、覆上泥土与石块。
瞎眼斥候默默看着这一幕，手中的枯枝停在了半空。
“在北方，已经很久没人把死人当人看了。”他低声嘟囔了一句，蹒跚着消失在芦苇荡深处。
虽然消耗了半天体力，但佣兵们眼中的疲惫与冷漠似乎消散了少许。
-> conclusion

=== conclusion ===
全队在暮色中重新整队。
当前士气：{team_morale}。
风声依旧凛冽，但脚步更加坚定。
-> END
`
  }
];
