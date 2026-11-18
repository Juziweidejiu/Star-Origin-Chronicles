import React, { useState } from 'react';
import {
  Beer,
  ChevronRight,
  Dices,
  Flame,
  Gem,
  Hammer,
  HeartPulse,
  Map as MapIcon,
  Pickaxe,
  Recycle,
  RefreshCw,
  Scale,
  Scroll,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Utensils,
} from 'lucide-react';
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
  tierForHeroLevel,
} from '../engine/blacksmithEngine';
import { EQUIPMENT_TEMPLATES, RARITY_LABEL, qualityLabel } from '../engine/dungeonEngine';
import { STAT_LABEL } from '../engine/statResolver';
import { Btn, Card, Seal } from './ui';
import { clearSave, suspendSave } from '../engine/saveEngine';

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

const EQUIPPED_SLOTS = ['weapon', 'armor', 'trinket'] as const;
const PERCENTISH = ['critChance', 'critDamage', 'attackSpeed', 'tenacity'];

const BUILDING_META: Record<BuildingType, { label: string; icon: React.ReactNode }> = {
  guild: { label: '冒险公会', icon: <Scroll size={14} /> },
  tavern: { label: '佣兵酒馆', icon: <Beer size={14} /> },
  market: { label: '补给市集', icon: <Scale size={14} /> },
  infirmary: { label: '随军医馆', icon: <HeartPulse size={14} /> },
  sanctuary: { label: '英灵圣所', icon: <Sparkles size={14} /> },
  blacksmith: { label: '铁匠铺', icon: <Hammer size={14} /> },
};

/** 段落小标题：左侧印章式竖线 + 标题，右侧可挂操作 */
const SectionHead: React.FC<{ title: string; hint?: string; right?: React.ReactNode }> = ({ title, hint, right }) => (
  <div className="pz-between" style={{ alignItems: 'flex-end', marginBottom: 8 }}>
    <div>
      <div className="pz-row" style={{ gap: 6 }}>
        <span style={{ width: 3, height: 13, background: 'var(--pz-brass)', borderRadius: 2 }} />
        <span style={{ fontFamily: 'var(--pz-serif)', fontSize: 15, fontWeight: 700, letterSpacing: '.02em' }}>{title}</span>
      </div>
      {hint && <div className="pz-micro" style={{ color: 'var(--pz-ink-3)', marginTop: 3, marginLeft: 9 }}>{hint}</div>}
    </div>
    {right}
  </div>
);

const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    className="pz-body"
    style={{
      padding: '22px 12px',
      textAlign: 'center',
      color: 'var(--pz-ink-3)',
      border: '1px dashed var(--pz-line-2)',
      borderRadius: 'var(--pz-r-card)',
    }}
  >
    {children}
  </div>
);

/** 行内的细属性条 */
const ThinBar: React.FC<{ ratio: number; tone?: string }> = ({ ratio, tone = 'var(--pz-success)' }) => (
  <div style={{ height: 4, background: 'var(--pz-sunken)', borderRadius: 2, overflow: 'hidden', border: '1px solid var(--pz-line)' }}>
    <div style={{ width: `${Math.max(0, Math.min(1, ratio)) * 100}%`, height: '100%', background: tone, transition: 'width .3s' }} />
  </div>
);

export const TownView: React.FC<TownViewProps> = ({
  townEngine,
  roster,
  deployedHeroIds,
  inventory,
  onRosterChange,
  onInventoryChange,
  onSelectContract,
  onLogMessage,
  triggerUpdate,
}) => {
  const currentTownId = townEngine.logistics.currentTownId;
  const currentTown = townEngine.towns[currentTownId];
  const [activeBuilding, setActiveBuilding] = useState<BuildingType>(() => {
    // 便于直接调试某个设施：?b=blacksmith
    const q = new URLSearchParams(window.location.search).get('b') as BuildingType | null;
    const all: BuildingType[] = ['guild', 'tavern', 'market', 'infirmary', 'sanctuary', 'blacksmith'];
    return q && all.includes(q) ? q : 'guild';
  });
  const [isTravelModalOpen, setIsTravelModalOpen] = useState(false);
  const [smithTab, setSmithTab] = useState<'craft' | 'reforge' | 'reroll' | 'salvage'>('craft');
  const [craftSlot, setCraftSlot] = useState<'weapon' | 'armor' | 'trinket'>('weapon');
  const [craftTier, setCraftTier] = useState(() => tierForHeroLevel(Math.max(1, ...roster.map(h => h.level))));

  const deployedSquad = roster.filter(h => deployedHeroIds.includes(h.id));
  const smithDiscount = currentTownId === 'hammerdeep_hold' ? 0.85 : 1;
  const log = townEngine.logistics;

  const handleTravel = (targetTownId: TownId) => {
    const res = townEngine.travelToTown(targetTownId, roster);
    onLogMessage(res.message);
    if (res.success) {
      setIsTravelModalOpen(false);
      triggerUpdate();
    }
  };

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

  const handleHire = (recruit: TavernRecruit) => {
    const res = townEngine.hireRecruit(recruit.id, roster);
    onLogMessage(res.message);
    if (res.success && res.newHero) {
      onRosterChange([...roster, res.newHero]);
      triggerUpdate();
    }
  };

  const handleHeal = (hero: Hero) => {
    const res = townEngine.healHeroAtInfirmary(hero);
    onLogMessage(res.message);
    triggerUpdate();
  };

  const handleRevive = (index: number) => {
    const res = townEngine.reviveSoul(index, roster);
    onLogMessage(res.message);
    if (res.success && res.revivedHero) {
      onRosterChange([...roster, res.revivedHero]);
      triggerUpdate();
    }
  };

  const getReputationBadge = (rep: number) => {
    if (rep >= 60) return { label: '崇拜', color: 'var(--pz-arcane)' };
    if (rep >= 20) return { label: '友善', color: 'var(--pz-success)' };
    if (rep >= -20) return { label: '中立', color: 'var(--pz-brass-deep)' };
    return { label: '冷淡', color: 'var(--pz-wine)' };
  };

  const repBadge = getReputationBadge(currentTown.reputation);
  const contracts = townEngine.contracts[currentTownId] || [];
  const recruits = townEngine.tavernRecruits[currentTownId] || [];

  const handleScoutRefresh = () => {
    const cost = 50;
    if (townEngine.logistics.gold < cost) {
      onLogMessage(`金币不足，打探情报需要 ${cost}G。`);
      return;
    }
    townEngine.logistics.gold -= cost;
    townEngine.refreshContractsForTown(currentTownId);
    onLogMessage(`花 ${cost}G 买到一叠新消息，公会的榜子重抄了一遍。`);
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

  const formatBlueprintStat = (key: string, value: number) => {
    const label = STAT_LABEL[key as keyof typeof STAT_LABEL] ?? key;
    return `${label} ${PERCENTISH.includes(key) ? `${Math.round(value * 100)}%` : value}`;
  };

  const craftCostPreview = craftCost(craftTier, smithDiscount);

  return (
    <div className="pz-col" style={{ gap: 12 }}>
      {/* ===== 城镇横幅 ===== */}
      <Card style={{ padding: '14px' }} className="pz-grain">
        <div className="pz-between" style={{ alignItems: 'flex-start', gap: 10 }}>
          <div className="pz-grow">
            <div className="pz-row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <h2 className="pz-h1" style={{ fontFamily: 'var(--pz-serif)' }}>{currentTown.name}</h2>
              <span
                className="pz-micro"
                style={{
                  padding: '2px 7px',
                  borderRadius: 999,
                  color: repBadge.color,
                  border: `1px solid ${repBadge.color}`,
                  background: 'rgba(255,255,255,.35)',
                  whiteSpace: 'nowrap',
                }}
              >
                {repBadge.label} · {currentTown.reputation}
              </span>
            </div>
            <div className="pz-sub" style={{ marginTop: 4, color: 'var(--pz-ink-2)' }}>{currentTown.subtitle}</div>
          </div>
          <Btn variant="ghost" size="sm" onClick={() => setIsTravelModalOpen(true)}>
            <MapIcon size={13} /> 转移
          </Btn>
        </div>
        <div
          className="pz-body"
          style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--pz-line)', color: 'var(--pz-ink-2)' }}
        >
          {currentTown.description}
        </div>
        <div
          className="pz-row pz-between"
          style={{ marginTop: 10, paddingTop: 8, borderTop: '1px dashed var(--pz-line)', gap: 8 }}
        >
          <span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>
            进度自动保存 · 第 {townEngine.logistics.day} 天
          </span>
          <button
            onClick={() => {
              if (window.confirm('重新开始会清空当前所有进度（名册、金币、装备、地牢）。确定吗？')) {
                suspendSave();
                clearSave();
                window.location.reload();
              }
            }}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontSize: '10px',
              color: 'var(--pz-ink-3)',
              textDecoration: 'underline dotted',
              fontFamily: 'var(--pz-sans)',
            }}
          >
            重新开始
          </button>
        </div>
      </Card>

      {/* ===== 建筑切换 ===== */}
      <div className="pz-row" style={{ gap: 6, flexWrap: 'wrap', paddingBottom: 2 }}>
        {currentTown.buildings.map(b => {
          const meta = BUILDING_META[b];
          const isAct = activeBuilding === b;
          return (
            <button
              key={b}
              onClick={() => setActiveBuilding(b)}
              style={{
                flex: '1 1 30%',
                minWidth: 0,
                padding: '7px 6px',
                borderRadius: 'var(--pz-r-btn)',
                border: `1px solid ${isAct ? 'var(--pz-brass-deep)' : 'var(--pz-line)'}`,
                background: isAct ? 'var(--pz-brass)' : 'rgba(255,255,255,.32)',
                color: isAct ? '#2A2115' : 'var(--pz-ink-2)',
                fontWeight: isAct ? 700 : 500,
                fontSize: 12,
                fontFamily: 'var(--pz-sans)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                whiteSpace: 'nowrap',
                overflow: 'hidden'
              }}
            >
              {meta.icon}
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* ===== 冒险公会 ===== */}
      {activeBuilding === 'guild' && (
        <div className="pz-col" style={{ gap: 10 }}>
          <SectionHead
            title="悬赏榜"
            hint={`赏金加成 +${Math.round((currentTown.rewardMod - 1) * 100)}% · 出战 ${deployedSquad.length}/4 人`}
            right={
              <Btn variant="ghost" size="sm" onClick={handleScoutRefresh} disabled={log.gold < 50}>
                <RefreshCw size={12} /> 打探 50G
              </Btn>
            }
          />

          {contracts.length === 0 ? (
            <Empty>榜子上空着。等公会抄完新一批悬赏再来。</Empty>
          ) : (
            contracts.map(contract => {
              const rank = contract.rank ?? starsToRank(contract.stars);
              const odds = deployedSquad.length >= 2 ? estimateContractOdds(deployedSquad, contract) : null;
              return (
                <Card key={contract.id} style={{ padding: '12px' }}>
                  <div className="pz-row" style={{ alignItems: 'flex-start', gap: 10 }}>
                    <Seal rank={rank} />
                    <div className="pz-grow" style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--pz-serif)', fontSize: 15, fontWeight: 700, lineHeight: 1.35 }}>
                        {contract.title}
                      </div>
                      <div
                        className="pz-micro"
                        style={{ color: 'var(--pz-ink-3)', marginTop: 3, display: 'flex', gap: 6, flexWrap: 'wrap' }}
                      >
                        <span style={{ letterSpacing: 1, color: 'var(--pz-brass-deep)' }}>
                          {'★'.repeat(contract.stars)}
                          {'☆'.repeat(5 - contract.stars)}
                        </span>
                        {contract.targetMonster && <span>· 讨伐 {contract.targetMonster}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--pz-brass-deep)' }}>{contract.goldReward} G</div>
                      {contract.specialLootDesc && (
                        <div className="pz-micro" style={{ color: 'var(--pz-arcane)', marginTop: 2 }}>
                          {contract.specialLootDesc}
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="pz-body" style={{ margin: '8px 0 0', color: 'var(--pz-ink-2)' }}>
                    {contract.description}
                  </p>

                  {odds && (
                    <div className="pz-card pz-card--sunken" style={{ marginTop: 9, padding: '8px 10px' }}>
                      <div className="pz-between">
                        <span className="pz-row" style={{ gap: 7 }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: odds.dangerColor }}>{odds.winRate}%</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: odds.dangerColor }}>{odds.dangerLabel}</span>
                        </span>
                        <span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>
                          {odds.partyPower} : {odds.enemyPower}
                        </span>
                      </div>
                      <div className="pz-micro" style={{ marginTop: 4, color: 'var(--pz-ink-2)', lineHeight: 1.5 }}>
                        {odds.tacticTip}
                      </div>
                    </div>
                  )}

                  <div className="pz-between" style={{ marginTop: 10, alignItems: 'center' }}>
                    <span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>
                      {contract.durationDays} 天 · 声望 +{contract.reputationReward}
                      {contract.soulCrystalReward ? ` · 魂晶 +${contract.soulCrystalReward}` : ''}
                    </span>
                    <Btn
                      variant="brass"
                      size="sm"
                      disabled={deployedSquad.length < 2}
                      onClick={() => onSelectContract(contract)}
                    >
                      <Swords size={13} /> 接取
                    </Btn>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ===== 佣兵酒馆 ===== */}
      {activeBuilding === 'tavern' && (
        <div className="pz-col" style={{ gap: 10 }}>
          <SectionHead title="候聘佣兵" hint={`名册 ${roster.length}/8 人 · 签约即随队出征`} />
          {recruits.length === 0 ? (
            <Empty>酒馆今日冷清，暂时没有愿意接活的人。</Empty>
          ) : (
            recruits.map(rec => (
              <Card key={rec.id} style={{ padding: '12px' }}>
                <div className="pz-between" style={{ alignItems: 'flex-start', gap: 10 }}>
                  <div className="pz-grow">
                    <div className="pz-row" style={{ gap: 8 }}>
                      <span style={{ fontFamily: 'var(--pz-serif)', fontSize: 15, fontWeight: 700 }}>{rec.hero.name}</span>
                      <span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>
                        Lv.{rec.hero.level} {heroRoleLabel(rec.hero)}
                      </span>
                    </div>
                    <div className="pz-micro" style={{ marginTop: 3, letterSpacing: 1, color: 'var(--pz-brass-deep)' }}>
                      {rec.starRatingRange}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--pz-brass-deep)' }}>{rec.hireCost} G</div>
                    <div className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>周薪 {rec.hero.wage} G</div>
                  </div>
                </div>

                <p
                  className="pz-body"
                  style={{
                    margin: '8px 0',
                    color: 'var(--pz-ink-2)',
                    fontStyle: 'italic',
                    paddingLeft: 9,
                    borderLeft: '2px solid var(--pz-line-2)',
                  }}
                >
                  {rec.backgroundStory}
                </p>

                <div className="pz-between" style={{ alignItems: 'center' }}>
                  <span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>
                    CA {rec.hero.currentAbility}
                  </span>
                  <Btn variant="brass" size="sm" onClick={() => handleHire(rec)} disabled={log.gold < rec.hireCost}>
                    签约
                  </Btn>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ===== 补给市集 ===== */}
      {activeBuilding === 'market' && (
        <div className="pz-col" style={{ gap: 10 }}>
          <SectionHead title="物资交易所" hint={`本镇物价 ${Math.round(currentTown.supplyCostMod * 10)} 折`} />

          <Card style={{ padding: '12px' }}>
            <div className="pz-between" style={{ alignItems: 'center', marginBottom: 8 }}>
              <span className="pz-row" style={{ gap: 7 }}>
                <Utensils size={16} color="var(--pz-brass-deep)" />
                <span style={{ fontWeight: 700, fontSize: 14 }}>行军干粮</span>
              </span>
              <span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>存 {log.rations}</span>
            </div>
            <div className="pz-row" style={{ gap: 6 }}>
              <Btn variant="ghost" size="sm" style={{ flex: 1 }} onClick={() => handleBuyRations(10)}>
                +10 份 · {Math.round(60 * currentTown.supplyCostMod)}G
              </Btn>
              <Btn variant="brass" size="sm" style={{ flex: 1 }} onClick={() => handleBuyRations(30)}>
                +30 份 · {Math.round(180 * currentTown.supplyCostMod)}G
              </Btn>
            </div>
          </Card>

          <Card style={{ padding: '12px' }}>
            <div className="pz-between" style={{ alignItems: 'center', marginBottom: 8 }}>
              <span className="pz-row" style={{ gap: 7 }}>
                <Flame size={16} color="var(--pz-combat)" />
                <span style={{ fontWeight: 700, fontSize: 14 }}>金创药剂</span>
              </span>
              <span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>存 {log.medicines}</span>
            </div>
            <div className="pz-row" style={{ gap: 6 }}>
              <Btn variant="ghost" size="sm" style={{ flex: 1 }} onClick={() => handleBuyMedicine(1)}>
                +1 瓶 · {Math.round(50 * currentTown.supplyCostMod)}G
              </Btn>
              <Btn variant="brass" size="sm" style={{ flex: 1 }} onClick={() => handleBuyMedicine(3)}>
                +3 瓶 · {Math.round(150 * currentTown.supplyCostMod)}G
              </Btn>
            </div>
          </Card>
        </div>
      )}

      {/* ===== 随军医馆 ===== */}
      {activeBuilding === 'infirmary' && (
        <div className="pz-col" style={{ gap: 10 }}>
          <SectionHead title="伤患疗养所" hint="按伤势计价，越拖越贵" />
          {roster.map(hero => {
            const needHeal = hero.currentHp < hero.maxHp || hero.injuries.length > 0;
            const cost = Math.round(
              ((hero.maxHp - hero.currentHp) * 0.4 + hero.injuries.length * 35) * currentTown.supplyCostMod
            );
            return (
              <Card key={hero.id} style={{ padding: '11px 12px' }}>
                <div className="pz-between" style={{ alignItems: 'center', marginBottom: 6 }}>
                  <span className="pz-row" style={{ gap: 7 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, fontFamily: 'var(--pz-serif)' }}>{hero.name}</span>
                    <span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>
                      {hero.currentHp}/{hero.maxHp}
                    </span>
                  </span>
                  {needHeal ? (
                    <Btn variant="brass" size="sm" onClick={() => handleHeal(hero)} disabled={log.gold < cost}>
                      医治 {cost}G
                    </Btn>
                  ) : (
                    <span className="pz-micro" style={{ color: 'var(--pz-success)' }}>无须就医</span>
                  )}
                </div>
                <ThinBar
                  ratio={hero.maxHp > 0 ? hero.currentHp / hero.maxHp : 0}
                  tone={hero.currentHp / Math.max(1, hero.maxHp) < 0.4 ? 'var(--pz-combat)' : 'var(--pz-success)'}
                />
                <div className="pz-micro" style={{ marginTop: 5, color: 'var(--pz-ink-3)' }}>
                  {hero.injuries.length > 0 ? hero.injuries.join(' · ') : '肢体健康'}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ===== 铁匠铺 ===== */}
      {activeBuilding === 'blacksmith' && (
        <div className="pz-col" style={{ gap: 10 }}>
          <Card style={{ padding: '12px' }}>
            <div className="pz-between" style={{ alignItems: 'center' }}>
              <div>
                <div className="pz-row" style={{ gap: 6 }}>
                  <Hammer size={15} color="var(--pz-brass-deep)" />
                  <span style={{ fontFamily: 'var(--pz-serif)', fontSize: 15, fontWeight: 700 }}>军械工坊</span>
                </div>
                <div className="pz-micro" style={{ color: 'var(--pz-ink-3)', marginTop: 3 }}>
                  {currentTownId === 'hammerdeep_hold'
                    ? '汽锤堡的老师傅坐镇，工钱与料钱都便宜一成半。'
                    : '炉火常亮，按佣兵身板打造合身军械。'}
                </div>
              </div>
              <div className="pz-row" style={{ gap: 10 }}>
                <span className="pz-row" style={{ gap: 4 }}>
                  <Gem size={13} color="var(--pz-arcane)" />
                  <span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>晶石</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{log.forgeStones}</span>
                </span>
                <span className="pz-row" style={{ gap: 4 }}>
                  <Pickaxe size={13} color="var(--pz-ink-2)" />
                  <span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>玄铁</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{log.ironOre}</span>
                </span>
              </div>
            </div>
          </Card>

          <div className="pz-row" style={{ gap: 5 }}>
            {([
              ['craft', '打造', <Hammer size={12} key="c" />],
              ['reforge', '重铸', <Flame size={12} key="r" />],
              ['reroll', '洗练', <Dices size={12} key="d" />],
              ['salvage', '分解', <Recycle size={12} key="s" />],
            ] as const).map(([key, label, icon]) => {
              const on = smithTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setSmithTab(key)}
                  style={{
                    flex: 1,
                    padding: '7px 4px',
                    borderRadius: 'var(--pz-r-btn)',
                    border: `1px solid ${on ? 'var(--pz-brass-deep)' : 'var(--pz-line)'}`,
                    background: on ? 'var(--pz-brass)' : 'rgba(255,255,255,.3)',
                    color: on ? '#2A2115' : 'var(--pz-ink-2)',
                    fontSize: 12,
                    fontWeight: on ? 700 : 500,
                    fontFamily: 'var(--pz-sans)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                  }}
                >
                  {icon}
                  {label}
                </button>
              );
            })}
          </div>

          {/* 打造 */}
          {smithTab === 'craft' && (
            <div className="pz-col" style={{ gap: 9 }}>
              <div className="pz-row" style={{ gap: 5 }}>
                {([
                  ['weapon', '武器', <Swords size={12} key="w" />],
                  ['armor', '护甲', <Shield size={12} key="a" />],
                  ['trinket', '饰品', <Gem size={12} key="t" />],
                ] as const).map(([slot, label, icon]) => {
                  const on = craftSlot === slot;
                  return (
                    <button
                      key={slot}
                      onClick={() => setCraftSlot(slot)}
                      style={{
                        flex: 1,
                        padding: '6px 4px',
                        borderRadius: 'var(--pz-r-btn)',
                        border: `1px solid ${on ? 'var(--pz-wine)' : 'var(--pz-line)'}`,
                        background: on ? 'rgba(138,59,50,.10)' : 'transparent',
                        color: on ? 'var(--pz-wine)' : 'var(--pz-ink-2)',
                        fontSize: 12,
                        fontWeight: on ? 700 : 500,
                        fontFamily: 'var(--pz-sans)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                      }}
                    >
                      {icon}
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="pz-row" style={{ gap: 5 }}>
                {[1, 2, 3, 4, 5].map(t => {
                  const on = craftTier === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setCraftTier(t)}
                      style={{
                        flex: 1,
                        padding: '6px 0',
                        borderRadius: 'var(--pz-r-btn)',
                        border: `1px solid ${on ? 'var(--pz-brass-deep)' : 'var(--pz-line)'}`,
                        background: on ? 'var(--pz-brass)' : 'transparent',
                        color: on ? '#2A2115' : 'var(--pz-ink-3)',
                        fontSize: 12,
                        fontWeight: on ? 700 : 500,
                        fontFamily: 'var(--pz-mono)',
                        cursor: 'pointer',
                      }}
                    >
                      T{t}
                    </button>
                  );
                })}
              </div>

              <div className="pz-between" style={{ alignItems: 'center' }}>
                <span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>
                  工钱 {craftCostPreview.gold}G · 晶石 {craftCostPreview.stones} · 玄铁 {craftCostPreview.ore}
                </span>
                <span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>品质随机</span>
              </div>

              {EQUIPMENT_TEMPLATES.filter(t => t.slot === craftSlot).map(template => {
                const idx = EQUIPMENT_TEMPLATES.indexOf(template);
                const afford =
                  log.gold >= craftCostPreview.gold &&
                  log.forgeStones >= craftCostPreview.stones &&
                  log.ironOre >= craftCostPreview.ore;
                return (
                  <Card key={template.name} variant="sunken" style={{ padding: '10px 11px' }}>
                    <div className="pz-between" style={{ alignItems: 'center', gap: 8 }}>
                      <div className="pz-grow" style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{template.name}</div>
                        <div className="pz-micro" style={{ color: 'var(--pz-ink-3)', marginTop: 2 }}>
                          {Object.entries(template.base)
                            .filter(([, v]) => (v as number) > 0)
                            .map(([k, v]) => formatBlueprintStat(k, v as number))
                            .join(' · ')}
                        </div>
                      </div>
                      <Btn variant="brass" size="sm" onClick={() => handleCraft(idx)} disabled={!afford}>
                        锻造
                      </Btn>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* 重铸 */}
          {smithTab === 'reforge' && (
            <div className="pz-col" style={{ gap: 9 }}>
              <div className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>
                每件装备只能重铸一次，基础属性与词缀一并提升 18%。
              </div>
              {roster.map(hero => (
                <Card key={hero.id} style={{ padding: '11px 12px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 7, fontFamily: 'var(--pz-serif)' }}>
                    {hero.name}
                  </div>
                  <div className="pz-col" style={{ gap: 7 }}>
                    {EQUIPPED_SLOTS.map(slot => {
                      const item = hero.equipment[slot];
                      if (!item) {
                        return (
                          <div key={slot} className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>
                            {slot === 'weapon' ? '武器' : slot === 'armor' ? '护甲' : '饰品'} · 空
                          </div>
                        );
                      }
                      const cost = reforgeCost(item, smithDiscount);
                      return (
                        <div key={slot} className="pz-between" style={{ alignItems: 'center', gap: 8 }}>
                          <div className="pz-grow" style={{ minWidth: 0 }}>
                            <div
                              className="pz-truncate"
                              style={{ fontSize: 13, fontWeight: 600, color: item.reforged ? 'var(--pz-arcane)' : 'var(--pz-ink)' }}
                            >
                              {item.name}
                            </div>
                            <div className="pz-micro pz-truncate" style={{ color: 'var(--pz-ink-3)', marginTop: 2 }}>
                              {RARITY_LABEL[item.rarity]} · T{item.tier} · {qualityLabel(item.quality)} ·{' '}
                              {item.affixText || '无词缀'}
                            </div>
                          </div>
                          {item.reforged ? (
                            <span className="pz-micro" style={{ color: 'var(--pz-ink-3)', flexShrink: 0 }}>已重铸</span>
                          ) : (
                            <Btn variant="brass" size="sm" onClick={() => handleReforge(item)} disabled={log.gold < cost}>
                              {cost}G
                            </Btn>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* 洗练 */}
          {smithTab === 'reroll' && (
            <div className="pz-col" style={{ gap: 9 }}>
              <div className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>
                重掷全部词缀，保留词条数量与装备品质。
              </div>
              {roster.map(hero => {
                const items = EQUIPPED_SLOTS.map(s => hero.equipment[s]).filter(Boolean) as Equipment[];
                if (items.length === 0) return null;
                return (
                  <Card key={hero.id} style={{ padding: '11px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 7, fontFamily: 'var(--pz-serif)' }}>
                      {hero.name}
                    </div>
                    <div className="pz-col" style={{ gap: 7 }}>
                      {items.map(item => {
                        const cost = rerollCost(item, smithDiscount);
                        const common = item.rarity === 'common';
                        return (
                          <div key={item.id} className="pz-between" style={{ alignItems: 'center', gap: 8 }}>
                            <div className="pz-grow" style={{ minWidth: 0 }}>
                              <div className="pz-truncate" style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                              <div className="pz-micro pz-truncate" style={{ color: 'var(--pz-ink-3)', marginTop: 2 }}>
                                {item.affixText || '无词缀'}
                              </div>
                            </div>
                            <Btn
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReroll(item)}
                              disabled={common || log.gold < cost.gold || log.forgeStones < cost.stones}
                            >
                              {cost.gold}G · {cost.stones}石
                            </Btn>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}

              {inventory.length > 0 && (
                <Card variant="sunken" style={{ padding: '11px 12px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 7, fontFamily: 'var(--pz-serif)' }}>
                    背包军械
                  </div>
                  <div className="pz-col" style={{ gap: 7 }}>
                    {inventory.map(item => {
                      const cost = rerollCost(item, smithDiscount);
                      const common = item.rarity === 'common';
                      return (
                        <div key={item.id} className="pz-between" style={{ alignItems: 'center', gap: 8 }}>
                          <div className="pz-grow" style={{ minWidth: 0 }}>
                            <div className="pz-truncate" style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                            <div className="pz-micro pz-truncate" style={{ color: 'var(--pz-ink-3)', marginTop: 2 }}>
                              {item.affixText || '无词缀'}
                            </div>
                          </div>
                          <Btn
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReroll(item)}
                            disabled={common || log.gold < cost.gold || log.forgeStones < cost.stones}
                          >
                            {cost.gold}G · {cost.stones}石
                          </Btn>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* 分解 */}
          {smithTab === 'salvage' && (
            <div className="pz-col" style={{ gap: 9 }}>
              <div className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>
                只分解背包里的淘汰军械；已装备的需先在名册里卸下。
              </div>
              {inventory.length === 0 ? (
                <Empty>背包里没有可分解的军械。</Empty>
              ) : (
                inventory.map(item => {
                  const gain = salvageYield(item);
                  return (
                    <Card key={item.id} style={{ padding: '11px 12px' }}>
                      <div className="pz-between" style={{ alignItems: 'center', gap: 8 }}>
                        <div className="pz-grow" style={{ minWidth: 0 }}>
                          <div className="pz-truncate" style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                          <div className="pz-micro pz-truncate" style={{ color: 'var(--pz-ink-3)', marginTop: 2 }}>
                            {RARITY_LABEL[item.rarity]} · T{item.tier} · {qualityLabel(item.quality)} ·{' '}
                            {item.affixText || '无词缀'}
                          </div>
                          <div className="pz-micro" style={{ color: 'var(--pz-success)', marginTop: 3 }}>
                            回收 {gain.gold}G · {gain.stones} 晶石
                            {gain.ore > 0 ? ` · ${gain.ore} 玄铁` : ''}
                          </div>
                        </div>
                        <Btn variant="ghost" size="sm" onClick={() => handleSalvage(item)}>
                          <Recycle size={12} /> 分解
                        </Btn>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== 英灵圣所 ===== */}
      {activeBuilding === 'sanctuary' && (
        <div className="pz-col" style={{ gap: 10 }}>
          <SectionHead title="星原引魂坛" hint="耗金币与稀有魂晶，引渡阵亡者之魂" />
          <div
            className="pz-row"
            style={{
              gap: 7,
              padding: '9px 11px',
              border: '1px dashed var(--pz-arcane)',
              borderRadius: 'var(--pz-r-card)',
              color: 'var(--pz-arcane)',
              fontSize: 12,
            }}
          >
            <Sparkles size={14} />
            现有稀有魂晶 {log.soulCrystals} 颗（高星公会委托可得）
          </div>

          {townEngine.fallenSouls.length === 0 ? (
            <Empty>名册背面没有新的名字。至今无人长眠。</Empty>
          ) : (
            townEngine.fallenSouls.map((soul, idx) => (
              <Card key={idx} style={{ padding: '11px 12px' }}>
                <div className="pz-between" style={{ alignItems: 'flex-start', gap: 8 }}>
                  <div className="pz-grow">
                    <div className="pz-row" style={{ gap: 6 }}>
                      <Skull size={14} color="var(--pz-ink-3)" />
                      <span style={{ fontFamily: 'var(--pz-serif)', fontSize: 14, fontWeight: 700 }}>
                        {soul.hero.name}
                      </span>
                      <span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>
                        Lv.{soul.hero.level} {heroRoleLabel(soul.hero)}
                      </span>
                    </div>
                    <div className="pz-micro" style={{ color: 'var(--pz-ink-3)', marginTop: 4 }}>
                      阵亡于第 {soul.deathDate} 天 · {soul.deathLocation}
                    </div>
                    <div className="pz-micro" style={{ color: 'var(--pz-brass-deep)', marginTop: 2 }}>
                      需 {soul.revivalSoulCrystals} 魂晶 + {soul.revivalCostGold} G
                    </div>
                  </div>
                  <Btn
                    variant="brass"
                    size="sm"
                    onClick={() => handleRevive(idx)}
                    disabled={log.soulCrystals < soul.revivalSoulCrystals || log.gold < soul.revivalCostGold}
                  >
                    引渡
                  </Btn>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ===== 据点转移 ===== */}
      {isTravelModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(20,16,10,.62)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
          onClick={() => setIsTravelModalOpen(false)}
        >
          <div
            className="pz pz-grain"
            style={{
              width: '100%',
              maxWidth: 480,
              background: 'var(--pz-page)',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: `16px 14px calc(env(safe-area-inset-bottom,0px) + 16px)`,
              maxHeight: '86vh',
              overflowY: 'auto',
              animation: 'riseIn .22s ease-out',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="pz-h2" style={{ fontFamily: 'var(--pz-serif)', marginBottom: 4 }}>选择行军目的地</div>
            <div className="pz-micro" style={{ color: 'var(--pz-ink-3)', marginBottom: 12 }}>
              路程与口粮消耗按各据点间距换算
            </div>

            <div className="pz-col" style={{ gap: 8 }}>
              {Object.values(townEngine.towns).map(t => {
                const days = Math.max(1, Math.abs(currentTown.distanceFromCapital - t.distanceFromCapital) + 1);
                const foodCost = days * log.dailyFoodCost;
                const here = t.id === currentTownId;
                return (
                  <Card key={t.id} variant={here ? 'sunken' : 'flat'} style={{ padding: '11px 12px' }}>
                    <div className="pz-between" style={{ alignItems: 'center', gap: 8 }}>
                      <div className="pz-grow" style={{ minWidth: 0 }}>
                        <div className="pz-row" style={{ gap: 6 }}>
                          <span style={{ fontFamily: 'var(--pz-serif)', fontSize: 14, fontWeight: 700 }}>{t.name}</span>
                          {here && <span className="pz-micro" style={{ color: 'var(--pz-brass-deep)' }}>驻扎中</span>}
                        </div>
                        <div className="pz-micro" style={{ color: 'var(--pz-ink-3)', marginTop: 2 }}>
                          {days} 天 · 口粮 {foodCost} 份
                        </div>
                      </div>
                      {here ? (
                        <span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>
                          <ChevronRight size={12} />
                        </span>
                      ) : (
                        <Btn
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTravel(t.id)}
                          disabled={log.rations < foodCost}
                        >
                          拔营
                        </Btn>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>

            <div style={{ marginTop: 12 }}>
              <Btn variant="quiet" block onClick={() => setIsTravelModalOpen(false)}>取消</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
