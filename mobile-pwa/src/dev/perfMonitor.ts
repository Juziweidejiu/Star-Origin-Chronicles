/**
 * 真机性能采样器（临时工具，默认不启用）
 *
 * 用法：在网址后加 `?perf=1`，右下角出现一块实时面板。
 * 打几局战斗后点「复制报告」，把文本贴回来即可定位瓶颈。
 *
 * 为什么做成独立 DOM 而不是 React 组件：
 * 采样器本身必须尽量便宜。走 React 会引入额外渲染，污染 FPS 读数。
 */

interface FrameStats {
  fps: number;
  avgFrame: number;
  p95Frame: number;
  worstFrame: number;
  jankRatio: number;
  freezes: number;
  frames: number;
}

const WINDOW = 240; // 约 4 秒的帧窗口

export function startPerfMonitor(): () => void {
  if (document.getElementById('perf-hud')) return () => {};

  const frameTimes: number[] = [];
  let rafId = 0;
  let lastFrame = 0;
  let started = 0;

  let longTaskCount = 0;
  let longTaskTotal = 0;
  let longTaskMax = 0;
  let loafCount = 0;
  let loafMax = 0;
  let loafLayoutMax = 0;
  let loafScriptMax = 0;
  let loafSupported = false;
/** 被剔除的「挂起间隔」次数（切后台 / 系统休眠），不计入帧窗口 */
let suspendCount = 0;

  const observers: PerformanceObserver[] = [];
  const canObserve = typeof PerformanceObserver !== 'undefined';

  if (canObserve) {
    try {
      const po = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          longTaskCount += 1;
          longTaskTotal += entry.duration;
          if (entry.duration > longTaskMax) longTaskMax = entry.duration;
        }
      });
      po.observe({ entryTypes: ['longtask'] });
      observers.push(po);
    } catch {
      /* Safari 不支持，忽略 */
    }

    try {
      const loaf = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          // long-animation-frame 提供脚本 / 样式布局的拆分
          const e = entry as PerformanceEntry & {
            renderStart?: number;
            styleAndLayoutStart?: number;
            startTime: number;
            duration: number;
          };
          loafCount += 1;
          if (e.duration > loafMax) loafMax = e.duration;
          if (typeof e.styleAndLayoutStart === 'number' && e.styleAndLayoutStart > 0) {
            // 样式与布局耗时：从 styleAndLayoutStart 到帧结束
            const layout = Math.max(0, e.startTime + e.duration - e.styleAndLayoutStart);
            if (layout > loafLayoutMax) loafLayoutMax = layout;
          }
          // 脚本耗时：帧开始到样式布局开始（含渲染前的 JS 执行）
          const script =
            typeof e.styleAndLayoutStart === 'number' && e.styleAndLayoutStart > e.startTime
              ? e.styleAndLayoutStart - e.startTime
              : e.duration;
          if (script > loafScriptMax) loafScriptMax = script;
          loafSupported = true;
        }
      });
      loaf.observe({ entryTypes: ['long-animation-frame'] });
      observers.push(loaf);
    } catch {
      /* 低版本浏览器忽略 */
    }
  }

  const tick = (now: number) => {
    if (lastFrame > 0) {
      const dt = now - lastFrame;
      // 切后台 / 系统休眠会产出几秒到几十秒的「帧」，若计入窗口会把均值彻底带偏
      if (dt > 1000) {
        suspendCount += 1;
      } else {
        frameTimes.push(dt);
        if (frameTimes.length > WINDOW) frameTimes.shift();
      }
    } else {
      started = now;
    }
    lastFrame = now;
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);

  const readFrames = (): FrameStats => {
    if (frameTimes.length === 0) {
      return { fps: 0, avgFrame: 0, p95Frame: 0, worstFrame: 0, jankRatio: 0, freezes: 0, frames: 0 };
    }
    const sorted = [...frameTimes].sort((a, b) => a - b);
    const sum = frameTimes.reduce((acc, v) => acc + v, 0);
    const avg = sum / frameTimes.length;
    const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
    const worst = sorted[sorted.length - 1];
    const jank = frameTimes.filter(v => v > 33.4).length;
    const freezes = frameTimes.filter(v => v > 100).length;
    return {
      fps: avg > 0 ? 1000 / avg : 0,
      avgFrame: avg,
      p95Frame: p95,
      worstFrame: worst,
      jankRatio: jank / frameTimes.length,
      freezes,
      frames: frameTimes.length,
    };
  };

  // ---------- HUD ----------
  const hud = document.createElement('div');
  hud.id = 'perf-hud';
  hud.style.cssText = [
    'position:fixed',
    'right:8px',
    'bottom:calc(72px + env(safe-area-inset-bottom, 0px))',
    'z-index:99999',
    'width:182px',
    'padding:8px 9px',
    'border-radius:8px',
    'background:rgba(20,16,10,.88)',
    'color:#F3E9D1',
    'font:10px/1.5 ui-monospace,Menlo,Consolas,monospace',
    'letter-spacing:.02em',
    'box-shadow:0 6px 18px rgba(0,0,0,.35)',
    'border:1px solid rgba(217,164,91,.4)',
    'user-select:none',
  ].join(';');

  const readout = document.createElement('div');
  hud.appendChild(readout);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:6px;margin-top:6px';

  const mkBtn = (label: string, onClick: () => void) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = [
      'flex:1',
      'padding:4px 0',
      'font:10px/1 ui-monospace,monospace',
      'color:#F3E9D1',
      'background:rgba(217,164,91,.16)',
      'border:1px solid rgba(217,164,91,.5)',
      'border-radius:4px',
    ].join(';');
    b.addEventListener('click', onClick);
    return b;
  };

  const buildReport = () => {
    const f = readFrames();
    const mem = (performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    const nav = navigator as Navigator & { deviceMemory?: number; hardwareConcurrency?: number };
    const heap = mem ? `${(mem.usedJSHeapSize / 1048576).toFixed(1)} / ${(mem.jsHeapSizeLimit / 1048576).toFixed(0)} MB` : 'n/a';
    return [
      '=== 三岔口 · 性能采样 ===',
      `时间: ${new Date().toLocaleString()}`,
      `UA: ${navigator.userAgent}`,
      `屏幕: ${window.screen.width}x${window.screen.height} @${window.devicePixelRatio}x | 视口 ${window.innerWidth}x${window.innerHeight}`,
      `CPU 核: ${nav.hardwareConcurrency ?? '?'} | 设备内存: ${nav.deviceMemory ?? '?'} GB | JS 堆: ${heap}`,
      `持续: ${((performance.now() - started) / 1000).toFixed(1)}s | 挂起剔除 ${suspendCount} 次（切后台/休眠，不计入统计）`,
      '',
      `FPS 均值: ${f.fps.toFixed(1)}（帧窗口 ${f.frames}）`,
      `帧耗时 平均 ${f.avgFrame.toFixed(1)}ms | p95 ${f.p95Frame.toFixed(1)}ms | 最差 ${f.worstFrame.toFixed(1)}ms`,
      `掉帧率: ${(f.jankRatio * 100).toFixed(1)}%（>33ms 的帧）| 卡死帧 ${f.freezes}（>100ms）`,
      '',
      `Long Task: ${longTaskCount} 次, 合计 ${longTaskTotal.toFixed(0)}ms, 最长 ${longTaskMax.toFixed(0)}ms`,
      loafSupported
        ? `LoAF: ${loafCount} 次, 最长 ${loafMax.toFixed(0)}ms（脚本 ${loafScriptMax.toFixed(0)}ms / 样式布局 ${loafLayoutMax.toFixed(0)}ms）`
        : 'LoAF: 浏览器不支持（仅 Chrome 123+）',
      '',
      '判读：掉帧率 >20% 或 卡死帧 >0 → 有问题；LoAF 里样式布局占比高 → DOM/CSS 太重；脚本占比高 → JS 计算重。',
    ].join('\n');
  };

  const copyBtn = mkBtn('复制报告', () => {
    const text = buildReport();
    void navigator.clipboard?.writeText(text).then(
      () => {
        copyBtn.textContent = '已复制';
        window.setTimeout(() => { copyBtn.textContent = '复制报告'; }, 1200);
      },
      () => {
        console.log(text);
        copyBtn.textContent = '见控制台';
      }
    );
  });

  const resetBtn = mkBtn('重置', () => {
    frameTimes.length = 0;
    longTaskCount = 0;
    longTaskTotal = 0;
    longTaskMax = 0;
    loafCount = 0;
    loafMax = 0;
    loafLayoutMax = 0;
    loafScriptMax = 0;
    suspendCount = 0;
    started = performance.now();
  });

  btnRow.appendChild(copyBtn);
  btnRow.appendChild(resetBtn);
  hud.appendChild(btnRow);
  document.body.appendChild(hud);

  const timer = window.setInterval(() => {
    const f = readFrames();
    const fpsColor = f.fps >= 55 ? '#9CCB7D' : f.fps >= 40 ? '#E3BE72' : '#E4573D';
    readout.innerHTML = [
      f.frames === 0
        ? '<div style="font-size:13px;font-weight:700;color:#E3BE72">等待帧数据…</div>'
        : `<div style="font-size:13px;font-weight:700;color:${fpsColor}">${f.fps.toFixed(1)} FPS</div>`,
      `<div>帧 ${f.avgFrame.toFixed(0)} / p95 ${f.p95Frame.toFixed(0)} / 最差 ${f.worstFrame.toFixed(0)} ms</div>`,
      `<div>掉帧 ${(f.jankRatio * 100).toFixed(0)}% · 卡死 ${f.freezes}${suspendCount > 0 ? ` · 挂起 ${suspendCount}` : ''}</div>`,
      `<div>长任务 ${longTaskCount} · 最长 ${longTaskMax.toFixed(0)}ms</div>`,
      loafSupported
        ? `<div>LoAF 布局 ${loafLayoutMax.toFixed(0)}ms</div>`
        : '<div style="opacity:.6">LoAF 不可用</div>',
    ].join('');
  }, 250);

  // 方便在控制台打点
  (window as Window & { __perfReport?: () => string }).__perfReport = buildReport;

  return () => {
    cancelAnimationFrame(rafId);
    window.clearInterval(timer);
    observers.forEach(o => o.disconnect());
    hud.remove();
  };
}

/** 只在 `?perf=1` 时启用 */
export function startPerfMonitorIfRequested(): void {
  const on = new URLSearchParams(window.location.search).get('perf');
  if (on === '1') startPerfMonitor();
}
