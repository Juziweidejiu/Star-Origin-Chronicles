/**
 * 战斗结算统计面板组件 (BattleStatsModal)
 * 展示战斗时长、MVP 最佳英雄徽章、输出榜/承伤榜/治疗榜柱状占比条
 */

import React, { useState } from 'react';
import type { BattleSettlementSummary } from '../types/combatSettlement';
import type { HeroProgressionResult } from '../types/progression';
import { heroRoleLabel } from '../engine/heroFactory';

interface BattleStatsModalProps {
  summary: BattleSettlementSummary;
  progression?: HeroProgressionResult[];
  onNext: () => void; // 点击继续：进入战利品开箱/返回沙盘
}

type StatTab = 'damage' | 'taken' | 'heal';

export const BattleStatsModal: React.FC<BattleStatsModalProps> = ({ summary, progression, onNext }) => {
  const [activeTab, setActiveTab] = useState<StatTab>('damage');

  const { playerPerformances, mvpHeroId, winner, durationSeconds } = summary;
  const isVictory = winner === 'player';

  const mvp = playerPerformances.find(p => p.hero.id === mvpHeroId) || playerPerformances[0];

  // 计算当前 Tab 下的最大值用于百分比柱状条绘制
  const maxVal = Math.max(
    1,
    ...playerPerformances.map(p =>
      activeTab === 'damage' ? p.damageDealt : activeTab === 'taken' ? p.damageTaken : p.healingDone
    )
  );

  return (
    <div
      style={{
        background: 'rgba(15, 23, 42, 0.98)',
        border: isVictory ? '2px solid #10b981' : '2px solid #ef4444',
        borderRadius: '12px',
        padding: '16px',
        color: '#fff',
        boxShadow: isVictory
          ? '0 12px 30px rgba(16, 185, 129, 0.35)'
          : '0 12px 30px rgba(239, 68, 68, 0.35)',
        width: '100%',
        boxSizing: 'border-box',
        animation: 'fadeIn 0.25s ease-out'
      }}
    >
      {/* 头部标题与战斗耗时 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <span style={{ fontSize: '16px', fontWeight: 'bold', color: isVictory ? '#34d399' : '#f87171' }}>
            {isVictory ? '🎉 战役大捷 · 强敌肃清' : '💀 战役惨败 · 溃散撤离'}
          </span>
          <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '8px' }}>
            耗时 {durationSeconds}s
          </span>
        </div>
        <div style={{ fontSize: '10px', background: '#334155', padding: '2px 8px', borderRadius: '4px', color: '#cbd5e1' }}>
          阶段 1/2 · 战绩
        </div>
      </div>

      {/* MVP 黄金展台 */}
      {mvp && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(30, 41, 59, 0.7) 100%)',
            border: '1px solid #eab308',
            borderRadius: '8px',
            padding: '10px 12px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#ca8a04',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 'bold',
                boxShadow: '0 0 10px rgba(234, 179, 8, 0.6)'
              }}
            >
              👑
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#fef08a' }}>
                  {mvp.hero.name}
                </span>
                <span style={{ fontSize: '10px', background: 'rgba(234, 179, 8, 0.25)', color: '#fde047', padding: '1px 5px', borderRadius: '3px' }}>
                  全场 MVP
                </span>
              </div>
              <div style={{ fontSize: '10px', color: '#cbd5e1', marginTop: '2px' }}>
                {heroRoleLabel(mvp.hero)} · 综合战绩评分 {mvp.mvpScore}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '11px', color: '#fde047' }}>
            <div>击杀: {mvp.kills}</div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>暴击: {mvp.critsCount}次</div>
          </div>
        </div>
      )}

      {/* 经验与成长结算 */}
      {progression && progression.length > 0 && (
        <div
          style={{
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid #0ea5e9',
            borderRadius: '8px',
            padding: '10px 12px',
            marginBottom: '14px',
            animation: 'fadeIn 0.35s ease-out'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#7dd3fc' }}>📈 战后成长结算</span>
            <span style={{ fontSize: '9px', color: '#94a3b8' }}>MVP 经验 +15%</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {progression.map(p => {
              const leveledUp = p.levelAfter > p.levelBefore;
              return (
                <div key={p.heroId} style={{ background: '#0f172a', borderRadius: '6px', padding: '6px 8px', border: leveledUp ? '1px solid #eab308' : '1px solid #1e293b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                    <span style={{ color: '#e2e8f0', fontWeight: 'bold' }}>
                      {p.heroName}
                      {p.isMvp && <span style={{ marginLeft: '5px', fontSize: '9px', color: '#fde047' }}>MVP</span>}
                    </span>
                    <span style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ color: '#38bdf8' }}>经验 +{p.xpGained}</span>
                      {p.caGained > 0 && <span style={{ color: '#a78bfa' }}>能力 +{p.caGained}</span>}
                      {leveledUp ? (
                        <span
                          style={{
                            color: '#fde047',
                            fontWeight: 'bold',
                            fontSize: '11px',
                            background: 'rgba(234, 179, 8, 0.18)',
                            padding: '1px 6px',
                            borderRadius: '4px'
                          }}
                        >
                          ⬆ Lv.{p.levelBefore} → Lv.{p.levelAfter}
                        </span>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '10px' }}>Lv.{p.levelAfter}</span>
                      )}
                    </span>
                  </div>
                  {p.attributeGains.length > 0 && (
                    <div style={{ marginTop: '3px', fontSize: '9px', color: '#94a3b8' }}>
                      属性成长: {p.attributeGains.slice(0, 4).map(g => `${g.label}+${g.amount}`).join(' · ')}
                      {p.attributeGains.length > 4 ? ' …' : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 榜单切换 Tab */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
        <button
          onClick={() => setActiveTab('damage')}
          style={{
            flex: 1,
            padding: '6px 0',
            background: activeTab === 'damage' ? '#dc2626' : '#1e293b',
            color: '#fff',
            border: activeTab === 'damage' ? '1px solid #ef4444' : '1px solid #334155',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: activeTab === 'damage' ? 'bold' : 'normal'
          }}
        >
          ⚔️ 输出榜
        </button>
        <button
          onClick={() => setActiveTab('taken')}
          style={{
            flex: 1,
            padding: '6px 0',
            background: activeTab === 'taken' ? '#2563eb' : '#1e293b',
            color: '#fff',
            border: activeTab === 'taken' ? '1px solid #3b82f6' : '1px solid #334155',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: activeTab === 'taken' ? 'bold' : 'normal'
          }}
        >
          🛡️ 承伤榜
        </button>
        <button
          onClick={() => setActiveTab('heal')}
          style={{
            flex: 1,
            padding: '6px 0',
            background: activeTab === 'heal' ? '#16a34a' : '#1e293b',
            color: '#fff',
            border: activeTab === 'heal' ? '1px solid #22c55e' : '1px solid #334155',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: activeTab === 'heal' ? 'bold' : 'normal'
          }}
        >
          💚 治疗榜
        </button>
      </div>

      {/* 柱状统计条列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        {playerPerformances.map((p, idx) => {
          const val = activeTab === 'damage' ? p.damageDealt : activeTab === 'taken' ? p.damageTaken : p.healingDone;
          const pct = Math.round((val / maxVal) * 100);
          const barColor = activeTab === 'damage' ? '#f87171' : activeTab === 'taken' ? '#60a5fa' : '#4ade80';

          return (
            <div key={p.hero.id} style={{ background: '#1e293b', padding: '6px 10px', borderRadius: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 'bold', color: '#e2e8f0' }}>
                  #{idx + 1} {p.hero.name} <span style={{ fontSize: '9px', color: '#94a3b8' }}>({p.hero.role === 'tank' ? '盾' : p.hero.role === 'healer' ? '医' : '刃'})</span>
                </span>
                <span style={{ fontWeight: 'bold', color: barColor }}>
                  {val.toLocaleString()} pt
                </span>
              </div>
              <div style={{ height: '6px', background: '#0f172a', borderRadius: '3px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.max(4, pct)}%`,
                    height: '100%',
                    background: barColor,
                    borderRadius: '3px',
                    transition: 'width 0.4s ease-out'
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 下一步操作按钮 */}
      <button
        onClick={onNext}
        style={{
          width: '100%',
          padding: '10px 16px',
          background: isVictory ? '#38bdf8' : '#ef4444',
          color: isVictory ? '#0f172a' : '#fff',
          fontWeight: 'bold',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '13px',
          boxShadow: isVictory ? '0 4px 12px rgba(56, 189, 248, 0.35)' : '0 4px 12px rgba(239, 68, 68, 0.35)'
        }}
      >
        {isVictory ? '查看战利品与翻牌 🎁 ➔' : '先遣队溃退 · 撤回医馆 🏥'}
      </button>
    </div>
  );
};
