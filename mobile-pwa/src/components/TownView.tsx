import React, { useState } from 'react';
import type { TownEngine } from '../engine/townEngine';
import type { TownId, BuildingType, GuildContract, TavernRecruit } from '../types/world';
import type { Hero } from '../types/hero';

interface TownViewProps {
  townEngine: TownEngine;
  roster: Hero[];
  onRosterChange: (newRoster: Hero[]) => void;
  onSelectContract: (contract: GuildContract) => void;
  onLogMessage: (msg: string) => void;
  triggerUpdate: () => void;
}

export const TownView: React.FC<TownViewProps> = ({
  townEngine,
  roster,
  onRosterChange,
  onSelectContract,
  onLogMessage,
  triggerUpdate
}) => {
  const currentTownId = townEngine.logistics.currentTownId;
  const currentTown = townEngine.towns[currentTownId];
  const [activeBuilding, setActiveBuilding] = useState<BuildingType>('guild');
  const [isTravelModalOpen, setIsTravelModalOpen] = useState(false);

  // 切换据点旅行
  const handleTravel = (targetTownId: TownId) => {
    const res = townEngine.travelToTown(targetTownId, roster);
    onLogMessage(res.message);
    if (res.success) {
      setIsTravelModalOpen(false);
      triggerUpdate();
    }
  };

  // 采购物资
  const handleBuyRations = (amount: number) => {
    const res = townEngine.buyRations(amount);
    onLogMessage(res.message);
    triggerUpdate();
  };

  const handleBuyMedicine = (amount: number) => {
    const res = townEngine.buyMedicine(amount);
    onLogMessage(res.message);
    triggerUpdate();
  };

  // 雇佣
  const handleHire = (recruit: TavernRecruit) => {
    const res = townEngine.hireRecruit(recruit.id, roster);
    onLogMessage(res.message);
    if (res.success && res.newHero) {
      onRosterChange([...roster, res.newHero]);
      triggerUpdate();
    }
  };

  // 医馆治疗
  const handleHeal = (hero: Hero) => {
    const res = townEngine.healHeroAtInfirmary(hero);
    onLogMessage(res.message);
    triggerUpdate();
  };

  // 圣所召魂复活
  const handleRevive = (index: number) => {
    const res = townEngine.reviveSoul(index, roster);
    onLogMessage(res.message);
    if (res.success && res.revivedHero) {
      onRosterChange([...roster, res.revivedHero]);
      triggerUpdate();
    }
  };

  // 声望徽章颜色
  const getReputationBadge = (rep: number) => {
    if (rep >= 60) return { label: '崇拜', color: '#a855f7' };
    if (rep >= 20) return { label: '友善', color: '#10b981' };
    if (rep >= -20) return { label: '中立', color: '#38bdf8' };
    return { label: '冷淡', color: '#ef4444' };
  };

  const repBadge = getReputationBadge(currentTown.reputation);
  const contracts = townEngine.contracts[currentTownId] || [];
  const recruits = townEngine.tavernRecruits[currentTownId] || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      
      {/* 据点头部横幅与地标 */}
      <div style={{ background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)', padding: '14px', borderRadius: '10px', border: '1px solid #334155' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#f8fafc', margin: 0 }}>{currentTown.name}</h2>
              <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '12px', background: `${repBadge.color}22`, color: repBadge.color, border: `1px solid ${repBadge.color}` }}>
                {repBadge.label} ({currentTown.reputation} 声望)
              </span>
            </div>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0 0' }}>{currentTown.subtitle}</p>
          </div>
          <button
            onClick={() => setIsTravelModalOpen(true)}
            style={{ padding: '6px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            🗺️ 据点转移
          </button>
        </div>
        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px', lineHeight: '1.4' }}>
          {currentTown.description}
        </div>
      </div>

      {/* 建筑切换标签栏 */}
      <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
        {currentTown.buildings.map(b => {
          const labels: Record<BuildingType, string> = {
            guild: '📜 冒险公会',
            tavern: '🍺 佣兵酒馆',
            market: '⚖️ 补给市集',
            infirmary: '🩹 随军医馆',
            sanctuary: '✨ 英灵圣所'
          };
          const isAct = activeBuilding === b;
          return (
            <button
              key={b}
              onClick={() => setActiveBuilding(b)}
              style={{
                flex: 1,
                minWidth: '70px',
                padding: '8px 4px',
                borderRadius: '6px',
                border: 'none',
                background: isAct ? '#38bdf8' : '#1e293b',
                color: isAct ? '#0f172a' : '#94a3b8',
                fontWeight: 'bold',
                fontSize: '11px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {labels[b]}
            </button>
          );
        })}
      </div>

      {/* 建筑 1: 冒险公会 (委托契约) */}
      {activeBuilding === 'guild' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
            <span>在榜悬赏契约 (完成提升城邦声望)</span>
            <span style={{ color: '#38bdf8' }}>赏金加成: +{Math.round((currentTown.rewardMod - 1) * 100)}%</span>
          </div>

          {contracts.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>当前暂无可用悬赏，下周公会将发布新任务。</div>
          ) : (
            contracts.map(contract => (
              <div 
                key={contract.id} 
                style={{ 
                  background: '#1e293b', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: '1px solid #334155',
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '6px' 
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#f8fafc' }}>
                    {'★'.repeat(contract.stars)}{'☆'.repeat(5 - contract.stars)} {contract.title}
                  </div>
                  <span style={{ fontSize: '11px', color: '#eab308', fontWeight: 'bold' }}>
                    💰 {contract.goldReward} G
                  </span>
                </div>

                <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
                  {contract.description}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '10px', color: '#64748b' }}>
                  <div>
                    <span>耗时: {contract.durationDays} 天</span> | 
                    <span style={{ color: '#34d399', marginLeft: '4px' }}>声望 +{contract.reputationReward}</span>
                    {contract.soulCrystalReward ? <span style={{ color: '#c084fc', marginLeft: '4px' }}>| 魂晶 +{contract.soulCrystalReward}</span> : null}
                  </div>
                  <button
                    onClick={() => onSelectContract(contract)}
                    style={{
                      padding: '4px 12px',
                      background: '#10b981',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '11px'
                    }}
                  >
                    接取并讨伐 ⚔️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 建筑 2: 佣兵酒馆 (招募流浪伙伴) */}
      {activeBuilding === 'tavern' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            酒馆候聘佣兵 (上限 8 人，当前名册: {roster.length}/8)
          </div>

          {recruits.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>酒馆暂无求职者，请待下一周刷新或前往其他城邦。</div>
          ) : (
            recruits.map(rec => (
              <div key={rec.id} style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#f8fafc' }}>{rec.hero.name}</span>
                    <span style={{ fontSize: '11px', color: '#38bdf8', marginLeft: '6px' }}>Lv.{rec.hero.level} {rec.hero.role}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#eab308', fontWeight: 'bold' }}>
                    潜力: {rec.starRatingRange}
                  </span>
                </div>

                <div style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0', fontStyle: 'italic' }}>
                  "{rec.backgroundStory}"
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '11px' }}>
                  <span style={{ color: '#64748b' }}>
                    现役能力 CA: {rec.hero.currentAbility} | 周薪: {rec.hero.wage} G
                  </span>
                  <button
                    onClick={() => handleHire(rec)}
                    disabled={townEngine.logistics.gold < rec.hireCost}
                    style={{
                      padding: '4px 12px',
                      background: townEngine.logistics.gold >= rec.hireCost ? '#eab308' : '#475569',
                      color: '#0f172a',
                      fontWeight: 'bold',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: townEngine.logistics.gold >= rec.hireCost ? 'pointer' : 'not-allowed',
                      fontSize: '11px'
                    }}
                  >
                    签约 ({rec.hireCost} G)
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 建筑 3: 补给市集 (买卖口粮与药剂) */}
      {activeBuilding === 'market' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            军备物资交易所 (当前物价折扣: {Math.round(currentTown.supplyCostMod * 10)} 折)
          </div>

          <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#f8fafc' }}>🍞 行军干粮 (Rations)</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                行军与深潜必需品。每日每人消耗 1 份。当前存量: <b style={{ color: '#38bdf8' }}>{townEngine.logistics.rations}</b>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                onClick={() => handleBuyRations(10)}
                style={{ padding: '6px 10px', background: '#334155', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
              >
                +10份 ({Math.round(60 * currentTown.supplyCostMod)}G)
              </button>
              <button 
                onClick={() => handleBuyRations(30)}
                style={{ padding: '6px 10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                +30份 ({Math.round(180 * currentTown.supplyCostMod)}G)
              </button>
            </div>
          </div>

          <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#f8fafc' }}>🧪 金创药剂 (Medicine)</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                处理严重肢体伤痕与战术创伤。当前存量: <b style={{ color: '#38bdf8' }}>{townEngine.logistics.medicines}</b>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                onClick={() => handleBuyMedicine(1)}
                style={{ padding: '6px 10px', background: '#334155', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
              >
                +1瓶 ({Math.round(50 * currentTown.supplyCostMod)}G)
              </button>
              <button 
                onClick={() => handleBuyMedicine(3)}
                style={{ padding: '6px 10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                +3瓶 ({Math.round(150 * currentTown.supplyCostMod)}G)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 建筑 4: 随军医馆 (疗伤消压) */}
      {activeBuilding === 'infirmary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            伤患疗养所 (快速恢复生命值、治疗伤痕并平复压力)
          </div>

          {roster.map(hero => {
            const needHeal = hero.currentHp < hero.maxHp || hero.injuries.length > 0;
            const cost = Math.round(((hero.maxHp - hero.currentHp) * 0.4 + hero.injuries.length * 35) * currentTown.supplyCostMod);
            return (
              <div key={hero.id} style={{ background: '#1e293b', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#f8fafc' }}>
                    {hero.name} <span style={{ fontSize: '10px', color: '#94a3b8' }}>HP: {hero.currentHp}/{hero.maxHp}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: hero.injuries.length > 0 ? '#ef4444' : '#10b981', marginTop: '2px' }}>
                    {hero.injuries.length > 0 ? `伤情: ${hero.injuries.join(', ')}` : '状态: 肢体健康'}
                  </div>
                </div>
                {needHeal ? (
                  <button
                    onClick={() => handleHeal(hero)}
                    disabled={townEngine.logistics.gold < cost}
                    style={{
                      padding: '4px 10px',
                      background: townEngine.logistics.gold >= cost ? '#10b981' : '#475569',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: townEngine.logistics.gold >= cost ? 'pointer' : 'not-allowed'
                    }}
                  >
                    医治 ({cost} G)
                  </button>
                ) : (
                  <span style={{ fontSize: '11px', color: '#10b981' }}>无须就医</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 建筑 5: 英灵圣所 (软着陆死亡保护 · 灵魂引渡) */}
      {activeBuilding === 'sanctuary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            远古英灵祭坛 (消耗金币与稀有魂晶，召回阵亡勇士之魂魄)
          </div>

          <div style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px dashed #a855f7', padding: '10px', borderRadius: '8px', fontSize: '11px', color: '#d8b4fe' }}>
            ✨ 当前拥有的稀有魂晶: <b>{townEngine.logistics.soulCrystals}</b> 颗 (高星级公会任务奖励)
          </div>

          {townEngine.fallenSouls.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
              英灵名册空空如也，佣兵团至今尚无兄弟长眠。
            </div>
          ) : (
            townEngine.fallenSouls.map((soul, idx) => (
              <div key={soul.hero.id} style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #475569' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#f87171' }}>✝️ {soul.hero.name}</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px' }}>Lv.{soul.hero.level} {soul.hero.role}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#a855f7', fontWeight: 'bold' }}>
                    需要: {soul.revivalSoulCrystals} 魂晶 + {soul.revivalCostGold} G
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', margin: '4px 0' }}>
                  阵亡于第 {soul.deathDate} 天 · {soul.deathLocation}
                </div>
                <div style={{ textAlign: 'right', marginTop: '6px' }}>
                  <button
                    onClick={() => handleRevive(idx)}
                    disabled={
                      townEngine.logistics.gold < soul.revivalCostGold || 
                      townEngine.logistics.soulCrystals < soul.revivalSoulCrystals
                    }
                    style={{
                      padding: '4px 14px',
                      background: '#a855f7',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    引渡还魂 ⚡
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 转移据点弹窗 */}
      {isTravelModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 999
        }}>
          <div style={{ background: '#1e293b', width: '100%', maxWidth: '380px', borderRadius: '12px', padding: '16px', border: '1px solid #334155' }}>
            <h3 style={{ fontSize: '15px', color: '#38bdf8', margin: '0 0 12px 0' }}>🗺️ 选择行军目的地</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(Object.keys(townEngine.towns) as TownId[]).map(tId => {
                const t = townEngine.towns[tId];
                const isCurrent = tId === currentTownId;
                const days = Math.max(1, Math.abs(currentTown.distanceFromCapital - t.distanceFromCapital) + 1);
                const foodCost = days * townEngine.logistics.dailyFoodCost;

                return (
                  <div 
                    key={tId}
                    style={{ 
                      padding: '10px', 
                      background: isCurrent ? '#0f172a' : '#334155', 
                      borderRadius: '8px', 
                      border: isCurrent ? '1px solid #38bdf8' : '1px solid transparent',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '13px', color: isCurrent ? '#38bdf8' : '#fff' }}>
                        {t.name} {isCurrent && '(驻扎在此)'}
                      </div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                        耗时: {days} 天 | 消耗口粮: {foodCost} 份
                      </div>
                    </div>
                    {!isCurrent && (
                      <button
                        onClick={() => handleTravel(tId)}
                        disabled={townEngine.logistics.rations < foodCost}
                        style={{
                          padding: '4px 10px',
                          background: townEngine.logistics.rations >= foodCost ? '#3b82f6' : '#64748b',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          cursor: townEngine.logistics.rations >= foodCost ? 'pointer' : 'not-allowed'
                        }}
                      >
                        拔营前往
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <button
                onClick={() => setIsTravelModalOpen(false)}
                style={{ padding: '6px 14px', background: '#475569', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
