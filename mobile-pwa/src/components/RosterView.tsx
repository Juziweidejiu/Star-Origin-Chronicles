import React from 'react';
import { ChevronRight, Crown, Grid3x3, Package, Shield, Sword, Gem } from 'lucide-react';
import type { Equipment, Hero } from '../types/hero';
import type { FormationSlotAssignment, GridColumn, GridRow } from '../types/formation';
import { GRID_SLOTS } from '../types/formation';
import { heroRoleLabel } from '../engine/heroFactory';
import { heroXpProgress } from '../engine/progressionEngine';
import { resolveStats, describeBase, STAT_LABEL } from '../engine/statResolver';
import { RARITY_LABEL } from '../engine/dungeonEngine';
import { Btn, Card, Tag } from './ui';

interface RosterViewProps {
  roster: Hero[];
  deployedHeroIds: string[];
  formationAssignments: FormationSlotAssignment[];
  formationPresetName: string;
  inventory: Equipment[];
  inventoryTarget: string;
  onInventoryTargetChange: (id: string) => void;
  onOpenFormation: () => void;
  onSwapHero: (deployedId: string, reserveId: string) => void;
  onUnequip: (heroId: string, slot: 'weapon' | 'armor' | 'trinket') => void;
  onEquip: (heroId: string, item: Equipment) => void;
}

const RARITY_COLOR: Record<string, string> = {
  legendary: '#A9793A',
  epic: '#7A4E8C',
  rare: '#2F6E8F',
  uncommon: '#4E7A5A',
  common: '#5C513C',
};

const COLUMNS: { key: GridColumn; label: string }[] = [
  { key: 'front', label: '前排' },
  { key: 'mid', label: '中排' },
  { key: 'back', label: '后卫' },
];
const ROWS: GridRow[] = ['top', 'center', 'bottom'];

const SectionHead: React.FC<{ title: string; hint?: string; right?: React.ReactNode }> = ({ title, hint, right }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, borderLeft: '3px solid var(--pz-brass)', paddingLeft: 8 }}>
      <span className="pz-h3" style={{ fontFamily: 'var(--pz-serif)', letterSpacing: '.02em' }}>{title}</span>
      {hint ? <span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>{hint}</span> : null}
    </div>
    {right}
  </div>
);

export const RosterView: React.FC<RosterViewProps> = ({
  roster,
  deployedHeroIds,
  formationAssignments,
  formationPresetName,
  inventory,
  inventoryTarget,
  onInventoryTargetChange,
  onOpenFormation,
  onSwapHero,
  onUnequip,
  onEquip,
}) => {
  const deployedSquad = roster.filter(h => deployedHeroIds.includes(h.id));
  const reserves = roster.filter(h => !deployedHeroIds.includes(h.id));
  const slotHero = (col: GridColumn, row: GridRow) => {
    const meta = GRID_SLOTS.find(s => s.col === col && s.row === row);
    if (!meta) return undefined;
    const assign = formationAssignments.find(a => a.slotId === meta.id);
    if (!assign) return undefined;
    return roster.find(h => h.id === assign.heroId);
  };

  return (
    <div className="pz-col" style={{ gap: 12 }}>
      {/* 名册概览 + 3×3 编队 */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
          <div>
            <div className="pz-h2" style={{ fontFamily: 'var(--pz-serif)' }}>
              现役名册 <span className="pz-mono" style={{ fontFamily: 'var(--pz-mono)' }}>{roster.length}/8</span>
            </div>
            <div className="pz-sub" style={{ marginTop: 2 }}>
              首发 {deployedSquad.length} · 待命 {reserves.length} · 阵型「{formationPresetName}」
            </div>
          </div>
          <Btn variant="ghost" size="sm" onClick={onOpenFormation}>
            <Grid3x3 size={13} /> 调位
          </Btn>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {COLUMNS.map(c => (
            <div key={c.key} className="pz-micro" style={{ textAlign: 'center', color: 'var(--pz-ink-3)', letterSpacing: '.14em' }}>
              {c.label}
            </div>
          ))}
          {ROWS.map(row =>
            COLUMNS.map(col => {
              const hero = slotHero(col.key, row);
              if (!hero) {
                return (
                  <div
                    key={col.key + row}
                    style={{
                      minHeight: 54,
                      borderRadius: 'var(--pz-r-seal)',
                      border: '1px dashed var(--pz-line)',
                      background: 'rgba(42,36,24,.025)',
                    }}
                  />
                );
              }
              const hpRatio = hero.maxHp > 0 ? hero.currentHp / hero.maxHp : 0;
              return (
                <div
                  key={col.key + row}
                  onClick={onOpenFormation}
                  style={{
                    minHeight: 54,
                    padding: '4px 5px',
                    borderRadius: 'var(--pz-r-seal)',
                    border: '1px solid var(--pz-line-2)',
                    background: 'var(--pz-raised)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 3,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {hero.isLeader ? <Crown size={9} color="var(--pz-brass-deep)" /> : null}
                    <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {hero.name}
                    </span>
                  </div>
                  <div className="pz-micro" style={{ color: 'var(--pz-ink-3)', lineHeight: 1 }}>
                    {heroRoleLabel(hero)} · {hero.level}级
                  </div>
                  <div style={{ height: 3, borderRadius: 2, background: 'rgba(42,36,24,.14)', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.max(0, Math.min(100, hpRatio * 100))}%`,
                        height: '100%',
                        background: hpRatio < 0.4 ? 'var(--pz-combat)' : 'var(--pz-success)',
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* 队员卡 */}
      <SectionHead
        title="队员"
        hint={`${roster.length} 人`}
        right={<span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>点击装备可卸下</span>}
      />

      {roster.map(hero => {
        const isDeployed = deployedHeroIds.includes(hero.id);
        const xp = heroXpProgress(hero);
        const st = resolveStats(hero);
        const hpRatio = hero.maxHp > 0 ? hero.currentHp / hero.maxHp : 0;

        return (
          <Card key={hero.id} variant={isDeployed ? 'raised' : 'flat'} style={{ opacity: isDeployed ? 1 : 0.94 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {hero.isLeader ? <Crown size={13} color="var(--pz-brass-deep)" /> : null}
                  <span className="pz-h2" style={{ fontFamily: 'var(--pz-serif)' }}>{hero.name}</span>
                  <Tag tone={isDeployed ? 'safe' : 'default'}>{isDeployed ? '首发' : '待命'}</Tag>
                </div>
                <div className="pz-sub" style={{ marginTop: 2 }}>
                  {hero.level} 级 {heroRoleLabel(hero)} · 周薪 {hero.wage} G
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div className="pz-mono" style={{ fontSize: 12, color: 'var(--pz-ink-2)' }}>
                  CA {hero.currentAbility}
                  <span style={{ color: 'var(--pz-ink-3)' }}> / {hero.potentialAbility}</span>
                </div>
                {!isDeployed && deployedSquad.length > 0 ? (
                  <select
                    defaultValue=""
                    onChange={e => {
                      if (e.target.value) {
                        onSwapHero(e.target.value, hero.id);
                        e.target.value = '';
                      }
                    }}
                    style={{
                      marginTop: 4,
                      background: 'var(--pz-brass)',
                      color: '#2A2115',
                      border: 'none',
                      borderRadius: 4,
                      padding: '3px 6px',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    <option value="" disabled>
                      换上首发
                    </option>
                    {deployedSquad.map(d => (
                      <option key={d.id} value={d.id}>
                        替换 {d.name}
                      </option>
                    ))}
                  </select>
                ) : isDeployed ? (
                  <Btn variant="quiet" size="sm" onClick={onOpenFormation} style={{ marginTop: 4 }}>
                    调位
                  </Btn>
                ) : null}
              </div>
            </div>

            {/* 生命 / 士气 / 压力 */}
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="pz-micro" style={{ color: 'var(--pz-ink-3)', width: 26 }}>生命</span>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(42,36,24,.12)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.max(0, Math.min(100, hpRatio * 100))}%`,
                    height: '100%',
                    background: hpRatio < 0.4 ? 'var(--pz-combat)' : 'var(--pz-success)',
                  }}
                />
              </div>
              <span className="pz-mono" style={{ fontSize: 11, color: 'var(--pz-ink-2)' }}>
                {hero.currentHp}/{hero.maxHp}
              </span>
            </div>

            {/* 经验 / 成长 */}
            <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="pz-micro" style={{ color: 'var(--pz-ink-3)', width: 26 }}>经验</span>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(42,36,24,.12)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${xp.percent}%`,
                    height: '100%',
                    background: xp.isMax ? 'var(--pz-brass)' : 'var(--pz-dungeon)',
                  }}
                />
              </div>
              <span className="pz-mono" style={{ fontSize: 11, color: 'var(--pz-ink-3)' }}>
                {xp.isMax ? '满级' : `${xp.into}/${xp.need}`}
              </span>
            </div>

            <div style={{ marginTop: 6, display: 'flex', gap: 10, fontSize: 11, color: 'var(--pz-ink-2)' }}>
              <span>士气 {hero.morale}</span>
              <span>压力 {hero.stress}/100</span>
              <span style={{ color: hero.injuries.length ? 'var(--pz-wine)' : 'var(--pz-success)' }}>
                {hero.injuries.length ? `伤残 ${hero.injuries.join('、')}` : '肢体健康'}
              </span>
            </div>

            {/* 装备 */}
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(
                [
                  ['weapon', Sword, hero.equipment.weapon],
                  ['armor', Shield, hero.equipment.armor],
                  ['trinket', Gem, hero.equipment.trinket],
                ] as const
              ).map(([slot, Icon, item]) => (
                <div
                  key={slot}
                  onClick={() => item && onUnequip(hero.id, slot)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 7px',
                    borderRadius: 'var(--pz-r-seal)',
                    border: '1px solid ' + (item ? 'var(--pz-line)' : 'transparent'),
                    background: item ? 'rgba(247,239,221,.55)' : 'transparent',
                    cursor: item ? 'pointer' : 'default',
                    fontSize: 11,
                  }}
                  title={item ? `${describeBase(item)}${item.affixText ? ' | ' + item.affixText : ''}` : ''}
                >
                  <Icon size={12} color={item ? RARITY_COLOR[item.rarity] : 'var(--pz-ink-3)'} />
                  {item ? (
                    <span style={{ color: RARITY_COLOR[item.rarity], fontWeight: 700 }}>{item.name}</span>
                  ) : (
                    <span style={{ color: 'var(--pz-ink-3)' }}>未佩戴</span>
                  )}
                  {item ? (
                    <span className="pz-micro" style={{ color: 'var(--pz-ink-3)', marginLeft: 'auto' }}>
                      {RARITY_LABEL[item.rarity]} · T{item.tier}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>

            {/* 九维面板 */}
            <div
              style={{
                marginTop: 8,
                padding: '7px 9px',
                borderRadius: 'var(--pz-r-seal)',
                background: 'var(--pz-sunken)',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '3px 8px',
                fontSize: 11,
              }}
            >
              <span>{STAT_LABEL.ad} <b className="pz-mono">{st.ad}</b></span>
              <span>{STAT_LABEL.ap} <b className="pz-mono">{st.ap}</b></span>
              <span>{STAT_LABEL.maxHp} <b className="pz-mono">{st.maxHp}</b></span>
              <span>{STAT_LABEL.armor} <b className="pz-mono">{st.armor}</b></span>
              <span>{STAT_LABEL.magicResist} <b className="pz-mono">{st.magicResist}</b></span>
              <span>攻速 <b className="pz-mono">{(1 / st.attackInterval).toFixed(2)}</b></span>
              <span>{STAT_LABEL.critChance} <b className="pz-mono">{Math.round(st.critChance * 100)}%</b></span>
              <span>{STAT_LABEL.critDamage} <b className="pz-mono">{Math.round(st.critDamage * 100)}%</b></span>
              <span>{STAT_LABEL.penetration} <b className="pz-mono">{st.penetration}</b></span>
            </div>

            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              {hero.traits.map(t => (
                <Tag key={t} tone="safe">{t}</Tag>
              ))}
            </div>
          </Card>
        );
      })}

      {/* 队伍背包 */}
      <SectionHead title="队伍背包" hint={`${inventory.length} 件`} />
      <Card>
        {inventory.length === 0 ? (
          <div className="pz-body" style={{ color: 'var(--pz-ink-3)' }}>
            背包空着。地牢里的箱子还没打开。
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Package size={13} color="var(--pz-ink-3)" />
              <span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>穿戴至</span>
              <select
                value={inventoryTarget || roster[0]?.id || ''}
                onChange={e => onInventoryTargetChange(e.target.value)}
                style={{
                  flex: 1,
                  background: 'var(--pz-raised)',
                  color: 'var(--pz-ink)',
                  border: '1px solid var(--pz-line)',
                  borderRadius: 4,
                  padding: '4px 6px',
                  fontSize: 12,
                }}
              >
                {roster.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="pz-col" style={{ gap: 6 }}>
              {inventory.map(item => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 9px',
                    borderRadius: 'var(--pz-r-seal)',
                    borderLeft: `3px solid ${RARITY_COLOR[item.rarity]}`,
                    background: 'rgba(247,239,221,.6)',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: RARITY_COLOR[item.rarity] }}>
                      {item.name}
                      <span className="pz-micro" style={{ color: 'var(--pz-ink-3)', fontWeight: 400, marginLeft: 5 }}>
                        T{item.tier}
                      </span>
                    </div>
                    <div className="pz-micro" style={{ color: 'var(--pz-ink-2)', marginTop: 1 }}>
                      {describeBase(item)}
                      {item.affixText ? <span style={{ color: 'var(--pz-ink-3)' }}> · {item.affixText}</span> : null}
                    </div>
                  </div>
                  <Btn size="sm" variant="brass" onClick={() => onEquip(inventoryTarget || roster[0]?.id || '', item)}>
                    装备
                  </Btn>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <div className="pz-micro" style={{ textAlign: 'center', color: 'var(--pz-ink-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        点击站位或「调位」进入 3×3 编队 <ChevronRight size={11} />
      </div>
    </div>
  );
};
