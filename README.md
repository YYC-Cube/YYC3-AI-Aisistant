<div align="center">

<img src="./public/AI-Assis.png" alt="YYC³ AI Family" width="480" />

# YYC³ AI Family

**言启千行代码 | 语枢万物智能**

*Words Inspire Thousands of Lines of Code | Language Pivots the Intelligence of All Things*

[![Version](https://img.shields.io/badge/version-0.9.4-22c55e?style=flat-square&logo=semantic-release)](https://github.com/YYC-Cube/yyc3-ai-assistant)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646cff?style=flat-square&logo=vite)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4-06b6d4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)
[![Tests](https://img.shields.io/badge/tests-64%20passed-22c55e?style=flat-square&logo=vitest)](./vitest.config.ts)
[![ESLint](https://img.shields.io/badge/ESLint-0%20warnings-4b32c3?style=flat-square&logo=eslint)](./eslint.config.js)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-f69220?style=flat-square&logo=pnpm)](https://pnpm.io/)

[![五高](https://img.shields.io/badge/五高-高可用%20%7C%20高性能%20%7C%20高安全%20%7C%20高扩展%20%7C%20高智能-22c55e?style=flat-square)]()
[![五标](https://img.shields.io/badge/五标-标准化%20%7C%20规范化%20%7C%20自动化%20%7C%20可视化%20%7C%20智能化-blue?style=flat-square)]()
[![五化](https://img.shields.io/badge/五化-流程化%20%7C%20数字化%20%7C%20生态化%20%7C%20工具化%20%7C%20服务化-orange?style=flat-square)]()

[English Documentation](./README.en.md) · [文档体系](./docs/README.md) · [贡献指南](./docs/core/CONTRIBUTING.md) · [API 文档](./docs/core/API_DOCUMENTATION.md)

</div>

---

## 项目概述

YYC³ AI Family 是一款基于 React 19 + TypeScript + Vite 5 的终端风格 AI 对话系统，融合黑客终端 UI 美学与多模型 AI 引擎，提供沉浸式智能对话体验。

```
┌─────────────────────────────────────────────────────────────────┐
│                     YYC³ AI Family Architecture                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐   ┌──────────────┐   ┌──────────────┐       │
│   │  Components  │   │   Services    │   │ Repositories │       │
│   │  (React 19)  │ → │  (业务逻辑)   │ → │  (数据访问)   │       │
│   └─────────────┘   └──────────────┘   └──────┬───────┘       │
│                                                  │               │
│                      ┌──────────────────────────┤               │
│                      │                          │               │
│               ┌──────▼──────┐          ┌────────▼──────┐       │
│               │  PostgreSQL  │          │   Supabase    │       │
│               │ 15 (Local)   │          │  (Cloud KV)   │       │
│               └─────────────┘          └───────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| **前端框架** | React + TypeScript | 19 / 5.6 |
| **构建工具** | Vite | 5.x |
| **UI 框架** | shadcn/ui + Radix UI | Latest |
| **样式方案** | Tailwind CSS v4 | 4.x |
| **动画引擎** | Framer Motion | 11.x |
| **图标库** | Lucide React | Latest |
| **后端代理** | Express + pg | 4.x / 8.x |
| **数据库** | PostgreSQL 15 | 15.x |
| **安全加固** | Helmet + express-rate-limit | 8.x / 7.x |
| **包管理** | pnpm | Workspace |
| **测试框架** | Vitest + React Testing Library | Latest |
| **代码规范** | ESLint 9.x (Flat Config) | 9.x |

## 快速开始

### 前端开发

```bash
# 克隆仓库
git clone https://github.com/YYC-Cube/yyc3-ai-assistant.git
cd yyc3-ai-assistant

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env

# 启动开发服务器
pnpm dev
```

### 后端 API 代理 (可选 — 本地 PostgreSQL)

```bash
# 进入 server 目录
cd server

# 安装依赖
pnpm install

# 配置环境变量
cp env.example.txt .env

# 启动代理服务
pnpm dev
```

## 项目结构

```
yyc3-ai-assistant/
├── components/          # React 组件
│   ├── ui/              # shadcn/ui 基础组件
│   ├── settings/        # SettingsModal 子组件
│   ├── Chat.tsx         # 主聊天组件
│   ├── ErrorBoundary.tsx
│   └── SettingsModal.tsx
├── hooks/               # React Hooks
│   ├── useAI.ts         # AI 对话核心
│   ├── useChatPersistence.ts
│   └── useUISettings.ts
├── services/            # 业务服务层
│   ├── DatabaseService.ts
│   ├── GitHubService.ts
│   └── DevOpsService.ts
├── repositories/        # 数据访问层
│   ├── DatabaseRepository.ts
│   └── GitHubRepository.ts
├── types/               # TypeScript 类型定义
├── utils/               # 工具函数
├── styles/              # 全局样式
├── server/              # Express API 代理
├── docs/                # 文档体系 (九层架构)
├── scripts/             # 自动化脚本
├── public/              # 静态资源
├── App.tsx              # 应用入口
├── main.tsx             # 渲染入口
└── vitest.config.ts     # 测试配置
```

## 质量门禁

| 门禁 | 状态 | 命令 |
|------|------|------|
| TypeScript | ✅ 0 errors | `pnpm typecheck` |
| ESLint | ✅ 0 errors, 0 warnings | `pnpm lint` |
| Vitest | ✅ 64 tests passed | `pnpm test --run` |
| Build | ✅ ~1s | `pnpm build` |
| Coverage | 核心模块 85%+ | `pnpm test:coverage` |

## 开发脚本

```bash
pnpm dev              # 启动 Vite 开发服务器
pnpm build            # TypeScript 编译 + Vite 生产构建
pnpm typecheck        # TypeScript 类型检查
pnpm lint             # ESLint 代码检查
pnpm test             # 运行测试
pnpm test:coverage    # 生成覆盖率报告
pnpm test:ui          # Vitest 可视化界面
pnpm size-check       # Bundle 大小检查
pnpm doc-check        # 文档质量检查
pnpm doc-link-check   # 文档链接有效性检查
```

## 文档体系

YYC³ 采用**九层文档架构**，完整文档索引参见 [docs/README.md](./docs/README.md)。

| 文档 | 说明 |
|------|------|
| [DEVELOPMENT_GUIDE.md](./docs/core/DEVELOPMENT_GUIDE.md) | 开发者完整工作手册 |
| [API_DOCUMENTATION.md](./docs/core/API_DOCUMENTATION.md) | RESTful API 接口规范 |
| [ARCHITECTURE_DECISIONS.md](./docs/core/ARCHITECTURE_DECISIONS.md) | 技术决策记录 (ADR) |
| [SECURITY_GUIDE.md](./docs/core/SECURITY_GUIDE.md) | 安全合规指南 |
| [CHANGELOG.md](./CHANGELOG.md) | 版本变更历史 |
| [CONTRIBUTING.md](./docs/core/CONTRIBUTING.md) | 贡献指南 |
| [FAQ.md](./docs/core/FAQ.md) | 常见问题解答 |
| [DEPLOYMENT_GUIDE.md](./docs/extended/DEPLOYMENT_GUIDE.md) | 部署运维指南 |

## 安全特性

- **CORS 白名单** — Supabase Edge Function 限制已知域名
- **Rate Limiting** — Express 200 次/15 分钟请求限制
- **Helmet** — HTTP 安全头自动注入 (XSS, Clickjacking, MIME-Sniffing 防护)
- **SQL 注入防护** — 参数化查询 + 表名白名单 + 标识符正则校验
- **认证令牌** — Bearer Token 可选认证，支持无认证本地开发模式
- **ErrorBoundary** — React 全局错误边界，防白屏崩溃

## 贡献

请阅读 [CONTRIBUTING.md](./docs/core/CONTRIBUTING.md) 了解 PDCA+ 开发流程和代码规范。

## 许可证

[MIT License](./LICENSE)

---

<div align="center">

**YanYuCloudCube Team**

> *言启千行代码 | 语枢万物智能*
> *Words Inspire Thousands of Lines of Code | Language Pivots the Intelligence of All Things*
>
> *万象归元于云枢 | 深栈智启新纪元*
> *All things converge in cloud pivot; Deep stacks ignite a new era of intelligence*

**© 2025-2026 YYC³ Team. All Rights Reserved.**

</div>
