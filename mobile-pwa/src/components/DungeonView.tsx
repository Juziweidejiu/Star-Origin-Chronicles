import React, { useState } from 'react';
import type { DungeonInstance, DungeonRoom, CampRole } from '../types/dungeon';
import type { Hero, Equipment } from '../types/hero';
import type { DungeonEvent, ChoiceConsequence } from '../types/narrative';
import { executeCampRest } from '../engine/dungeonEngine';
import { CampBarkBubble } from './CampBarkBubble';
import { DungeonEventModal } from './DungeonEventModal';
import { GOLD_STANDARD_DUNGEON_EVENTS, getCampDialogueForHero } from '../data/mockNarratives';
import { CLASS_CONFIG } from '../engine/heroFactory';

interface DungeonViewProps {
  dungeon: DungeonInstance;
  squad: Hero[];
  rations: number;
  onEnterBattle: (room: DungeonRoom) => void;
  onDisarmTrap: (room: DungeonRoom) => void;
  onOpenChest: (room: DungeonRoom) => void;
  onCampRest: (consumedRations: number, message: string) => void;
  onEquipItem: (heroId: string, item: Equipment) => void;
  onExitDungeon: () => void;
  onApplyNarrativeConsequence?: (consequence: ChoiceConsequence) => void;
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
}) => {
  const currentRoom = dungeon.rooms[dungeon.currentRoomIndex];
  const [activeNarrativeEvent, setActiveNarrativeEvent] = useState<DungeonEvent | null>(null);
  const [campAssignments, setCampAssignments] = useState<Record<string, CampRole>>(() => {
    const init: Record<string, CampRole> = {};
    squad.forEach((h, idx) => {
      if (idx === 0) init[h.id] = 'sentry'; // 默认第一个为哨兵
      else if (idx === 1) init[h.id] = 'tender'; // 默认第二个为医护
      else init[h.id] = 'rest';
    });
    return init;
  });

  const [selectedHeroForEquip, setSelectedHeroForEquip] = useState<string>(squad[0]?.id || '');

  // 营地休整触发
  const handleRest = () => {
    const res = executeCampRest(squad, campAssignments, rations);
    if (!res.success) {
      alert(res.message);
      return;
    }
    currentRoom.campUsed = true;
    currentRoom.cleared = true;
    onCampRest(res.result?.consumedRations || squad.length, res.message);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 顶部地牢进度状态 */}
      <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#f59e0b' }}>
              🗝️ {dungeon.name}
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px' }}>
              ({dungeon.stars} 星深渊 · {dungeon.currentRoomIndex + 1}/{dungeon.totalRooms} 房)
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
            撤离地牢
          </button>
        </div>

        {/* 房间节点进度步进条 */}
        <div style={{ display: 'flex', gap: '4px', marginTop: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
          {dungeon.rooms.map((r, idx) => {
            const isCurr = idx === dungeon.currentRoomIndex;
            const isPast = r.cleared;
            let icon = '⚔️';
            if (r.type === 'trap') icon = '🪤';
            if (r.type === 'chest') icon = '📦';
            if (r.type === 'camp') icon = '🏕️';
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
            {currentRoom.type === 'boss' && '👑'}
          </span>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#38bdf8' }}>
              {currentRoom.title}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{currentRoom.description}</div>
          </div>
        </div>

        {/* 房间事件具体操作 */}
        {currentRoom.type === 'battle' && (
          <div>
            <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '10px' }}>
              敌对前锋编制: {currentRoom.enemyClasses?.map(c => CLASS_CONFIG[c]?.name ?? c).join('、')} (Lv.{currentRoom.enemyLevel})
            </div>
            <button
              onClick={() => onEnterBattle(currentRoom)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: 'none',
                background: '#ef4444',
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              🔥 全军出击，斩灭敌阵！
            </button>
          </div>
        )}

        {currentRoom.type === 'boss' && (
          <div>
            <div style={{ fontSize: '12px', color: '#f87171', marginBottom: '10px', fontWeight: 'bold' }}>
              ⚠️ 警告：检测到极度庞大的黑暗威能！击破首领即可彻底清缴本层地牢！
            </div>
            <button
              onClick={() => onEnterBattle(currentRoom)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '6px',
                border: 'none',
                background: 'linear-gradient(135deg, #ef4444, #991b1b)',
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              👑 决战地牢最终首领！
            </button>
          </div>
        )}

        {currentRoom.type === 'trap' && (
          <div>
            <div style={{ fontSize: '12px', color: '#f59e0b', marginBottom: '10px' }}>
              机关伤害: 约 {currentRoom.trapDamage} 点。敏捷度最高的先锋可尝试拆卸，失败将承受贯穿伤！
            </div>
            <button
              onClick={() => onDisarmTrap(currentRoom)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: 'none',
                background: '#f59e0b',
                color: '#0f172a',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              🛠️ 派出前锋谨慎拆解机关
            </button>
          </div>
        )}

        {currentRoom.type === 'chest' && (
          <div>
            <div style={{ fontSize: '12px', color: '#38bdf8', marginBottom: '10px' }}>
              宝箱中蕴藏丰厚金币与稀有暗黑武装！
            </div>
            <button
              onClick={() => onOpenChest(currentRoom)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: 'none',
                background: '#059669',
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              ✨ 启封宝箱，收缴战利品！
            </button>
          </div>
        )}

        {currentRoom.type === 'camp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
              分配营地岗位：<span style={{ color: '#10b981' }}>医护管事</span> 提供 1.8x 治疗；
              <span style={{ color: '#38bdf8' }}>警戒哨兵</span> 降压效果翻倍。
            </div>

            {squad.map(hero => {
              const bark = getCampDialogueForHero(hero);
              return (
                <div key={hero.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div
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
                      <span style={{ fontWeight: 'bold' }}>{hero.name}</span>
                      <span style={{ color: '#94a3b8', marginLeft: '6px' }}>
                        HP:{hero.currentHp}/{hero.maxHp} 压:{hero.stress}
                      </span>
                    </div>
                    <select
                      value={campAssignments[hero.id]}
                      onChange={e =>
                        setCampAssignments({ ...campAssignments, [hero.id]: e.target.value as CampRole })
                      }
                      style={{
                        background: '#1e293b',
                        color: '#fff',
                        border: '1px solid #475569',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '11px',
                      }}
                    >
                      <option value="sentry">🛡️ 警戒哨兵</option>
                      <option value="tender">💉 医护管事</option>
                      <option value="rest">💤 篝火休养</option>
                    </select>
                  </div>
                  {/* 营地碎碎念冷峻台词气泡 */}
                  <CampBarkBubble dialogue={bark} speaker={hero} />
                </div>
              );
            })}

            <button
              onClick={handleRest}
              style={{
                marginTop: '6px',
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
              🔥 扎营点火并进餐休整 (消耗 {squad.length} 份口粮)
            </button>
          </div>
        )}

        {/* 偶发深度叙事探索交互入口 */}
        <div style={{ marginTop: '12px', borderTop: '1px dashed #334155', paddingTop: '10px' }}>
          <button
            onClick={() => {
              const randomIndex = Math.floor(Math.random() * GOLD_STANDARD_DUNGEON_EVENTS.length);
              setActiveNarrativeEvent(GOLD_STANDARD_DUNGEON_EVENTS[randomIndex]);
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #78350f',
              background: 'linear-gradient(180deg, #1c1917 0%, #0c0a09 100%)',
              color: '#fbbf24',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>📜</span>
            <span>调查深渊残迹 (触发冷峻叙事事件)</span>
          </button>
        </div>
      </div>

      {/* 战利品库与装备穿戴区 */}
      {dungeon.lootItems.length > 0 && (
        <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#f59e0b' }}>
              💎 探险所获暗黑武装 ({dungeon.lootItems.length})
            </span>
            <select
              value={selectedHeroForEquip}
              onChange={e => setSelectedHeroForEquip(e.target.value)}
              style={{
                background: '#0f172a',
                color: '#38bdf8',
                border: '1px solid #475569',
                borderRadius: '4px',
                padding: '3px 6px',
                fontSize: '11px',
              }}
            >
              {squad.map(h => (
                <option key={h.id} value={h.id}>
                  穿戴至: {h.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {dungeon.lootItems.map(item => {
              const rarityColor =
                item.rarity === 'legendary'
                  ? '#f97316'
                  : item.rarity === 'epic'
                  ? '#a855f7'
                  : item.rarity === 'rare'
                  ? '#38bdf8'
                  : item.rarity === 'uncommon'
                  ? '#10b981'
                  : '#cbd5e1';

              return (
                <div
                  key={item.id}
                  style={{
                    background: '#0f172a',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    borderLeft: `4px solid ${rarityColor}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '11px',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 'bold', color: rarityColor }}>{item.name}</span>
                    <span style={{ color: '#94a3b8', marginLeft: '6px' }}>[{item.slot}]</span>
                    {item.affixText && (
                      <span style={{ color: '#e2e8f0', marginLeft: '6px' }}>({item.affixText})</span>
                    )}
                    <div style={{ color: '#64748b', fontSize: '10px' }}>
                      {item.bonusDamage ? `攻+${item.bonusDamage} ` : ''}
                      {item.bonusHp ? `血+${item.bonusHp} ` : ''}
                      {item.bonusArmor ? `甲+${item.bonusArmor} ` : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => onEquipItem(selectedHeroForEquip, item)}
                    style={{
                      padding: '4px 8px',
                      background: '#38bdf8',
                      color: '#0f172a',
                      borderRadius: '4px',
                      border: 'none',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    装备
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 暗黑地牢事件模态弹窗 */}
      {activeNarrativeEvent && (
        <DungeonEventModal
          event={activeNarrativeEvent}
          squad={squad}
          onClose={() => setActiveNarrativeEvent(null)}
          onResolve={(consequence) => {
            onApplyNarrativeConsequence?.(consequence);
          }}
        />
      )}
    </div>
  );
};
