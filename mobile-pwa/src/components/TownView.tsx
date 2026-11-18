import React, { useState } from 'react';
import type { TownEngine } from '../engine/townEngine';
import type { TownId, BuildingType, GuildContract, TavernRecruit } from '../types/world';
import type { Hero, Equipment } from '../types/hero';
import { heroRoleLabel } from '../engine/heroFactory';
import { estimateContractOdds } from '../engine/guildEngine';
import { starsToRank } from '../types/guild';
import {
  craftCost,
  craftEquipment,
  reforgeCost,
  reforgeEquipment,
  rerollCost,
  rerollEquipment,
  salvageYield,
  salvageEquipment,
  tierForHeroLevel
} from '../engine/blacksmithEngine';
import { EQUIPMENT_TEMPLATES, RARITY_LABEL, qualityLabel } from '../engine/dungeonEngine';
import { STAT_LABEL } from '../engine/statResolver';

interface TownViewProps {
  townEngine: TownEngine;
  roster: Hero[];
  deployedHeroIds: string[];
  inventory: Equipment[];
  onRosterChange: (newRoster: Hero[]) => void;
  onInventoryChange: (newInventory: Equipment[]) => void;
  onSelectContract: (contract: GuildContract) => void;
  onLogMessage: (msg: string) => void;
  triggerUpdate: () => void;
}

export const TownView: React.FC<TownViewProps> = ({
  townEngine,
  roster,
  deployedHeroIds,
  inventory,
  onRosterChange,
  onInventoryChange,
  onSelectContract,
  onLogMessage,
  triggerUpdate
}) => {
  const currentTownId = townEngine.logistics.currentTownId;
  const currentTown = townEngine.towns[currentTownId];
  const [activeBuilding, setActiveBuilding] = useState<BuildingType>('guild');
  const [isTravelModalOpen, setIsTravelModalOpen] = useState(false);
  const [smithTab, setSmithTab] = useState<'craft' | 'reforge' | 'reroll' | 'salvage'>('craft');
  const [craftSlot, setCraftSlot] = useState<'weapon' | 'armor' | 'trinket'>('weapon');
  const [craftTier, setCraftTier] = useState(() => tierForHeroLevel(Math.max(1, ...roster.map(h => h.level))));

  const deployedSquad = roster.filter(h => deployedHeroIds.includes(h.id));
  const smithDiscount = currentTownId === 'hammerdeep_hold' ? 0.85 : 1;

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

  // 50G 打探刷新契约
  const handleScoutRefresh = () => {
    const cost = 50;
    if (townEngine.logistics.gold < cost) {
      onLogMessage(`⚠️ 金币不足！打探情报需要 ${cost}G，当前仅有 ${townEngine.logistics.gold}G`);
      return;
    }
    townEngine.logistics.gold -= cost;
    townEngine.refreshContractsForTown(currentTownId);
    onLogMessage(`🔍 花费 ${cost}G 打探情报，公会榜单已刷新！`);
    triggerUpdate();
  };

  const handleCraft = (templateIndex: number) => {
    const res = craftEquipment(templateIndex, craftTier, townEngine.logistics, smithDiscount);
    onLogMessage(res.message);
    if (res.success && res.item) {
      onInventoryChange([...inventory, res.item]);
    }
    triggerUpdate();
  };

  const handleReforge = (item: Equipment) => {
    const res = reforgeEquipment(item, townEngine.logistics, smithDiscount);
    onLogMessage(res.message);
    triggerUpdate();
  };

  const handleReroll = (item: Equipment) => {
    const res = rerollEquipment(item, townEngine.logistics, smithDiscount);
    onLogMessage(res.message);
    triggerUpdate();
  };

  const handleSalvage = (item: Equipment) => {
    if (!window.confirm(`确定分解【${item.name}】？分解后无法找回。`)) return;
    const res = salvageEquipment(item, townEngine.logistics);
    onLogMessage(res.message);
    if (res.success) {
      onInventoryChange(inventory.filter(i => i.id !== item.id));
    }
    triggerUpdate();
  };

  const EQUIPPED_SLOTS = ['weapon', 'armor', 'trinket'] as const;

  const formatBlueprintStat = (key: string, value: number) => {
    const percentish = ['critChance', 'critDamage', 'attackSpeed', 'tenacity'];
    const label = STAT_LABEL[key as keyof typeof STAT_LABEL] ?? key;
    return `${label} ${percentish.includes(key) ? `${Math.round(value * 100)}%` : value}`;
  };

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
            sanctuary: '✨ 英灵圣所',
            blacksmith: '⚒️ 铁匠铺'
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
          <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📋 在榜悬赏契约 (完成提升城邦声望)</span>
            <button
              onClick={handleScoutRefresh}
              disabled={townEngine.logistics.gold < 50}
              style={{
                padding: '4px 10px',
                background: townEngine.logistics.gold >= 50 ? '#eab308' : '#475569',
                color: '#0f172a',
                border: 'none',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 'bold',
                cursor: townEngine.logistics.gold >= 50 ? 'pointer' : 'not-allowed'
              }}
            >
              🔍 打探刷新 (50G)
            </button>
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '-4px' }}>
            赏金加成: +{Math.round((currentTown.rewardMod - 1) * 100)}% | 当前出战队伍: {deployedSquad.length}/4 人
          </div>

          {contracts.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>当前暂无可用悬赏，下周公会将发布新任务。</div>
          ) : (
            contracts.map(contract => {
              const rank = starsToRank(contract.stars);
              const odds = deployedSquad.length >= 2 ? estimateContractOdds(deployedSquad, contract) : null;
              
              // 等级印章样式
              const rankStyles: Record<string, { bg: string; border: string; color: string }> = {
                S: { bg: '#7c3aed22', border: '#7c3aed', color: '#a78bfa' },
                A: { bg: '#dc262622', border: '#dc2626', color: '#f87171' },
                B: { bg: '#ea580c22', border: '#ea580c', color: '#fb923c' },
                C: { bg: '#eab30822', border: '#eab308', color: '#fde047' },
                D: { bg: '#10b98122', border: '#10b981', color: '#6ee7b7' },
              };
              const rankStyle = rankStyles[rank] || rankStyles.D;

              return (
                <div 
                  key={contract.id} 
                  style={{ 
                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    border: '1px solid #334155',
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '8px',
                    position: 'relative'
                  }}
                >
                  {/* 顶部：等级印章 + 标题 + 赏金 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      {/* S-D 等级印章 */}
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        background: rankStyle.bg,
                        border: `2px solid ${rankStyle.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: rankStyle.color,
                        flexShrink: 0
                      }}>
                        {rank}
                      </div>
                      
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>{'★'.repeat(contract.stars)}{'☆'.repeat(5 - contract.stars)}</span>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{contract.title}</span>
                        </div>
                        {contract.targetMonster && (
                          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                            讨伐目标: {contract.targetMonster}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 }}>
                      <span style={{ fontSize: '12px', color: '#eab308', fontWeight: 'bold' }}>
                        💰 {contract.goldReward}G
                      </span>
                      {contract.specialLootDesc && (
                        <span style={{ fontSize: '9px', color: '#c084fc' }}>
                          {contract.specialLootDesc}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 描述文案 */}
                  <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.4', paddingLeft: '40px' }}>
                    {contract.description}
                  </div>

                  {/* 胜率评估与战术建议 */}
                  {odds && (
                    <div style={{
                      marginLeft: '40px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: '#0f172a',
                      border: `1px solid ${odds.dangerColor}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 'bold' }}>
                          预估胜率: {odds.winRate}%
                        </span>
                        <span style={{ fontSize: '10px', color: odds.dangerColor, fontWeight: 'bold' }}>
                          {odds.dangerLabel}
                        </span>
                      </div>
                      {odds.tacticTip && (
                        <div style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic', lineHeight: '1.3' }}>
                          💡 {odds.tacticTip}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 底部：耗时、声望、魂晶 + 接取按钮 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px', fontSize: '10px', color: '#64748b', paddingLeft: '40px' }}>
                    <div>
                      <span>耗时: {contract.durationDays} 天</span> | 
                      <span style={{ color: '#34d399', marginLeft: '4px' }}>声望 +{contract.reputationReward}</span>
                      {contract.soulCrystalReward ? <span style={{ color: '#c084fc', marginLeft: '4px' }}>| 魂晶 +{contract.soulCrystalReward}</span> : null}
                    </div>
                    <button
                      onClick={() => onSelectContract(contract)}
                      disabled={deployedSquad.length < 2}
                      style={{
                        padding: '5px 14px',
                        background: deployedSquad.length >= 2 ? '#10b981' : '#475569',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '5px',
                        fontWeight: 'bold',
                        cursor: deployedSquad.length >= 2 ? 'pointer' : 'not-allowed',
                        fontSize: '11px'
                      }}
                    >
                      接取并讨伐 ⚔️
                    </button>
                  </div>
                </div>
              );
            })
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
                    <span style={{ fontSize: '11px', color: '#38bdf8', marginLeft: '6px' }}>Lv.{rec.hero.level} {heroRoleLabel(rec.hero)}</span>
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

      {/* 建筑 6: 铁匠铺 (分解 / 打造 / 重铸 / 洗练) */}
      {activeBuilding === 'blacksmith' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#f8fafc', fontWeight: 'bold' }}>⚒️ 军械工坊</div>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                {currentTownId === 'hammerdeep_hold'
                  ? '汽锤堡的老师傅坐镇，强化与打造费用 -15%。'
                  : '炉火常亮，按佣兵水准打造合身军械。'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', fontSize: '10px', color: '#cbd5e1', textAlign: 'right' }}>
              <span>🪨 晶石 {townEngine.logistics.forgeStones}</span>
              <span>⛏️ 玄铁 {townEngine.logistics.ironOre}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            {([
              ['craft', '🔨 打造'],
              ['reforge', '🔥 重铸'],
              ['reroll', '🎲 洗练'],
              ['salvage', '♻️ 分解'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSmithTab(key)}
                style={{
                  flex: 1,
                  padding: '6px 4px',
                  borderRadius: '6px',
                  border: smithTab === key ? '1px solid #f59e0b' : '1px solid #334155',
                  background: smithTab === key ? 'rgba(245, 158, 11, 0.18)' : '#1e293b',
                  color: smithTab === key ? '#fbbf24' : '#94a3b8',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 打造 */}
          {smithTab === 'craft' && (() => {
            const cost = craftCost(craftTier, smithDiscount);
            const blueprints = EQUIPMENT_TEMPLATES
              .map((template, index) => ({ template, index }))
              .filter(({ template }) => template.slot === craftSlot);
            const canAfford = townEngine.logistics.gold >= cost.gold
              && townEngine.logistics.forgeStones >= cost.stones
              && townEngine.logistics.ironOre >= cost.ore;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {([['weapon', '⚔️ 武器'], ['armor', '🛡️ 护甲'], ['trinket', '💍 饰品']] as const).map(([slot, label]) => (
                    <button
                      key={slot}
                      onClick={() => setCraftSlot(slot)}
                      style={{
                        flex: 1, padding: '5px', borderRadius: '5px', fontSize: '10px', cursor: 'pointer',
                        border: craftSlot === slot ? '1px solid #38bdf8' : '1px solid #334155',
                        background: craftSlot === slot ? 'rgba(56, 189, 248, 0.15)' : '#0f172a',
                        color: craftSlot === slot ? '#7dd3fc' : '#94a3b8'
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#94a3b8' }}>
                  <span>装等</span>
                  {[1, 2, 3, 4, 5].map(t => (
                    <button
                      key={t}
                      onClick={() => setCraftTier(t)}
                      style={{
                        width: '24px', height: '22px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer',
                        border: craftTier === t ? '1px solid #f59e0b' : '1px solid #334155',
                        background: craftTier === t ? '#78350f' : '#0f172a',
                        color: craftTier === t ? '#fde68a' : '#64748b'
                      }}
                    >
                      {t}
                    </button>
                  ))}
                  <span style={{ marginLeft: '6px' }}>品质随机，装等越高越易出高阶</span>
                </div>

                <div style={{ fontSize: '10px', color: '#fbbf24' }}>
                  工钱 {cost.gold}G · 晶石 {cost.stones} · 玄铁 {cost.ore}
                </div>

                {blueprints.map(({ template, index }) => (
                  <div key={index} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px 10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: 'bold' }}>{template.name}</div>
                        <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>
                          {Object.entries(template.base)
                            .filter(([, v]) => v !== undefined)
                            .map(([k, v]) => formatBlueprintStat(k, v as number))
                            .join(' · ')}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCraft(index)}
                        disabled={!canAfford}
                        style={{
                          padding: '5px 12px', borderRadius: '5px', border: 'none', fontSize: '11px', fontWeight: 'bold',
                          background: canAfford ? '#f59e0b' : '#475569',
                          color: canAfford ? '#0f172a' : '#94a3b8',
                          cursor: canAfford ? 'pointer' : 'not-allowed',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        锻造
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* 重铸 */}
          {smithTab === 'reforge' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>每件装备只能重铸一次，全部基础属性与词缀提升 18%。</div>
              {roster.map(hero => (
                <div key={hero.id} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px 10px' }}>
                  <div style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: 'bold', marginBottom: '4px' }}>
                    {hero.name} <span style={{ color: '#64748b', fontWeight: 'normal' }}>Lv.{hero.level}</span>
                  </div>
                  {EQUIPPED_SLOTS.map(slot => {
                    const item = hero.equipment[slot];
                    if (!item) return null;
                    const cost = reforgeCost(item, smithDiscount);
                    const affordable = townEngine.logistics.gold >= cost;
                    return (
                      <div key={slot} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '3px 0', borderTop: '1px solid #1e293b' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '11px', color: item.reforged ? '#c084fc' : '#cbd5e1' }}>{item.name}</div>
                          <div style={{ fontSize: '9px', color: '#64748b' }}>
                            {RARITY_LABEL[item.rarity]} · 装等 {item.tier} · {qualityLabel(item.quality)} · {item.affixText ?? '无词缀'}
                          </div>
                        </div>
                        <button
                          onClick={() => handleReforge(item)}
                          disabled={item.reforged || !affordable}
                          style={{
                            padding: '4px 10px', borderRadius: '5px', border: 'none', fontSize: '10px', fontWeight: 'bold',
                            background: item.reforged ? '#334155' : affordable ? '#dc2626' : '#475569',
                            color: item.reforged || !affordable ? '#94a3b8' : '#fff',
                            cursor: item.reforged || !affordable ? 'not-allowed' : 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {item.reforged ? '已重铸' : `重铸 ${cost}G`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* 洗练 */}
          {smithTab === 'reroll' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>重掷全部词缀，保留词条数量与装备品质。</div>
              {roster.map(hero => (
                <div key={hero.id} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px 10px' }}>
                  <div style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: 'bold', marginBottom: '4px' }}>
                    {hero.name} <span style={{ color: '#64748b', fontWeight: 'normal' }}>已装备</span>
                  </div>
                  {EQUIPPED_SLOTS.map(slot => {
                    const item = hero.equipment[slot];
                    if (!item) return null;
                    const cost = rerollCost(item, smithDiscount);
                    const affordable = townEngine.logistics.gold >= cost.gold && townEngine.logistics.forgeStones >= cost.stones;
                    return (
                      <div key={slot} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '3px 0', borderTop: '1px solid #1e293b' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '11px', color: '#cbd5e1' }}>{item.name}</div>
                          <div style={{ fontSize: '9px', color: '#64748b' }}>{item.affixText ?? '无词缀'}</div>
                        </div>
                        <button
                          onClick={() => handleReroll(item)}
                          disabled={item.rarity === 'common' || !affordable}
                          style={{
                            padding: '4px 10px', borderRadius: '5px', border: 'none', fontSize: '10px', fontWeight: 'bold',
                            background: item.rarity === 'common' ? '#334155' : affordable ? '#7c3aed' : '#475569',
                            color: item.rarity === 'common' || !affordable ? '#94a3b8' : '#fff',
                            cursor: item.rarity === 'common' || !affordable ? 'not-allowed' : 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {item.rarity === 'common' ? '无词缀' : `洗练 ${cost.gold}G · ${cost.stones}石`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
              {inventory.length > 0 && (
                <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px 10px' }}>
                  <div style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: 'bold', marginBottom: '4px' }}>背包军械</div>
                  {inventory.map(item => {
                    const cost = rerollCost(item, smithDiscount);
                    const affordable = townEngine.logistics.gold >= cost.gold && townEngine.logistics.forgeStones >= cost.stones;
                    return (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '3px 0', borderTop: '1px solid #1e293b' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '11px', color: '#cbd5e1' }}>{item.name}</div>
                          <div style={{ fontSize: '9px', color: '#64748b' }}>{item.affixText ?? '无词缀'}</div>
                        </div>
                        <button
                          onClick={() => handleReroll(item)}
                          disabled={item.rarity === 'common' || !affordable}
                          style={{
                            padding: '4px 10px', borderRadius: '5px', border: 'none', fontSize: '10px', fontWeight: 'bold',
                            background: item.rarity === 'common' ? '#334155' : affordable ? '#7c3aed' : '#475569',
                            color: item.rarity === 'common' || !affordable ? '#94a3b8' : '#fff',
                            cursor: item.rarity === 'common' || !affordable ? 'not-allowed' : 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {item.rarity === 'common' ? '无词缀' : `洗练 ${cost.gold}G · ${cost.stones}石`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 分解 */}
          {smithTab === 'salvage' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>只分解背包中的淘汰军械，已装备的需先卸下。</div>
              {inventory.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', fontSize: '11px', color: '#64748b' }}>背包里没有可分解的军械。</div>
              ) : inventory.map(item => {
                const gain = salvageYield(item);
                return (
                  <div key={item.id} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '11px', color: '#cbd5e1' }}>{item.name}</div>
                      <div style={{ fontSize: '9px', color: '#64748b' }}>
                        {RARITY_LABEL[item.rarity]} · 装等 {item.tier} · {qualityLabel(item.quality)} · {item.affixText ?? '无词缀'}
                      </div>
                      <div style={{ fontSize: '9px', color: '#fbbf24', marginTop: '2px' }}>
                        回收 {gain.gold}G · {gain.stones} 晶石{gain.ore > 0 ? ` · ${gain.ore} 玄铁` : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => handleSalvage(item)}
                      style={{
                        padding: '5px 12px', borderRadius: '5px', border: '1px solid #10b981', background: 'transparent',
                        color: '#34d399', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap'
                      }}
                    >
                      分解
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 建筑 5: 英灵圣所 (软着陆死亡保护 · 灵魂引渡) */}
      {activeBuilding === 'sanctuary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            星原引魂坛 (消耗金币与稀有魂晶，引渡阵亡勇士之英魂)
          </div>

          <div style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px dashed #a855f7', padding: '10px', borderRadius: '8px', fontSize: '11px', color: '#d8b4fe' }}>
            ✨ 当前拥有的稀有魂晶: <b>{townEngine.logistics.soulCrystals}</b> 颗 (高星级公会任务奖励)
          </div>

          {townEngine.fallenSouls.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
              英灵名册空空如也，佣兵团至今尚无同伴长眠。
            </div>
          ) : (
            townEngine.fallenSouls.map((soul, idx) => (
              <div key={soul.hero.id} style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #475569' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#f87171' }}>✝️ {soul.hero.name}</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px' }}>Lv.{soul.hero.level} {heroRoleLabel(soul.hero)}</span>
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
