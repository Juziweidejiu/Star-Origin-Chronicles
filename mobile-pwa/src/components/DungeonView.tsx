import React, { useState } from 'react';
import type { DungeonInstance, DungeonRoom, CampMealType } from '../types/dungeon';
import type { Hero, Equipment } from '../types/hero';
import { describeBase } from '../engine/statResolver';
import type { DungeonEvent, ChoiceConsequence } from '../types/narrative';
import { executeQuickCampMeal } from '../engine/dungeonEngine';
import { DungeonEventModal } from './DungeonEventModal';
import { CLASS_CONFIG } from '../engine/heroFactory';

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 顶部地牢探险状态 */}
      <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#f59e0b' }}>
              🗝️ {dungeon.name}
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px' }}>
              ({dungeon.stars} 星探险 · {dungeon.currentRoomIndex + 1}/{dungeon.totalRooms} 房)
            </span>
          </div>
          <button
            onClick={onExitDungeon}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              borderRadius: '6px',
              border: 'none',
              background: '#ef4444',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            撤离探险
          </button>
        </div>

        {/* 探险临时料理 Buff 状态 */}
        {dungeon.campBuff && (
          <div
            style={{
              marginTop: '8px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid #d97706',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '11px',
              color: '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>🍲 料理状态：<strong>{dungeon.campBuff.name}</strong>（{dungeon.campBuff.description}）</span>
          </div>
        )}

        {/* 房间节点步进条 */}
        <div style={{ display: 'flex', gap: '4px', marginTop: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
          {dungeon.rooms.map((r, idx) => {
            const isCurr = idx === dungeon.currentRoomIndex;
            const isPast = r.cleared;
            let icon = '⚔️';
            if (r.type === 'trap') icon = '🪤';
            if (r.type === 'chest') icon = '📦';
            if (r.type === 'camp') icon = '🏕️';
            if (r.type === 'event') icon = '❓';
            if (r.type === 'boss') icon = '👑';

            return (
              <div
                key={idx}
                style={{
                  minWidth: '38px',
                  height: '38px',
                  borderRadius: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isCurr ? '#f59e0b' : isPast ? '#059669' : '#0f172a',
                  color: isCurr ? '#0f172a' : '#fff',
                  border: isCurr ? '2px solid #fff' : '1px solid #334155',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  flexShrink: 0,
                }}
              >
                <span>{icon}</span>
                <span style={{ fontSize: '9px' }}>{idx + 1}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 当前房间交互卡片 */}
      <div style={{ background: '#1e293b', padding: '14px', borderRadius: '8px', border: '1px solid #475569' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '20px' }}>
            {currentRoom.type === 'battle' && '⚔️'}
            {currentRoom.type === 'trap' && '🪤'}
            {currentRoom.type === 'chest' && '📦'}
            {currentRoom.type === 'camp' && '🏕️'}
            {currentRoom.type === 'event' && '❓'}
            {currentRoom.type === 'boss' && '👑'}
          </span>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#f8fafc' }}>
              {currentRoom.title}
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
              {currentRoom.description}
            </div>
          </div>
        </div>

        {/* 1. 战斗房交互 */}
        {(currentRoom.type === 'battle' || currentRoom.type === 'boss') && (
          <div style={{ marginTop: '12px' }}>
            {currentRoom.cleared ? (
              <div style={{ color: '#10b981', fontSize: '12px', fontWeight: 'bold' }}>
                ✅ 该区域阻击点已被彻底拔除，前路通畅！
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '8px' }}>
                  敌方兵力配置：
                  <span style={{ color: '#f87171', fontWeight: 'bold' }}>
                    {currentRoom.enemyClasses
                      ?.map(c => CLASS_CONFIG[c]?.name || c)
                      .join('、')}
                  </span>
                  {currentRoom.isBoss && (
                    <span style={{ marginLeft: '6px', color: '#eab308' }}>
                      (👑 敌方首领压阵)
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onEnterBattle(currentRoom)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#f59e0b',
                    color: '#0f172a',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  ⚔️ 全队列阵 · 开始迎敌
                </button>
              </div>
            )}
          </div>
        )}

        {/* 2. 奇遇事件房交互（正式节点） */}
        {currentRoom.type === 'event' && (
          <div style={{ marginTop: '12px' }}>
            {currentRoom.cleared ? (
              <div style={{ color: '#10b981', fontSize: '12px', fontWeight: 'bold' }}>
                ✅ 奇遇抉择已决断，全队继续启程。
              </div>
            ) : (
              <button
                onClick={() => {
                  if (currentRoom.dungeonEvent) {
                    setActiveNarrativeEvent(currentRoom.dungeonEvent);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#8b5cf6',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                📜 观察并作出抉择
              </button>
            )}
          </div>
        )}

        {/* 3. 陷阱房交互 */}
        {currentRoom.type === 'trap' && (
          <div style={{ marginTop: '12px' }}>
            {currentRoom.cleared ? (
              <div style={{ color: '#10b981', fontSize: '12px', fontWeight: 'bold' }}>
                ✅ 机巧机关已全数化解，前路已安全。
              </div>
            ) : (
              <button
                onClick={() => onDisarmTrap(currentRoom)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#6366f1',
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                🛠️ 全队警戒 · 拆除机关 (受挫则受创 {currentRoom.trapDamage} 点伤害)
              </button>
            )}
          </div>
        )}

        {/* 4. 宝箱房交互 */}
        {currentRoom.type === 'chest' && (
          <div style={{ marginTop: '12px' }}>
            {currentRoom.cleared ? (
              <div style={{ color: '#10b981', fontSize: '12px', fontWeight: 'bold' }}>
                ✅ 战利品与军械已装入行囊。
              </div>
            ) : (
              <button
                onClick={() => onOpenChest(currentRoom)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#eab308',
                  color: '#0f172a',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                📦 开启储物箱
              </button>
            )}
          </div>
        )}

        {/* 5. 营地休整房交互（轻量生活感料理） */}
        {currentRoom.type === 'camp' && (
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentRoom.cleared ? (
              <div style={{ color: '#10b981', fontSize: '12px', fontWeight: 'bold' }}>
                ✅ 篝火余烬尚温，全队休整完毕，状态恢复。
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
                  点燃篝火烹煮热食。选择本轮料理菜单（消耗全队 {squad.length} 份口粮）：
                </div>
                {/* 料理三选一 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                  <button
                    onClick={() => setSelectedMeal('soup')}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '6px',
                      border: selectedMeal === 'soup' ? '2px solid #10b981' : '1px solid #475569',
                      background: selectedMeal === 'soup' ? '#064e3b' : '#0f172a',
                      color: '#fff',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    <div>🍲 热汤暖胃</div>
                    <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>回血40%+减压30</div>
                  </button>
                  <button
                    onClick={() => setSelectedMeal('meat')}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '6px',
                      border: selectedMeal === 'meat' ? '2px solid #ef4444' : '1px solid #475569',
                      background: selectedMeal === 'meat' ? '#7f1d1d' : '#0f172a',
                      color: '#fff',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    <div>🍖 炙烤干肉</div>
                    <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>回血50%+物攻Buff</div>
                  </button>
                  <button
                    onClick={() => setSelectedMeal('tea')}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '6px',
                      border: selectedMeal === 'tea' ? '2px solid #38bdf8' : '1px solid #475569',
                      background: selectedMeal === 'tea' ? '#0c4a6e' : '#0f172a',
                      color: '#fff',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    <div>🍵 松针清茶</div>
                    <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>回血28%+减压40</div>
                  </button>
                </div>

                <button
                  onClick={() => handleCookAndRest(selectedMeal)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#10b981',
                    color: '#0f172a',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  🔥 生火开饭 · 全队一键休整
                </button>
              </div>
            )}

            {/* 伙伴随性闲聊（每次只出现1句，生动生活感） */}
            {lastCampChat && (
              <div
                style={{
                  marginTop: '8px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  fontSize: '11px',
                  color: '#cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>[{lastCampChat.speakerName}]:</span>
                <span>“{lastCampChat.text}”</span>
              </div>
            )}
          </div>
        )}

        {/* 6. 当前房间已通关时：二选一选路推进 (方式 A) */}
        {currentRoom.cleared && dungeon.currentRoomIndex < dungeon.totalRooms - 1 && (
          <div style={{ marginTop: '16px', borderTop: '1px dashed #475569', paddingTop: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '8px' }}>
              🧭 前方出现两条通路，请选择行进方向：
            </div>
            {currentRoom.branchOptions && currentRoom.branchOptions.length >= 2 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {currentRoom.branchOptions.map((opt, bIdx) => (
                  <button
                    key={bIdx}
                    onClick={() => {
                      if (onSelectBranchRoom) onSelectBranchRoom(opt);
                    }}
                    style={{
                      padding: '10px',
                      background: '#0f172a',
                      border: '1px solid #f59e0b',
                      borderRadius: '6px',
                      color: '#fff',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fbbf24' }}>
                      {bIdx === 0 ? '👈 左侧干道' : '👉 右侧隘口'}
                    </div>
                    <div style={{ fontSize: '11px', marginTop: '4px', color: '#e2e8f0' }}>
                      {opt.title}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                      {opt.type === 'battle' && '⚔️ 哨探拦截'}
                      {opt.type === 'event' && '❓ 秘境奇遇'}
                      {opt.type === 'trap' && '🪤 暗器机关'}
                      {opt.type === 'chest' && '📦 储物宝箱'}
                      {opt.type === 'camp' && '🏕️ 避风宿营'}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <button
                onClick={() => {
                  if (onSelectBranchRoom) {
                    onSelectBranchRoom(dungeon.rooms[dungeon.currentRoomIndex + 1]);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                ⏩ 深入下一区域
              </button>
            )}
          </div>
        )}
      </div>

      {/* 战利品与就地整备面板 */}
      {dungeon.lootItems.length > 0 && (
        <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#fbbf24', marginBottom: '8px' }}>
            🎒 探险缴获装备 ({dungeon.lootItems.length} 件)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {dungeon.lootItems.map(item => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#0f172a',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                }}
              >
                <div>
                  <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>{item.name}</span>
                  <span style={{ color: '#94a3b8', marginLeft: '6px' }}>
                    ({describeBase(item)})
                  </span>
                  {item.affixText && (
                    <span style={{ color: '#a855f7', marginLeft: '4px' }}>[{item.affixText}]</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <select
                    value={selectedHeroForEquip}
                    onChange={e => setSelectedHeroForEquip(e.target.value)}
                    style={{
                      background: '#1e293b',
                      color: '#fff',
                      border: '1px solid #475569',
                      borderRadius: '4px',
                      fontSize: '11px',
                    }}
                  >
                    {squad.map(h => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => onEquipItem(selectedHeroForEquip, item)}
                    style={{
                      padding: '2px 8px',
                      background: '#10b981',
                      color: '#0f172a',
                      fontWeight: 'bold',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    穿戴
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 叙事奇遇事件弹窗 */}
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
