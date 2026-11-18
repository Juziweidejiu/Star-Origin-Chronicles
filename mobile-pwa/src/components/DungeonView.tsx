import React, { useState } from 'react';
import type { DungeonInstance, DungeonRoom, CampMealType, RoomType } from '../types/dungeon';
import type { Hero, Equipment } from '../types/hero';
import { describeBase } from '../engine/statResolver';
import type { DungeonEvent, ChoiceConsequence } from '../types/narrative';
import { executeQuickCampMeal } from '../engine/dungeonEngine';
import { DungeonEventModal } from './DungeonEventModal';
import { CLASS_CONFIG } from '../engine/heroFactory';
import { Card, Btn, Tag } from './ui';
import {
  Bomb,
  Check,
  Compass,
  Crown,
  Flame,
  Footprints,
  HelpCircle,
  Package,
  Swords,
} from 'lucide-react';

interface DungeonViewProps {
  dungeon: DungeonInstance;
  squad: Hero[];
  rations: number;
  onEnterBattle: (room: DungeonRoom) => void;
  onDisarmTrap: (room: DungeonRoom) => void;
  onOpenChest: (room: DungeonRoom) => void;
  onCampRest: (consumedRations: number, message: string, buff?: DungeonInstance['campBuff']) => void;
  onEquipItem: (heroId: string, item: Equipment) => void;
  onExitDungeon: () => void;
  onApplyNarrativeConsequence?: (consequence: ChoiceConsequence) => void;
  onSelectBranchRoom?: (room: DungeonRoom) => void;
}

const ROOM_META: Record<RoomType, { label: string; Icon: typeof Swords }> = {
  battle: { label: '哨探拦截', Icon: Swords },
  trap: { label: '暗器机关', Icon: Bomb },
  chest: { label: '储物宝箱', Icon: Package },
  camp: { label: '避风宿营', Icon: Flame },
  event: { label: '秘境奇遇', Icon: HelpCircle },
  boss: { label: '首领关隘', Icon: Crown },
};

const MEALS: { id: CampMealType; name: string; effect: string }[] = [
  { id: 'soup', name: '热汤暖胃', effect: '回血 40% · 减压 30' },
  { id: 'meat', name: '炙烤干肉', effect: '回血 50% · 物攻增益' },
  { id: 'tea', name: '松针清茶', effect: '回血 28% · 减压 40' },
];

/** 小节标题：3px 黄铜竖线 + 衬线标题 */
const SectionHead: React.FC<{ title: string; hint?: string; right?: React.ReactNode }> = ({
  title,
  hint,
  right,
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
    <span style={{ width: 3, height: 14, background: 'var(--pz-brass)', borderRadius: 2 }} />
    <span className="pz-h3" style={{ flex: 1 }}>
      {title}
      {hint && <span className="pz-sub" style={{ marginLeft: 6, fontWeight: 400 }}>{hint}</span>}
    </span>
    {right}
  </div>
);

export const DungeonView: React.FC<DungeonViewProps> = ({
  dungeon,
  squad,
  rations,
  onEnterBattle,
  onDisarmTrap,
  onOpenChest,
  onCampRest,
  onEquipItem,
  onExitDungeon,
  onApplyNarrativeConsequence,
  onSelectBranchRoom,
}) => {
  const currentRoom = dungeon.rooms[dungeon.currentRoomIndex];
  const [activeNarrativeEvent, setActiveNarrativeEvent] = useState<DungeonEvent | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<CampMealType>('soup');
  const [selectedHeroForEquip, setSelectedHeroForEquip] = useState<string>(squad[0]?.id || '');
  const [lastCampChat, setLastCampChat] = useState<{ speakerName: string; text: string } | null>(null);

  const meta = ROOM_META[currentRoom.type];
  const RoomIcon = meta.Icon;
  const isLastRoom = dungeon.currentRoomIndex >= dungeon.totalRooms - 1;

  // 一键煮汤休整与料理互动
  const handleCookAndRest = (meal: CampMealType) => {
    const res = executeQuickCampMeal(squad, meal, rations);
    if (!res.success) {
      alert(res.message);
      return;
    }
    currentRoom.campUsed = true;
    currentRoom.cleared = true;
    if (res.result?.chatSnippet) {
      setLastCampChat(res.result.chatSnippet);
    }
    onCampRest(res.result?.consumedRations || squad.length, res.message, res.buff);
  };

  const clearedLine = (text: string) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        color: 'var(--pz-success)',
        fontWeight: 600,
      }}
    >
      <Check size={14} strokeWidth={2.6} />
      {text}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ============ 探险状态与路线图 ============ */}
      <Card className="pz-grain">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="pz-h2" style={{ fontFamily: 'var(--pz-serif)' }}>
              {dungeon.name}
            </div>
            <div className="pz-sub" style={{ marginTop: 2 }}>
              {dungeon.stars} 星区域 · 第 {dungeon.currentRoomIndex + 1} / {dungeon.totalRooms} 间
            </div>
          </div>
          <Btn variant="ghost" size="sm" onClick={onExitDungeon} style={{ color: 'var(--pz-wine)', borderColor: 'rgba(138,59,50,.4)' }}>
            撤离
          </Btn>
        </div>

        {dungeon.campBuff && (
          <div
            style={{
              marginTop: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 8px',
              borderRadius: 6,
              background: 'rgba(217,164,91,.16)',
              border: '1px solid rgba(169,121,58,.34)',
            }}
          >
            <Flame size={13} style={{ color: 'var(--pz-brass-deep)', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'var(--pz-ink-2)', lineHeight: 1.4 }}>
              <b>{dungeon.campBuff.name}</b> · {dungeon.campBuff.description}
            </span>
          </div>
        )}

        {/* 手绘路线：节点 + 连线，横向可滚 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            overflowX: 'auto',
            marginTop: 12,
            paddingBottom: 2,
          }}
        >
          {dungeon.rooms.map((r, idx) => {
            const isCurr = idx === dungeon.currentRoomIndex;
            const isPast = idx < dungeon.currentRoomIndex;
            const NodeIcon = ROOM_META[r.type].Icon;
            return (
              <React.Fragment key={idx}>
                {idx > 0 && (
                  <span
                    style={{
                      flex: '0 0 14px',
                      height: 0,
                      marginTop: 17,
                      borderTop: isPast ? '2px solid var(--pz-success)' : '2px dashed var(--pz-line-2)',
                      opacity: isPast ? 0.75 : 1,
                    }}
                  />
                )}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    flexShrink: 0,
                    width: 36,
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      background: isCurr
                        ? 'var(--pz-wine)'
                        : isPast
                          ? 'rgba(111,191,139,.16)'
                          : 'var(--pz-sunken)',
                      border: isCurr
                        ? '2px solid var(--pz-wine)'
                        : `1px solid ${isPast ? 'rgba(111,191,139,.55)' : 'var(--pz-line)'}`,
                      color: isCurr ? '#F7EFDD' : isPast ? 'var(--pz-success)' : 'var(--pz-ink-3)',
                      boxShadow: isCurr ? '0 0 0 3px rgba(138,59,50,.14)' : 'none',
                    }}
                  >
                    <NodeIcon size={15} strokeWidth={2.2} />
                  </div>
                  <span
                    className="pz-micro"
                    style={{
                      color: isCurr ? 'var(--pz-wine)' : 'var(--pz-ink-3)',
                      fontWeight: isCurr ? 700 : 400,
                    }}
                  >
                    {idx + 1}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </Card>

      {/* ============ 当前房间 ============ */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              background: 'var(--pz-sunken)',
              border: '1px solid var(--pz-line)',
              color: 'var(--pz-wine)',
            }}
          >
            <RoomIcon size={19} strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="pz-h3" style={{ fontFamily: 'var(--pz-serif)' }}>
              {currentRoom.title}
            </div>
            <div className="pz-sub" style={{ marginTop: 1 }}>
              {meta.label} · {currentRoom.description}
            </div>
          </div>
        </div>

        {/* 1. 战斗房 */}
        {(currentRoom.type === 'battle' || currentRoom.type === 'boss') && (
          <div>
            {currentRoom.cleared ? (
              clearedLine('这处阻击点已经拔掉了，前路通了。')
            ) : (
              <>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    color: 'var(--pz-ink-2)',
                    marginBottom: 10,
                  }}
                >
                  <span>敌方守备</span>
                  <span style={{ color: 'var(--pz-wine)', fontWeight: 600 }}>
                    {currentRoom.enemyClasses?.map(c => CLASS_CONFIG[c]?.name || c).join('、')}
                  </span>
                  {currentRoom.isBoss && <Tag tone="wine">首领压阵</Tag>}
                </div>
                <Btn variant="main" block onClick={() => onEnterBattle(currentRoom)}>
                  列阵迎敌
                </Btn>
              </>
            )}
          </div>
        )}

        {/* 2. 奇遇房 */}
        {currentRoom.type === 'event' && (
          <div>
            {currentRoom.cleared ? (
              clearedLine('这里的抉择已经做完了，队伍重新上路。')
            ) : (
              <Btn
                variant="main"
                block
                onClick={() => {
                  if (currentRoom.dungeonEvent) {
                    setActiveNarrativeEvent(currentRoom.dungeonEvent);
                  }
                }}
              >
                上前看看
              </Btn>
            )}
          </div>
        )}

        {/* 3. 陷阱房 */}
        {currentRoom.type === 'trap' && (
          <div>
            {currentRoom.cleared ? (
              clearedLine('机关拆干净了，脚下安全。')
            ) : (
              <>
                <div className="pz-sub" style={{ marginBottom: 10 }}>
                  失手要让全队吃 {currentRoom.trapDamage} 点伤害。
                </div>
                <Btn variant="main" block onClick={() => onDisarmTrap(currentRoom)}>
                  全队警戒 · 拆机关
                </Btn>
              </>
            )}
          </div>
        )}

        {/* 4. 宝箱房 */}
        {currentRoom.type === 'chest' && (
          <div>
            {currentRoom.cleared ? (
              clearedLine('箱底已经翻过了，东西都收进行囊。')
            ) : (
              <Btn variant="main" block onClick={() => onOpenChest(currentRoom)}>
                开箱
              </Btn>
            )}
          </div>
        )}

        {/* 5. 营地房 */}
        {currentRoom.type === 'camp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {currentRoom.cleared ? (
              clearedLine('篝火还温着，全队歇够了。')
            ) : (
              <>
                <div className="pz-sub">
                  生火做顿饭，选一样吃食（消耗全队 {squad.length} 份口粮）。
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  {MEALS.map(m => {
                    const on = selectedMeal === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMeal(m.id)}
                        style={{
                          padding: '7px 4px',
                          borderRadius: 8,
                          border: on ? '1.5px solid var(--pz-wine)' : '1px solid var(--pz-line)',
                          background: on ? 'rgba(138,59,50,.10)' : 'var(--pz-raised)',
                          color: 'var(--pz-ink)',
                          cursor: 'pointer',
                          fontFamily: 'var(--pz-sans)',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{m.name}</div>
                        <div style={{ fontSize: 9, color: 'var(--pz-ink-3)', marginTop: 2 }}>
                          {m.effect}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <Btn variant="main" block onClick={() => handleCookAndRest(selectedMeal)}>
                  生火开饭 · 全队休整
                </Btn>
              </>
            )}

            {lastCampChat && (
              <div
                style={{
                  borderLeft: '2px solid var(--pz-brass)',
                  paddingLeft: 8,
                  fontSize: 11,
                  color: 'var(--pz-ink-2)',
                  fontStyle: 'italic',
                  lineHeight: 1.5,
                }}
              >
                [{lastCampChat.speakerName}] “{lastCampChat.text}”
              </div>
            )}
          </div>
        )}

        {/* 6. 路线推进 */}
        {currentRoom.cleared && !isLastRoom && (
          <div style={{ marginTop: 14, borderTop: '1px dashed var(--pz-line-2)', paddingTop: 12 }}>
            {currentRoom.branchOptions && currentRoom.branchOptions.length >= 2 ? (
              <>
                <SectionHead title="前面分了两条道" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {currentRoom.branchOptions.map((opt, bIdx) => {
                    const OptIcon = ROOM_META[opt.type].Icon;
                    return (
                      <button
                        key={bIdx}
                        onClick={() => {
                          if (onSelectBranchRoom) onSelectBranchRoom(opt);
                        }}
                        style={{
                          padding: '9px 10px',
                          background: 'var(--pz-raised)',
                          border: '1px solid var(--pz-line-2)',
                          borderRadius: 8,
                          color: 'var(--pz-ink)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontFamily: 'var(--pz-sans)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 3,
                        }}
                      >
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--pz-brass-deep)',
                          }}
                        >
                          <Compass size={12} />
                          {bIdx === 0 ? '左道' : '右道'}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{opt.title}</span>
                        <span
                          style={{
                            fontSize: 10,
                            color: 'var(--pz-ink-3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <OptIcon size={11} />
                          {ROOM_META[opt.type].label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <Btn
                variant="main"
                block
                onClick={() => {
                  if (onSelectBranchRoom) {
                    onSelectBranchRoom(
                      (currentRoom.branchOptions && currentRoom.branchOptions[0]) ||
                        dungeon.rooms[dungeon.currentRoomIndex + 1]
                    );
                  }
                }}
              >
                <Footprints size={15} />
                继续往里走
              </Btn>
            )}
          </div>
        )}
      </Card>

      {/* ============ 队伍状态 ============ */}
      <Card variant="sunken">
        <SectionHead title="队伍" hint={`${squad.length} 人 · 口粮 ${rations}`} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {squad.map(h => {
            const ratio = Math.max(0, Math.min(1, h.currentHp / Math.max(1, h.maxHp)));
            const low = ratio < 0.4;
            return (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 74, flexShrink: 0, fontSize: 11, fontWeight: 600, color: 'var(--pz-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {h.name}
                </span>
                <span
                  style={{
                    flex: 1,
                    height: 5,
                    borderRadius: 3,
                    background: 'rgba(42,36,24,.14)',
                    overflow: 'hidden',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      height: '100%',
                      width: `${ratio * 100}%`,
                      borderRadius: 3,
                      background: low ? 'var(--pz-combat)' : 'var(--pz-success)',
                      transition: 'width .3s',
                    }}
                  />
                </span>
                <span
                  className="pz-mono"
                  style={{ width: 62, textAlign: 'right', fontSize: 10, color: 'var(--pz-ink-3)' }}
                >
                  {Math.round(h.currentHp)}/{h.maxHp}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ============ 缴获装备 ============ */}
      {dungeon.lootItems.length > 0 && (
        <Card variant="sunken">
          <SectionHead title="缴获军械" hint={`${dungeon.lootItems.length} 件`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {dungeon.lootItems.map(item => (
              <div
                key={item.id}
                style={{
                  background: 'var(--pz-raised)',
                  border: '1px solid var(--pz-line)',
                  borderRadius: 6,
                  padding: '7px 9px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--pz-ink)' }}>
                  {item.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--pz-ink-2)', lineHeight: 1.5 }}>
                  {describeBase(item)}
                  {item.affixText && (
                    <span style={{ color: 'var(--pz-arcane)', marginLeft: 4 }}>{item.affixText}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <select
                    value={selectedHeroForEquip}
                    onChange={e => setSelectedHeroForEquip(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      background: 'var(--pz-page)',
                      color: 'var(--pz-ink)',
                      border: '1px solid var(--pz-line-2)',
                      borderRadius: 5,
                      fontSize: 11,
                      padding: '4px 6px',
                      fontFamily: 'var(--pz-sans)',
                    }}
                  >
                    {squad.map(h => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                  <Btn variant="brass" size="sm" onClick={() => onEquipItem(selectedHeroForEquip, item)}>
                    穿戴
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ============ 奇遇事件弹窗 ============ */}
      {activeNarrativeEvent && (
        <DungeonEventModal
          event={activeNarrativeEvent}
          squad={squad}
          onResolve={consequence => {
            currentRoom.cleared = true;
            currentRoom.eventResolved = true;
            if (onApplyNarrativeConsequence) {
              onApplyNarrativeConsequence(consequence);
            }
            setActiveNarrativeEvent(null);
          }}
          onClose={() => {
            currentRoom.cleared = true;
            currentRoom.eventResolved = true;
            setActiveNarrativeEvent(null);
          }}
        />
      )}
    </div>
  );
};
