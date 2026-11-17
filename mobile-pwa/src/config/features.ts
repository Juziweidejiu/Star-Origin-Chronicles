/**
 * 功能开关（Feature Flags）
 *
 * 当前开发阶段专注打磨「地下城探索 + 战斗」，世界天灾大事件暂时下线。
 * 引擎（engine/crisisEngine.ts）、组件（components/CrisisAlert.tsx）
 * 与相关契约逻辑均已完整保留，把开关改回 true 即可原样恢复。
 */
export const ENABLE_WORLD_CRISIS = false;
