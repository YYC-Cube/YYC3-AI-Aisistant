---
file: DEVELOPMENT_GUIDE.md
description: YYC³ AI Assistant 开发者完整工作手册 — 环境搭建、开发流程、调试技巧、部署指南
author: YanYuCloudCube Team <admin@0379.email>
version: v1.0.0
created: 2026-05-23
updated: 2026-05-23
status: published
tags: [开发指南],[开发者手册],[环境搭建],[部署]
category: development
---

<div align="center">

# YYC³ AI Assistant 开发指南

**言启千行代码 | 语枢万物智能**

*Complete Developer Handbook*

</div>

---

## 目录

- [环境要求](#环境要求)
- [项目初始化](#项目初始化)
- [开发流程](#开发流程)
- [架构概览](#架构概览)
- [编码规范](#编码规范)
- [测试指南](#测试指南)
- [调试技巧](#调试技巧)
- [构建与部署](#构建与部署)
- [常见问题](#常见问题)

---

## 环境要求

| 工具 | 最低版本 | 推荐版本 | 说明 |
|------|----------|----------|------|
| Node.js | 18.x | 20.x LTS | JavaScript 运行时 |
| pnpm | 8.x | 9.x | 包管理器（必须） |
| PostgreSQL | 15.x | 15.x | 本地数据库（可选） |
| Git | 2.40+ | Latest | 版本控制 |
| IDE | - | VS Code | 推荐 + ESLint / Prettier 插件 |

### 必备 VS Code 插件

- ESLint (`dbaeumer.vscode-eslint`)
- Tailwind CSS IntelliSense (`bradlc.vscode-tailwindcss`)
- TypeScript Import Sorter (`mike-co.import-sorter`)

---

## 项目初始化

### 1. 克隆与安装

```bash
git clone https://github.com/YYC-Cube/YYC3-AI-Aisistant.git
cd YYC3-AI-Aisistant
pnpm install
```

### 2. 环境变量配置

```bash
cp .env.example .env
```

编辑 `.env` 填入实际值：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_API_PROXY_URL` | API 代理地址 | `http://localhost:3721` |

### 3. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:5173

### 4. 可选：启动本地 PostgreSQL

```bash
cd server
pnpm install
cp env.example.txt .env
# 编辑 server/.env 配置数据库连接信息
pnpm dev
```

API 代理运行于 http://localhost:3721

---

## 开发流程

### PDCA+ 开发周期

```
┌─────────────────────────────────────────────────────────┐
│                   PDCA+ 开发周期                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Plan  →  Do  →  Check  →  Act  →  Archive           │
│                                                         │
│   📋 规划   🔨 执行   ✅ 检查   🚀 交付   📦 归档     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Git 分支规范

| 分支 | 用途 | 示例 |
|------|------|------|
| `main` | 生产分支 | - |
| `develop` | 开发集成分支 | - |
| `feature/*` | 功能开发 | `feature/settings-modal-split` |
| `fix/*` | 缺陷修复 | `fix/eslint-warnings` |
| `refactor/*` | 重构 | `refactor/hooks-optimization` |

### Commit 规范

```
type(scope): subject

feat(chat): add message streaming support
fix(auth): resolve token expiration handling
docs(api): update endpoint documentation
refactor(hooks): extract useUISettings from App
test(services): add GitHubService unit tests
chore(deps): upgrade vite to 5.4.x
```

---

## 架构概览

### 三层架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│         Components (React 19 + shadcn/ui + Radix)           │
├─────────────────────────────────────────────────────────────┤
│                    Business Layer                            │
│         Services + Hooks (业务逻辑 + 状态管理)              │
├─────────────────────────────────────────────────────────────┤
│                    Data Layer                                │
│         Repositories (数据访问 + 缓存策略)                  │
└─────────────────────────────────────────────────────────────┘
```

### 关键目录职责

| 目录 | 职责 | 依赖方向 |
|------|------|----------|
| `components/` | UI 渲染、用户交互 | → hooks |
| `hooks/` | 状态管理、业务编排 | → services |
| `services/` | 业务逻辑、错误处理 | → repositories |
| `repositories/` | 数据访问、缓存管理 | → types |
| `types/` | 类型定义、接口契约 | 无依赖 |
| `utils/` | 纯工具函数 | 无依赖 |

---

## 编码规范

### TypeScript 严格模式

项目启用 `strict: true`，所有代码必须通过类型检查：

```bash
pnpm typecheck    # 零错误要求
```

### ESLint 规则

```bash
pnpm lint         # 零错误、零警告要求
```

关键规则：
- `@typescript-eslint/no-explicit-any: warn` — 避免 any 类型
- `@typescript-eslint/no-unused-vars: error` — 禁止未使用变量（`_` 前缀除外）
- `react-hooks/exhaustive-deps: warn` — Hook 依赖完整性

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件文件 | PascalCase | `ChatContainer.tsx` |
| Hook 文件 | camelCase + use 前缀 | `useChatPersistence.ts` |
| Service 文件 | PascalCase + Service 后缀 | `GitHubService.ts` |
| Repository 文件 | PascalCase + Repository 后缀 | `DatabaseRepository.ts` |
| 类型文件 | camelCase | `storage.ts` |
| 工具文件 | camelCase | `audio.ts` |
| 测试文件 | 源文件名.test | `useAI.test.ts` |

### 组件规范

- 函数式组件 + Hooks
- Props 通过 interface 定义
- 拆分超过 300 行的组件为子组件
- shadcn/ui 作为基础 UI 原子组件

---

## 测试指南

### 运行测试

```bash
pnpm test              # 监听模式
pnpm test --run        # 单次运行
pnpm test:coverage     # 覆盖率报告
pnpm test:ui           # 可视化界面
```

### 测试结构

```
hooks/__tests__/           # Hook 测试
services/__tests__/        # Service 测试
repositories/__tests__/    # Repository 测试
components/__tests__/      # Component 测试
src/__tests__/             # 通用测试 + setup
```

### 测试编写规范

- 使用 `vitest` 的 `describe/it/expect` 语法
- React 组件测试使用 `@testing-library/react`
- Mock 外部依赖通过 `vi.mock()`
- 每个测试文件对应一个源文件

### 覆盖率目标

| 层级 | 目标覆盖率 |
|------|-----------|
| Hooks | ≥ 90% |
| Services | ≥ 80% |
| Repositories | ≥ 80% |
| Components | ≥ 70% |

---

## 调试技巧

### Vite DevTools

```bash
pnpm dev    # 开发模式自动启用 HMR + Source Map
```

### 结构化日志

API 代理使用 JSON 结构化日志：

```bash
cd server && pnpm dev
# 日志输出格式: {"timestamp":"...","level":"INFO","service":"yyc3-api-proxy","message":"..."}
```

### React DevTools

安装 React DevTools 浏览器扩展，可实时检查组件树和 Hook 状态。

---

## 构建与部署

### 生产构建

```bash
pnpm build          # TypeScript 编译 + Vite 打包
pnpm preview        # 本地预览生产构建
pnpm size-check     # 检查 bundle 大小
```

### Docker 部署

```bash
docker-compose up -d
```

参见 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) 获取完整部署文档。

### 质量门禁清单

部署前必须全部通过：

```bash
pnpm typecheck      # ✅ 0 errors
pnpm lint           # ✅ 0 errors, 0 warnings
pnpm test --run     # ✅ all tests passed
pnpm build          # ✅ build success
```

---

## 常见问题

参见 [FAQ.md](./FAQ.md) 获取 38+ 高频问题解答。

---

<div align="center">

> 「***YanYuCloudCube***」
> 「***<admin@0379.email>***」
> 「***言启千行代码 | 语枢万物智能***」

**© 2025-2026 YYC³ Team. All Rights Reserved.**

</div>
