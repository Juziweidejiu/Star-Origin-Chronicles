import { defineConfig } from 'vitest/config';

// 引擎单测只跑纯 TypeScript 逻辑，不需要浏览器环境与 React 插件。
// 涉及 localStorage 的用例在测试文件内自行注入假 window。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
