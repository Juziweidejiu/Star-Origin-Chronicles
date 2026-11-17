/**
 * 战利品掉落与装备对比替换弹窗 (LootDropModal)
 * 支持：
 * 1. 翻牌仪式感 / 品质光效（普通灰、优秀绿、精良蓝、史诗紫、传说金）
 * 2. 智能推荐出战英雄（法杖推法师、大盾推前锋）
 * 3. 队员头像行切换查看对比
 * 4. 属性绿增（↑ +N）与红降（↓ -N）差值对比
 * 5. 一键立即穿戴并替换原有装备
 */

import React, { useState, useMemo } from 'react';
import type { Hero, Equipment, CoreStatKey } from '../types/hero';
import { resolveStats, STAT_LABEL, DAMAGE_TYPE } from '../engine/statResolver';
import { heroRoleLabel } from '../engine/heroFactory';

interface LootDropModalProps {
  loot: Equipment;
  squad: Hero[]; // 当前出战英雄队伍 (通常为 4 人)
  onEquipToHero: (heroId: string, item: Equipment) => void;
  onPutIntoInventory: (item: Equipment) => void;
  title?: string; // 弹窗标题（例如：战利品翻牌缴获 / 宝箱直接掉落）
}

const RARITY_THEMES: Record<string, { color: string; bg: string; glow: string; name: string }> = {
  common: { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', glow: 'rgba(148, 163, 184, 0.3)', name: '普通' },
  uncommon: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)', glow: 'rgba(34, 197, 94, 0.5)', name: '优秀' },
  rare: { color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', glow: 'rgba(56, 189, 248, 0.5)', name: '精良' },
  epic: { color: '#c084fc', bg: 'rgba(192, 132, 252, 0.15)', glow: 'rgba(192, 132, 252, 0.6)', name: '史诗' },
  legendary: { color: '#facc15', bg: 'rgba(250, 204, 21, 0.2)', glow: 'rgba(250, 204, 21, 0.7)', name: '传说' },
};

export const LootDropModal: React.FC<LootDropModalProps> = ({
  loot,
  squad,
  onEquipToHero,
  onPutIntoInventory,
  title = '🎁 战利品掉落 · 装备查验'
}) => {
  const [isRevealed, setIsRevealed] = useState(false);

  // 智能推荐逻辑：判断队伍中谁最适合该装备
  const recommendedHeroId = useMemo(() => {
    if (!squad.length) return null;
    const slot = loot.slot;

    // 如果是武器
    if (slot === 'weapon') {
      const isMagicWeapon = Boolean(loot.base.ap || loot.affixes.some(a => a.stat === 'ap'));
      if (isMagicWeapon) {
        const caster = squad.find(h => DAMAGE_TYPE[h.classId] === 'magic');
        if (caster) return caster.id;
      } else {
        const physical = squad.find(h => DAMAGE_TYPE[h.classId] === 'physical');
        if (physical) return physical.id;
      }
    } else if (slot === 'armor') {
      // 防具优先推坦克
      const tank = squad.find(h => h.role === 'tank');
      if (tank) return tank.id;
    }
    return squad[0].id;
  }, [loot, squad]);

  const [selectedHeroId, setSelectedHeroId] = useState<string>(recommendedHeroId || squad[0]?.id || '');

  const selectedHero = squad.find(h => h.id === selectedHeroId) || squad[0];
  const currentEquippedItem = selectedHero ? selectedHero.equipment[loot.slot] : undefined;

  // 计算穿戴前与穿戴后的属性对比
  const currentStats = useMemo(() => selectedHero ? resolveStats(selectedHero) : null, [selectedHero]);
  const simulatedStats = useMemo(() => {
    if (!selectedHero) return null;
    const simHero: Hero = {
      ...selectedHero,
      equipment: {
        ...selectedHero.equipment,
        [loot.slot]: loot,
      }
    };
    return resolveStats(simHero);
  }, [selectedHero, loot]);

  const rarityInfo = RARITY_THEMES[loot.rarity] || RARITY_THEMES.common;

  // 翻牌前背面状态
  if (!isRevealed) {
    return (
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.98)',
          border: '2px solid #eab308',
          borderRadius: '12px',
          padding: '24px 16px',
          color: '#fff',
          textAlign: 'center',
          boxShadow: '0 12px 35px rgba(234, 179, 8, 0.35)',
          animation: 'fadeIn 0.25s ease-out'
        }}
      >
        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fde047', marginBottom: '8px' }}>
          ✨ 战利品翻牌
        </div>
        <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '18px' }}>
          肃清强敌缴获了一件稀有物资，点击翻开封印卡牌
        </div>

        {/* 翻牌卡牌背面 */}
        <div
          onClick={() => setIsRevealed(true)}
          style={{
            margin: '0 auto',
            width: '180px',
            height: '240px',
            background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
            border: '2px dashed #f59e0b',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            transform: 'scale(1)',
            transition: 'transform 0.2s',
          }}
        >
          <div style={{ fontSize: '42px', marginBottom: '8px', animation: 'bounce 1.5s infinite' }}>
            🎴
          </div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fde047' }}>
            点击翻牌查验
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
            装等 {loot.tier} 阶
          </div>
        </div>
      </div>
    );
  }

  // 对比的主要属性列表
  const compareKeys: CoreStatKey[] = ['ad', 'ap', 'armor', 'magicResist', 'maxHp', 'critChance', 'healingPower'];

  return (
    <div
      style={{
        background: 'rgba(15, 23, 42, 0.98)',
        border: `2px solid ${rarityInfo.color}`,
        borderRadius: '12px',
        padding: '16px',
        color: '#fff',
        boxShadow: `0 12px 35px ${rarityInfo.glow}`,
        animation: 'fadeIn 0.25s ease-out',
        maxHeight: '85vh',
        overflowY: 'auto'
      }}
    >
      {/* 标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontSize: '15px', fontWeight: 'bold', color: rarityInfo.color }}>
          {title}
        </span>
        <span style={{ fontSize: '10px', background: rarityInfo.bg, color: rarityInfo.color, padding: '2px 8px', borderRadius: '4px', border: `1px solid ${rarityInfo.color}` }}>
          {rarityInfo.name} · {loot.slot === 'weapon' ? '武器' : loot.slot === 'armor' ? '防具' : '饰品'}
        </span>
      </div>

      {/* 装备名与基础词条展示 */}
      <div
        style={{
          background: 'rgba(30, 41, 59, 0.8)',
          border: `1px solid ${rarityInfo.color}`,
          borderRadius: '8px',
          padding: '10px 12px',
          marginBottom: '12px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: rarityInfo.color }}>
            {loot.name}
          </span>
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>
            装等 {loot.tier} 阶
          </span>
        </div>

        {/* 基础属性 */}
        <div style={{ fontSize: '11px', color: '#e2e8f0', marginTop: '6px' }}>
          {Object.entries(loot.base).map(([k, v]) => (
            <span key={k} style={{ marginRight: '10px' }}>
              {STAT_LABEL[k as CoreStatKey]}: <b style={{ color: '#38bdf8' }}>+{v}</b>
            </span>
          ))}
        </div>

        {/* 附加词条 */}
        {loot.affixes.length > 0 && (
          <div style={{ borderTop: '1px dashed #475569', marginTop: '6px', paddingTop: '4px', fontSize: '10px', color: '#a78bfa' }}>
            {loot.affixes.map((af, i) => (
              <div key={i}>
                • {af.label}: {af.kind === 'percent' ? `+${Math.round(af.value * 100)}%` : `+${af.value}`}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 切换对比英雄头像栏 */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
          选择比对穿戴队员 (推荐: <b style={{ color: '#fde047' }}>{squad.find(h => h.id === recommendedHeroId)?.name || '前锋'}</b>)
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {squad.map(h => {
            const isSelected = h.id === selectedHeroId;
            const isRec = h.id === recommendedHeroId;
            return (
              <button
                key={h.id}
                onClick={() => setSelectedHeroId(h.id)}
                style={{
                  flex: 1,
                  padding: '5px 4px',
                  background: isSelected ? 'rgba(56, 189, 248, 0.25)' : '#1e293b',
                  border: isSelected ? '1px solid #38bdf8' : '1px solid #334155',
                  borderRadius: '6px',
                  color: isSelected ? '#38bdf8' : '#cbd5e1',
                  cursor: 'pointer',
                  textAlign: 'center',
                  position: 'relative'
                }}
              >
                {isRec && (
                  <span style={{ position: 'absolute', top: '-4px', right: '-2px', fontSize: '8px', background: '#eab308', color: '#0f172a', padding: '0 3px', borderRadius: '3px', fontWeight: 'bold' }}>
                    荐
                  </span>
                )}
                <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{h.name}</div>
                <div style={{ fontSize: '9px', color: '#94a3b8' }}>{heroRoleLabel(h)}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 左右对比栏：当前穿戴 vs 新掉落替换效果 */}
      <div
        style={{
          background: '#0f172a',
          borderRadius: '8px',
          padding: '10px',
          marginBottom: '14px',
          border: '1px solid #334155'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '8px', borderBottom: '1px solid #334155', paddingBottom: '4px' }}>
          <span style={{ color: '#94a3b8' }}>
            当前: {currentEquippedItem ? currentEquippedItem.name : '（空手槽位）'}
          </span>
          <span style={{ color: '#fde047', fontWeight: 'bold' }}>
            替换后属性差值
          </span>
        </div>

        {currentStats && simulatedStats && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {compareKeys.map(k => {
              const before = (currentStats as any)[k] ?? 0;
              const after = (simulatedStats as any)[k] ?? 0;
              const isCrit = k === 'critChance';
              const diff = isCrit
                ? Math.round((after - before) * 100)
                : Math.round(after - before);
              if (diff === 0 && before === 0) return null;

              const isUp = diff > 0;
              const isDown = diff < 0;

              return (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', background: '#1e293b', padding: '4px 8px', borderRadius: '4px' }}>
                  <span style={{ color: '#94a3b8' }}>{STAT_LABEL[k]}</span>
                  <div>
                    <span style={{ color: '#e2e8f0', marginRight: '4px' }}>
                      {isCrit ? `${Math.round(after * 100)}%` : after}
                    </span>
                    {isUp && (
                      <span style={{ color: '#22c55e', fontWeight: 'bold' }}>
                        ↑+{isCrit ? `${diff}%` : diff}
                      </span>
                    )}
                    {isDown && (
                      <span style={{ color: '#ef4444', fontWeight: 'bold' }}>
                        ↓{isCrit ? `${diff}%` : diff}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 底部双按钮：直接穿戴替换 / 放入战利品背包 */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => {
            if (selectedHero) {
              onEquipToHero(selectedHero.id, loot);
            }
          }}
          style={{
            flex: 1.3,
            padding: '10px 0',
            background: '#22c55e',
            color: '#0f172a',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '12px',
            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.35)'
          }}
        >
          ⚔️ 装备给 [{selectedHero?.name}]
        </button>
        <button
          onClick={() => {
            onPutIntoInventory(loot);
          }}
          style={{
            flex: 1,
            padding: '10px 0',
            background: '#334155',
            color: '#cbd5e1',
            border: '1px solid #475569',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          🎒 存入战利品包
        </button>
      </div>
    </div>
  );
};
