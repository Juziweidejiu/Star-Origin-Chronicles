import { useState, useEffect } from 'react';
import { generateHero } from './engine/heroFactory';
import { CombatEngine, type CombatUnit } from './engine/combatEngine';
import { TownEngine } from './engine/townEngine';
import { TownView } from './components/TownView';
import type { Hero } from './types/hero';
import type { GuildContract } from './types/world';

export function App() {
  const [activeTab, setActiveTab] = useState<'roster' | 'combat' | 'town'>('town');
  const [, setTickCounter] = useState(0);
  const triggerUpdate = () => setTickCounter(c => c + 1);

  // 初始化城镇与后勤引擎
  const [townEngine] = useState<TownEngine>(() => new TownEngine());

  // 佣兵团名册 (主角 + 3名初始战友)
  const [roster, setRoster] = useState<Hero[]>(() => [
    generateHero('blademaster', true), // 主角团长
    generateHero('guardian', false),   // 坦克
    generateHero('cleric', false),     // 牧师
    generateHero('ranger', false)      // 射手
  ]);

  // 当前进行中的任务契约
  const [currentContract, setCurrentContract] = useState<GuildContract | null>(null);

  // 战斗状态机
  const [engine, setEngine] = useState<CombatEngine | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [combatUnits, setCombatUnits] = useState<CombatUnit[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isAutoUlt, setIsAutoUlt] = useState<boolean>(true);
  const [battleRewardClaimed, setBattleRewardClaimed] = useState<boolean>(false);
  const [systemNotice, setSystemNotice] = useState<string>('欢迎来到破晓佣兵团！请在城镇公会接取契约或在酒馆招募同袍。');

  // 初始化战斗（来自契约或野外遭遇）
  const startContractBattle = (contract: GuildContract) => {
    setCurrentContract(contract);
    setBattleRewardClaimed(false);

    // 挑选出活着的佣兵出战（最多 4 人前锋）
    const deploySquad = roster.filter(h => h.currentHp > 0).slice(0, 4);
    if (deploySquad.length === 0) {
      setSystemNotice('⚠️ 佣兵团全员重伤倒下！请先前往医馆治疗或圣所召魂。');
      return;
    }

    // 根据契约敌对编制生成敌人
    const enemies = contract.enemyClasses.map(cId => {
      const e = generateHero(cId, false);
      return {
        ...e,
        name: `敌·${e.name.split(' ')[0]}`,
        currentAbility: Math.round(e.currentAbility * (0.8 + contract.enemyLevel * 0.2))
      };
    });

    const eng = new CombatEngine(deploySquad, enemies);
    eng.units.forEach(u => {
      if (u.side === 'player') u.autoUlt = isAutoUlt;
    });

    setEngine(eng);
    setCombatUnits([...eng.units]);
    setLogs([...eng.logs]);
    setIsRunning(true);
    setActiveTab('combat');
    setSystemNotice(`⚔️ 已进入【${contract.title}】讨伐战场！`);
  };

  // 战斗心跳 Tick
  useEffect(() => {
    if (!isRunning || !engine || engine.isFinished) return;

    const timer = setInterval(() => {
      engine.tick(0.2);
      setCombatUnits([...engine.units]);
      setLogs([...engine.logs]);

      // 战斗结束结算
      if (engine.isFinished && !battleRewardClaimed) {
        // 同步存活/伤亡状态回名册
        const updatedRoster = [...roster];
        engine.units.filter(u => u.side === 'player').forEach(u => {
          const hero = updatedRoster.find(h => h.id === u.hero.id);
          if (hero) {
            hero.currentHp = Math.max(0, u.currentHp);
            if (u.isDead) {
              hero.injuries.push('战死创伤');
              townEngine.recordFallenHero(hero);
            }
          }
        });
        setRoster(updatedRoster);

        if (engine.winner === 'player' && currentContract) {
          const res = townEngine.completeContract(currentContract, updatedRoster);
          setSystemNotice(res.message);
        } else if (engine.winner === 'enemy') {
          setSystemNotice('💀 战役失败，先遣队败退！队员重创，请回圣所与医馆救治！');
        }
        setBattleRewardClaimed(true);
        triggerUpdate();
      }
    }, 200);

    return () => clearInterval(timer);
  }, [isRunning, engine, battleRewardClaimed, currentContract, roster, townEngine]);

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

  // 玩家手动释放大招
  const handleManualUlt = (unit: CombatUnit) => {
    if (!engine || unit.side !== 'player' || unit.resource < 100 || unit.isDead) return;
    engine.triggerUltimate(unit);
    setCombatUnits([...engine.units]);
    setLogs([...engine.logs]);
  };

  const playerUnits = combatUnits.filter(u => u.side === 'player');
  const enemyUnits = combatUnits.filter(u => u.side === 'enemy');
  const currentTown = townEngine.towns[townEngine.logistics.currentTownId];

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: '#0f172a', color: '#f8fafc', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      
      {/* 顶部 iOS 状态栏 */}
      <header style={{ padding: '10px 14px', background: '#1e293b', borderBottom: '1px solid #334155' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#38bdf8' }}>⚔️ 破晓佣兵团</span>
            <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px' }}>
              第 {townEngine.logistics.day} 天 · {currentTown.name}
            </span>
          </div>
          <button 
            onClick={toggleAutoUlt}
            style={{ 
              padding: '3px 8px', 
              fontSize: '10px', 
              borderRadius: '12px', 
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

        {/* 后勤资源状态条 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '11px', background: '#0b1329', padding: '4px 8px', borderRadius: '6px' }}>
          <span style={{ color: '#eab308' }}>💰 {townEngine.logistics.gold} G</span>
          <span style={{ color: '#38bdf8' }}>🍞 {townEngine.logistics.rations} 份口粮</span>
          <span style={{ color: '#a855f7' }}>✨ {townEngine.logistics.soulCrystals} 魂晶</span>
          <span style={{ color: '#10b981' }}>🧪 {townEngine.logistics.medicines} 药剂</span>
        </div>
      </header>

      {/* 广播通知浮条 */}
      {systemNotice && (
        <div style={{ background: '#334155', padding: '6px 12px', fontSize: '11px', color: '#38bdf8', borderBottom: '1px solid #475569', display: 'flex', justifyContent: 'space-between' }}>
          <span>🔔 {systemNotice}</span>
          <span onClick={() => setSystemNotice('')} style={{ cursor: 'pointer', color: '#94a3b8', marginLeft: '8px' }}>✕</span>
        </div>
      )}

      {/* 核心展示区 */}
      <main style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
        
        {/* 顶部三 Tab 切换 */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          {(['town', 'combat', 'roster'] as const).map(tab => (
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
              {tab === 'town' && '🏰 城邦据点'}
              {tab === 'combat' && '🗡️ 战役讨伐'}
              {tab === 'roster' && `👥 佣兵名册 (${roster.length})`}
            </button>
          ))}
        </div>

        {/* Tab 1: 城邦运营与公会据点 (Milestone 2 核心) */}
        {activeTab === 'town' && (
          <TownView 
            townEngine={townEngine}
            roster={roster}
            onRosterChange={setRoster}
            onSelectContract={startContractBattle}
            onLogMessage={msg => setSystemNotice(msg)}
            triggerUpdate={triggerUpdate}
          />
        )}

        {/* Tab 2: 地牢交战 / 讨伐 */}
        {activeTab === 'combat' && (
          <div>
            {currentContract && (
              <div style={{ background: '#1e293b', padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155', marginBottom: '10px', fontSize: '12px' }}>
                <span style={{ color: '#eab308', fontWeight: 'bold' }}>当前契约：</span> {currentContract.title}
                <span style={{ color: '#38bdf8', marginLeft: '8px' }}>({currentContract.stars} 星)</span>
              </div>
            )}

            {/* 双方队伍卡片 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              {/* 我方先遣队 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 'bold' }}>我方佣兵先遣队</div>
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
                      <div style={{ background: '#334155', height: '6px', borderRadius: '3px', margin: '4px 0', overflow: 'hidden' }}>
                        <div style={{ background: hpPct > 30 ? '#10b981' : '#ef4444', height: '100%', width: `${hpPct}%`, transition: 'width 0.2s' }} />
                      </div>
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

              {/* 敌方目标 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>敌对悬赏目标</div>
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

            {/* 战役结果通知 */}
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
                  {engine.winner === 'player' ? '🎉 战役告捷！公会悬赏金已核算入库！' : '💀 战役惨败，兄弟受创！请返回城镇避难！'}
                </div>
                <button
                  onClick={() => setActiveTab('town')}
                  style={{ marginTop: '8px', padding: '6px 16px', background: '#38bdf8', color: '#0f172a', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                >
                  返回城邦公会 🏰
                </button>
              </div>
            )}

            {/* 战斗操作条 */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <button
                onClick={() => setIsRunning(!isRunning)}
                style={{ flex: 1, padding: '8px', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
              >
                {isRunning ? '⏸️ 暂停演练' : '▶️ 恢复推演'}
              </button>
            </div>

            {/* 战况日志 */}
            <div style={{ background: '#0b1329', padding: '10px', borderRadius: '8px', height: '160px', overflowY: 'auto', border: '1px solid #1e293b' }}>
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

        {/* Tab 3: 佣兵名册 */}
        {activeTab === 'roster' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
              <span>现役成员 {roster.length}/8 人</span>
              <span>每日口粮消耗: {roster.length} / 周薪总额: {roster.reduce((s, h) => s + h.wage, 0)} G</span>
            </div>
            {roster.map(hero => (
              <div key={hero.id} style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#f8fafc' }}>
                      {hero.isLeader ? '👑 ' : ''}{hero.name}
                    </span>
                    <span style={{ fontSize: '11px', color: '#38bdf8', marginLeft: '6px' }}>Lv.{hero.level} {hero.role}</span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#eab308', fontWeight: 'bold' }}>CA {hero.currentAbility} / PA {hero.potentialAbility}</span>
                </div>
                
                {/* 状态与伤残 */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '11px', color: '#94a3b8' }}>
                  <span>生命: {hero.currentHp}/{hero.maxHp}</span>
                  <span>士气: {hero.morale}</span>
                  <span>压力: {hero.stress}/100</span>
                  <span style={{ color: hero.injuries.length > 0 ? '#ef4444' : '#10b981' }}>
                    {hero.injuries.length > 0 ? `伤残: ${hero.injuries.join(',')}` : '健康'}
                  </span>
                </div>

                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  力量 {hero.attributes.strength} | 武器 {hero.attributes.weaponSkill} | 坚毅 {hero.attributes.resolve} | 抗压 {hero.hidden.pressure}
                </div>

                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  {hero.traits.map(t => (
                    <span key={t} style={{ fontSize: '10px', background: '#334155', padding: '2px 6px', borderRadius: '4px', color: '#34d399' }}>
                      {t}
                    </span>
                  ))}
                  <span style={{ fontSize: '10px', background: '#334155', padding: '2px 6px', borderRadius: '4px', color: '#94a3b8' }}>
                    周薪: {hero.wage} G
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      {/* 底部 PWA 离线提示 */}
      <footer style={{ padding: '8px', textAlign: 'center', fontSize: '10px', color: '#64748b', background: '#0b1329', borderTop: '1px solid #1e293b' }}>
        破晓佣兵团 · 移动端 PWA 运营引擎 · 离线自动运算
      </footer>

    </div>
  );
}

export default App;
