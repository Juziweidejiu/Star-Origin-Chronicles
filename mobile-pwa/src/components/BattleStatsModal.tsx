/**
 * 战斗结算面板
 * 战绩、MVP、战后成长与三榜统计；纸面语言，底部按钮固定可点。
 */

import React, { useState } from 'react';
import type { BattleSettlementSummary } from '../types/combatSettlement';
import type { HeroProgressionResult } from '../types/progression';
import { heroRoleLabel } from '../engine/heroFactory';

interface BattleStatsModalProps {
  summary: BattleSettlementSummary;
  progression?: HeroProgressionResult[];
  onNext: () => void;
}

type StatTab = 'damage' | 'taken' | 'heal';

const TABS: Array<{ id: StatTab; label: string }> = [
  { id: 'damage', label: '输出榜' },
  { id: 'taken', label: '承伤榜' },
  { id: 'heal', label: '治疗榜' },
];

export const BattleStatsModal: React.FC<BattleStatsModalProps> = ({ summary, progression, onNext }) => {
  const [activeTab, setActiveTab] = useState<StatTab>('damage');

  const { playerPerformances, mvpHeroId, winner, durationSeconds } = summary;
  const isVictory = winner === 'player';
  const mvp = playerPerformances.find(p => p.hero.id === mvpHeroId) || playerPerformances[0];

  const maxVal = Math.max(
    1,
    ...playerPerformances.map(p =>
      activeTab === 'damage' ? p.damageDealt : activeTab === 'taken' ? p.damageTaken : p.healingDone
    )
  );

  const barTone =
    activeTab === 'damage' ? 'var(--pz-wine)' : activeTab === 'taken' ? '#2F6E8F' : '#3F6E52';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 130px)',
        background: 'var(--pz-raised)',
        border: `1px solid ${isVictory ? 'rgba(74,122,94,.55)' : 'rgba(138,59,50,.55)'}`,
        borderRadius: 'var(--pz-r-card)',
        boxShadow: '0 14px 34px rgba(42,36,24,.30)',
        color: 'var(--pz-ink)',
        overflow: 'hidden',
        animation: 'popIn .22s ease-out',
      }}
    >
      {/* 头部 */}
      <div
        style={{
          padding: '12px 14px 10px',
          borderBottom: '1px solid var(--pz-line)',
          background: 'linear-gradient(180deg, rgba(42,36,24,.05), transparent)',
        }}
      >
        <div className="pz-between">
          <span
            style={{
              fontFamily: 'var(--pz-serif)',
              fontSize: '16px',
              color: isVictory ? '#3F6E52' : 'var(--pz-wine)',
            }}
          >
            {isVictory ? '战役大捷' : '溃散撤离'}
          </span>
          <span className="pz-mono" style={{ fontSize: '10px', color: 'var(--pz-ink-3)' }}>
            耗时 {durationSeconds}s
          </span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--pz-ink-3)', marginTop: '2px' }}>
          战绩总览 · 第 1 步 / 共 2 步
        </div>
      </div>

      {/* 可滚动内容 */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px' }}>
        {/* MVP */}
        {mvp && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              padding: '9px 11px',
              borderRadius: 'var(--pz-r-btn)',
              background: 'rgba(217,164,91,.14)',
              border: '1px solid rgba(169,121,58,.45)',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
              <span
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: 'var(--pz-brass)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  flexShrink: 0,
                }}
              >
                ★
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }}>{mvp.hero.name}</span>
                  <span
                    style={{
                      fontSize: '9px',
                      padding: '0 4px',
                      borderRadius: '3px',
                      background: 'var(--pz-brass-deep)',
                      color: '#F6EFDF',
                    }}
                  >
                    全场 MVP
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--pz-ink-2)', marginTop: '1px' }}>
                  {heroRoleLabel(mvp.hero)} · 综合评分 {mvp.mvpScore}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '10px', color: 'var(--pz-ink-2)', flexShrink: 0 }}>
              <div>击杀 {mvp.kills}</div>
              <div>暴击 {mvp.critsCount}</div>
            </div>
          </div>
        )}

        {/* 战后成长 */}
        {progression && progression.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div className="pz-between" style={{ marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--pz-ink-2)' }}>战后成长</span>
              <span style={{ fontSize: '9px', color: 'var(--pz-ink-3)' }}>MVP 经验 +15%</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {progression.map(p => {
                const leveledUp = p.levelAfter > p.levelBefore;
                return (
                  <div
                    key={p.heroId}
                    style={{
                      background: 'var(--pz-sunken)',
                      borderRadius: 'var(--pz-r-seal)',
                      padding: '6px 8px',
                      border: leveledUp ? '1px solid var(--pz-brass-deep)' : '1px solid var(--pz-line)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                      <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.heroName}
                        {p.isMvp && <span style={{ marginLeft: '4px', fontSize: '9px', color: 'var(--pz-brass-deep)' }}>MVP</span>}
                      </span>
                      <span style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                        <span style={{ color: '#2F6E8F' }}>经验 +{p.xpGained}</span>
                        {p.caGained > 0 && <span style={{ color: '#6B4E9E' }}>能力 +{p.caGained}</span>}
                        {leveledUp ? (
                          <span
                            className="pz-mono"
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#7A5410',
                              background: 'rgba(217,164,91,.30)',
                              padding: '0 5px',
                              borderRadius: '3px',
                            }}
                          >
                            Lv.{p.levelBefore}→{p.levelAfter}
                          </span>
                        ) : (
                          <span className="pz-mono" style={{ fontSize: '10px', color: 'var(--pz-ink-3)' }}>
                            Lv.{p.levelAfter}
                          </span>
                        )}
                      </span>
                    </div>
                    {p.attributeGains.length > 0 && (
                      <div style={{ marginTop: '2px', fontSize: '10px', color: 'var(--pz-ink-3)' }}>
                        属性成长 {p.attributeGains.slice(0, 4).map(g => `${g.label}+${g.amount}`).join(' · ')}
                        {p.attributeGains.length > 4 ? ' …' : ''}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 三榜切换 */}
        <div style={{ display: 'flex', gap: '5px', marginBottom: '9px' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                flex: 1,
                padding: '6px 0',
                background: activeTab === t.id ? 'var(--pz-wine)' : 'transparent',
                color: activeTab === t.id ? '#F6EFDF' : 'var(--pz-ink-2)',
                border: `1px solid ${activeTab === t.id ? 'var(--pz-wine)' : 'var(--pz-line-2)'}`,
                borderRadius: 'var(--pz-r-btn)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: activeTab === t.id ? 600 : 400,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 榜单 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
          {playerPerformances.map((p, idx) => {
            const val = activeTab === 'damage' ? p.damageDealt : activeTab === 'taken' ? p.damageTaken : p.healingDone;
            const pct = Math.round((val / maxVal) * 100);
            return (
              <div key={p.hero.id} style={{ background: 'var(--pz-sunken)', padding: '6px 9px', borderRadius: 'var(--pz-r-seal)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600 }}>
                    #{idx + 1} {p.hero.name}
                    <span style={{ fontSize: '10px', color: 'var(--pz-ink-3)', marginLeft: '4px' }}>
                      {p.hero.role === 'tank' ? '盾' : p.hero.role === 'healer' ? '医' : '刃'}
                    </span>
                  </span>
                  <span className="pz-mono" style={{ fontWeight: 700, color: barTone }}>
                    {val.toLocaleString()}
                  </span>
                </div>
                <div style={{ height: '4px', background: 'rgba(42,36,24,.14)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.max(4, pct)}%`,
                      height: '100%',
                      background: barTone,
                      borderRadius: '3px',
                      transition: 'width .4s ease-out',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 固定底部按钮 */}
      <div style={{ padding: '10px 14px 12px', borderTop: '1px solid var(--pz-line)' }}>
        <button
          onClick={onNext}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'var(--pz-wine)',
            color: '#F6EFDF',
            fontWeight: 600,
            border: 'none',
            borderRadius: 'var(--pz-r-btn)',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          {isVictory ? '查看战利品 · 翻牌' : '撤回城邦医馆'}
        </button>
      </div>
    </div>
  );
};
