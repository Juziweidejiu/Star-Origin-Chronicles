import React, { useState } from 'react';
import {
  Beer,
  ChevronRight,
  Flame,
  Hammer,
  HeartPulse,
  Map as MapIcon,
  RefreshCw,
  Scale,
  Scroll,
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
import { Btn, Card, Seal, ArtImage } from './ui';
import { heroArtSources } from '../config/artAssets';
import BlacksmithView from './BlacksmithView';
import type { CraftProgress } from '../engine/craftEngine';
import { clearSave, suspendSave } from '../engine/saveEngine';

interface TownViewProps {
  townEngine: TownEngine;
  roster: Hero[];
  deployedHeroIds: string[];
  inventory: Equipment[];
  craft: CraftProgress;
  onRosterChange: (newRoster: Hero[]) => void;
  onInventoryChange: (newInventory: Equipment[]) => void;
  onCraftChange: (next: CraftProgress) => void;
  onSelectContract: (contract: GuildContract) => void;
  onLogMessage: (msg: string) => void;
  triggerUpdate: () => void;
}


const BUILDING_META: Record<BuildingType, { label: string; icon: React.ReactNode }> = {
  guild: { label: '六合行会', icon: <Scroll size={14} /> },
  tavern: { label: '酒肆', icon: <Beer size={14} /> },
  market: { label: '集市', icon: <Scale size={14} /> },
  infirmary: { label: '医馆', icon: <HeartPulse size={14} /> },
  sanctuary: { label: '引魂坛', icon: <Sparkles size={14} /> },
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
  craft,
  onRosterChange,
  onInventoryChange,
  onCraftChange,
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
  const [isTownLoreOpen, setIsTownLoreOpen] = useState(false);
  const [smithTab] = useState<string | null>(() => new URLSearchParams(window.location.search).get('smith'));
  const [smithBlueprint] = useState<string | null>(() => new URLSearchParams(window.location.search).get('bp'));

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
      onLogMessage(`铜钱不足，打探情报需要 ${cost}G。`);
      return;
    }
    townEngine.logistics.gold -= cost;
    townEngine.refreshContractsForTown(currentTownId);
    onLogMessage(`花 ${cost}G 买到一叠新消息，行会的榜子重抄了一遍。`);
    triggerUpdate();
  };

  return (
    <div className="pz-page">
      {/* ===== 固定区：城镇横幅 + 建筑切换 ===== */}
      <div className="pz-page-fixed">
      <Card style={{ padding: '12px 14px' }} className="pz-grain">
        <div className="pz-between" style={{ alignItems: 'flex-start', gap: 10 }}>
          <div className="pz-grow" style={{ minWidth: 0 }}>
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
            <div
              className="pz-sub"
              style={{
                marginTop: 2,
                color: 'var(--pz-ink-2)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {currentTown.subtitle}
            </div>
          </div>
          <Btn variant="ghost" size="sm" onClick={() => setIsTravelModalOpen(true)}>
            <MapIcon size={13} /> 转移
          </Btn>
        </div>
        <button
          onClick={() => setIsTownLoreOpen(true)}
          title="展开镇志"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            width: '100%',
            marginTop: 6,
            padding: 0,
            border: 'none',
            background: 'transparent',
            color: 'var(--pz-ink-2)',
            fontFamily: 'var(--pz-sans)',
            fontSize: 12,
            lineHeight: 1.5,
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentTown.description}
          </span>
          <ChevronRight size={11} color="var(--pz-ink-3)" style={{ flexShrink: 0 }} />
        </button>
        <div
          className="pz-row pz-between"
          style={{ marginTop: 6, paddingTop: 6, borderTop: '1px dashed var(--pz-line)', gap: 8 }}
        >
          <span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>
            自动保存 · 第 {townEngine.logistics.day} 天
          </span>
          <button
            onClick={() => {
              if (window.confirm('重新开始会清空当前所有进度（名册、铜钱、装备、地牢）。确定吗？')) {
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
      </div>

      {/* ===== 滚动区：当前建筑内容 ===== */}
      <div className="pz-page-scroll">

      {/* ===== 冒险公会 ===== */}
      {activeBuilding === 'guild' && (
        <div className="pz-col" style={{ gap: 10 }}>
          <SectionHead
            title="悬赏榜"
            hint={`赏钱加成 +${Math.round((currentTown.rewardMod - 1) * 100)}% · 出战 ${deployedSquad.length}/4 人`}
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
                      {contract.soulCrystalReward ? ` · 赏钱 +${contract.soulCrystalReward}` : ''}
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
                  <div style={{ display: 'flex', gap: 10, minWidth: 0, flex: 1 }}>
                    <ArtImage
                      sources={heroArtSources(rec.hero)}
                      alt={rec.hero.name}
                      style={{
                        width: 44,
                        height: 44,
                        flexShrink: 0,
                        borderRadius: 8,
                        objectFit: 'cover',
                        objectPosition: '50% 12%',
                        background: 'var(--pz-sunken)',
                        border: '1px solid var(--pz-line)',
                      }}
                      fallback={
                        <div
                          aria-hidden
                          style={{
                            width: 44,
                            height: 44,
                            flexShrink: 0,
                            borderRadius: 8,
                            background: 'var(--pz-sunken)',
                            border: '1px solid var(--pz-line)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: 'var(--pz-serif)',
                            fontSize: 16,
                            color: 'var(--pz-ink-2)',
                          }}
                        >
                          {rec.hero.name.replace(/^(团长·|敌·|👑)/, '').slice(-1)}
                        </div>
                      }
                    />
                    <div className="pz-grow" style={{ minWidth: 0 }}>
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
                <span style={{ fontWeight: 700, fontSize: 14 }}>伤药剂</span>
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
        <BlacksmithView
          roster={roster}
          inventory={inventory}
          craft={craft}
          logistics={townEngine.logistics}
          discount={smithDiscount}
          initialTab={smithTab}
          initialBlueprint={smithBlueprint}
          onInventoryChange={onInventoryChange}
          onRosterChange={onRosterChange}
          onCraftChange={onCraftChange}
          onLogMessage={onLogMessage}
          triggerUpdate={triggerUpdate}
        />
      )}

      {/* ===== 引魂坛 ===== */}
      {activeBuilding === 'sanctuary' && (
        <div className="pz-col" style={{ gap: 10 }}>
          <SectionHead title="引魂坛" hint="耗铜钱与稀有赏钱，引渡阵亡者之魂" />
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
            现有稀有赏钱 {log.soulCrystals} 颗（高星行会委托可得）
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
                      需 {soul.revivalSoulCrystals} 赏钱 + {soul.revivalCostGold} G
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
      </div>

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
              路程与干粮消耗按各据点间距换算
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
                          {days} 天 · 干粮 {foodCost} 份
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

      {/* ===== 镇志（描述全文） ===== */}
      {isTownLoreOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(20,16,10,.62)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setIsTownLoreOpen(false)}
        >
          <div
            className="pz pz-card pz-grain"
            style={{ width: '100%', maxWidth: 400, padding: '16px 16px' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="pz-h3" style={{ fontFamily: 'var(--pz-serif)' }}>{currentTown.name} · 镇志</div>
            <div
              className="pz-body"
              style={{ marginTop: 8, color: 'var(--pz-ink-2)', lineHeight: 1.75, maxHeight: '50vh', overflowY: 'auto' }}
            >
              {currentTown.description}
            </div>
            <div style={{ marginTop: 14 }}>
              <Btn variant="quiet" block onClick={() => setIsTownLoreOpen(false)}>知道了</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
