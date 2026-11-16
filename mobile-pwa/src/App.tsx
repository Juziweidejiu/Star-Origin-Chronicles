import { useState, useEffect } from 'react';
import { generateHero } from './engine/heroFactory';
import { CombatEngine, type CombatUnit } from './engine/combatEngine';
import type { Hero } from './types/hero';

export function App() {
  const [activeTab, setActiveTab] = useState<'roster' | 'combat' | 'guild'>('combat');

  // 初始化主角与队员
  const [party] = useState<Hero[]>(() => [
    generateHero('blademaster', true), // 主角团长
    generateHero('guardian', false),   // 坦克
    generateHero('cleric', false),     // 牧师
    generateHero('ranger', false)      // 射手
  ]);

  // 战斗状态机
  const [engine, setEngine] = useState<CombatEngine | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [combatUnits, setCombatUnits] = useState<CombatUnit[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isAutoUlt, setIsAutoUlt] = useState<boolean>(true);

  // 初始化一场战斗
  const startNewBattle = () => {
    const enemies = [
      generateHero('warden', false),
      generateHero('blademaster', false),
      generateHero('arcanist', false),
      generateHero('bard', false)
    ].map(e => ({ ...e, name: '荒野狂盗·' + e.name.slice(3) }));

    const eng = new CombatEngine(party, enemies);
    // 同步自动大招设置
    eng.units.forEach(u => {
      if (u.side === 'player') u.autoUlt = isAutoUlt;
    });
    setEngine(eng);
    setCombatUnits([...eng.units]);
    setLogs([...eng.logs]);
    setIsRunning(true);
  };

  useEffect(() => {
    startNewBattle();
  }, []);

  // 战斗循环 Tick (60 FPS 或 200ms 心跳)
  useEffect(() => {
    if (!isRunning || !engine || engine.isFinished) return;

    const timer = setInterval(() => {
      engine.tick(0.2);
      setCombatUnits([...engine.units]);
      setLogs([...engine.logs]);
    }, 200);

    return () => clearInterval(timer);
  }, [isRunning, engine]);

  // 切换自动/手动大招
  const toggleAutoUlt = () => {
    const nextVal = !isAutoUlt;
    setIsAutoUlt(nextVal);
    if (engine) {
      engine.units.forEach(u => {
        if (u.side === 'player') u.autoUlt = nextVal;
      });
    }
  };

  // 玩家手动点击释放大招
  const handleManualUlt = (unit: CombatUnit) => {
    if (!engine || unit.side !== 'player' || unit.resource < 100 || unit.isDead) return;
    engine.triggerUltimate(unit);
    setCombatUnits([...engine.units]);
    setLogs([...engine.logs]);
  };

  const playerUnits = combatUnits.filter(u => u.side === 'player');
  const enemyUnits = combatUnits.filter(u => u.side === 'enemy');

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: '#0f172a', color: '#f8fafc', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      
      {/* 顶部状态栏 (iOS 安全区风格) */}
      <header style={{ padding: '12px 16px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#38bdf8' }}>⚔️ 破晓佣兵团</span>
          <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '8px' }}>第 12 天 | 金币: 850 G</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={toggleAutoUlt}
            style={{ 
              padding: '4px 10px', 
              fontSize: '11px', 
              borderRadius: '16px', 
              border: 'none', 
              cursor: 'pointer',
              background: isAutoUlt ? '#10b981' : '#64748b', 
              color: '#fff', 
              fontWeight: 'bold' 
            }}
          >
            {isAutoUlt ? '⚡ 大招: 自动' : '✋ 大招: 手动'}
          </button>
        </div>
      </header>

      {/* 核心内容区 */}
      <main style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
        
        {/* 导航 Tab */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          {(['combat', 'roster', 'guild'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: activeTab === tab ? '#38bdf8' : '#1e293b',
                color: activeTab === tab ? '#0f172a' : '#94a3b8',
                fontWeight: 'bold',
                fontSize: '12px'
              }}
            >
              {tab === 'combat' && '🗡️ 地牢交战'}
              {tab === 'roster' && '👥 佣兵名册'}
              {tab === 'guild' && '🏰 城镇与公会'}
            </button>
          ))}
        </div>

        {activeTab === 'combat' && (
          <div>
            {/* 战场双方状态卡片 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 'bold' }}>我方先遣队</span>
              <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 'bold' }}>敌方劫掠者</span>
            </div>

            {/* 双方队伍列表 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              
              {/* 我方队友 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {playerUnits.map(unit => {
                  const hpPct = Math.round((unit.currentHp / unit.maxHp) * 100);
                  const canUlt = unit.resource >= 100 && !unit.isDead;
                  return (
                    <div 
                      key={unit.hero.id} 
                      onClick={() => handleManualUlt(unit)}
                      style={{ 
                        background: '#1e293b', 
                        padding: '8px', 
                        borderRadius: '8px', 
                        border: canUlt && !isAutoUlt ? '2px solid #eab308' : '1px solid #334155',
                        opacity: unit.isDead ? 0.35 : 1,
                        cursor: canUlt && !isAutoUlt ? 'pointer' : 'default',
                        boxShadow: canUlt && !isAutoUlt ? '0 0 10px rgba(234, 179, 8, 0.5)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold' }}>
                        <span>{unit.hero.isLeader ? '👑 ' : ''}{unit.hero.name.slice(0, 5)}</span>
                        <span style={{ color: '#38bdf8' }}>{unit.hero.role}</span>
                      </div>
                      
                      {/* 生命条 */}
                      <div style={{ background: '#334155', height: '6px', borderRadius: '3px', margin: '4px 0', overflow: 'hidden' }}>
                        <div style={{ background: hpPct > 30 ? '#10b981' : '#ef4444', height: '100%', width: `${hpPct}%`, transition: 'width 0.2s' }} />
                      </div>
                      
                      {/* 能量条 / 大招提示 */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: '#94a3b8' }}>
                        <span>HP {unit.currentHp}/{unit.maxHp}</span>
                        {canUlt && !isAutoUlt ? (
                          <span style={{ color: '#eab308', fontWeight: 'bold' }}>点按大招!</span>
                        ) : (
                          <span>⚡ {Math.round(unit.resource)}%</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 敌方部队 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {enemyUnits.map(unit => {
                  const hpPct = Math.round((unit.currentHp / unit.maxHp) * 100);
                  return (
                    <div key={unit.hero.id} style={{ background: '#1e293b', padding: '8px', borderRadius: '8px', border: '1px solid #334155', opacity: unit.isDead ? 0.35 : 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold' }}>
                        <span>{unit.hero.name.slice(0, 5)}</span>
                        <span style={{ color: '#ef4444' }}>{unit.hero.role}</span>
                      </div>
                      <div style={{ background: '#334155', height: '6px', borderRadius: '3px', margin: '4px 0', overflow: 'hidden' }}>
                        <div style={{ background: '#ef4444', height: '100%', width: `${hpPct}%`, transition: 'width 0.2s' }} />
                      </div>
                      <div style={{ fontSize: '9px', color: '#94a3b8', textAlign: 'right' }}>
                        HP {unit.currentHp}/{unit.maxHp}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* 战况结果提示 */}
            {engine?.isFinished && (
              <div style={{ 
                padding: '12px', 
                borderRadius: '8px', 
                background: engine.winner === 'player' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', 
                border: engine.winner === 'player' ? '1px solid #10b981' : '1px solid #ef4444',
                marginBottom: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: engine.winner === 'player' ? '#34d399' : '#f87171' }}>
                  {engine.winner === 'player' ? '🎉 战役告捷！获得暗黑战利品：【破损的龙鳞板甲】' : '💀 战败溃败，队员负伤！'}
                </div>
                <button
                  onClick={startNewBattle}
                  style={{ marginTop: '8px', padding: '6px 16px', background: '#38bdf8', color: '#0f172a', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  继续下一场清剿
                </button>
              </div>
            )}

            {/* 战术操作控制条 */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <button
                onClick={() => setIsRunning(!isRunning)}
                style={{ flex: 1, padding: '8px', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
              >
                {isRunning ? '⏸️ 暂停演练' : '▶️ 恢复推演'}
              </button>
              <button
                onClick={startNewBattle}
                style={{ padding: '8px 12px', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
              >
                🔄 重开战场
              </button>
            </div>

            {/* 战斗实时日志流 */}
            <div style={{ background: '#0b1329', padding: '10px', borderRadius: '8px', height: '180px', overflowY: 'auto', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px', borderBottom: '1px solid #1e293b', paddingBottom: '4px' }}>
                📜 实时战术推演日志 (Gambit 驱动)
              </div>
              {logs.map(log => (
                <div key={log.id} style={{ fontSize: '11px', margin: '3px 0', color: log.type === 'ult' ? '#eab308' : log.type === 'heal' ? '#34d399' : log.type === 'death' ? '#f87171' : '#cbd5e1' }}>
                  {log.text}
                </div>
              ))}
            </div>

          </div>
        )}

        {activeTab === 'roster' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>佣兵团现役 4 人 (每日口粮消耗: 4 / 周薪支出: 78G)</div>
            {party.map(hero => (
              <div key={hero.id} style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#f8fafc' }}>{hero.name}</span>
                    <span style={{ fontSize: '11px', color: '#38bdf8', marginLeft: '6px' }}>Lv.{hero.level} {hero.role}</span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#eab308', fontWeight: 'bold' }}>CA {hero.currentAbility} / PA {hero.potentialAbility}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                  力量 {hero.attributes.strength} | 武器 {hero.attributes.weaponSkill} | 坚毅 {hero.attributes.resolve} | 抗压 {hero.hidden.pressure}
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  {hero.traits.map(t => (
                    <span key={t} style={{ fontSize: '10px', background: '#334155', padding: '2px 6px', borderRadius: '4px', color: '#34d399' }}>
                      {t}
                    </span>
                  ))}
                  <span style={{ fontSize: '10px', background: '#334155', padding: '2px 6px', borderRadius: '4px', color: '#94a3b8' }}>
                    周薪: {hero.wage}G
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'guild' && (
          <div style={{ padding: '16px', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155', textAlign: 'center' }}>
            <h3 style={{ fontSize: '15px', color: '#38bdf8', marginBottom: '8px' }}>🏰 灰烬堡垒 · 冒险者公会</h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.6' }}>
              城邦好感度: 【友善】(声望 +120)<br />
              世界天灾阶段: 【平静】 (距离天灾爆发还剩 28 天)<br />
              医馆与圣所: 正常运转 (支持重伤疗愈与灵魂召回仪式)
            </p>
            <div style={{ marginTop: '16px', fontSize: '11px', color: '#64748b' }}>
              💡 Milestone 2 将开放酒馆雇佣、委托契约与圣所召魂系统。
            </div>
          </div>
        )}

      </main>

      {/* 底部版权与 PWA 提示 */}
      <footer style={{ padding: '8px', textAlign: 'center', fontSize: '10px', color: '#64748b', background: '#0b1329', borderTop: '1px solid #1e293b' }}>
        可添加到 iPhone 主屏幕直接畅玩 · 离线推演引擎
      </footer>

    </div>
  );
}
export default App;
