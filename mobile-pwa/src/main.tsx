import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { startPerfMonitorIfRequested } from './dev/perfMonitor.ts'

// 真机性能采样：仅在网址带 ?perf=1 时挂载，生产默认零开销
startPerfMonitorIfRequested()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
