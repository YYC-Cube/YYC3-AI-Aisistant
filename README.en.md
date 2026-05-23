<div align="center">

<img src="./public/AI-Assis.png" alt="YYC³ AI Assistant" width="480" />

# YYC³ AI Assistant

**Words Inspire Thousands of Lines of Code | Language Pivots the Intelligence of All Things**

*言启千行代码 | 语枢万物智能*

[![Version](https://img.shields.io/badge/version-0.9.4-22c55e?style=flat-square&logo=semantic-release)](https://github.com/YYC-Cube/YYC3-AI-Aisistant)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646cff?style=flat-square&logo=vite)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4-06b6d4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)
[![Tests](https://img.shields.io/badge/tests-64%20passed-22c55e?style=flat-square&logo=vitest)](./vitest.config.ts)
[![ESLint](https://img.shields.io/badge/ESLint-0%20warnings-4b32c3?style=flat-square&logo=eslint)](./eslint.config.js)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-f69220?style=flat-square&logo=pnpm)](https://pnpm.io/)

[中文文档](./README.md) · [Documentation](./docs/README.md) · [Contributing](./docs/core/CONTRIBUTING.md) · [API Docs](./docs/core/API_DOCUMENTATION.md)

</div>

---

## Overview

YYC³ AI Assistant is a terminal-styled AI conversation system built with React 19 + TypeScript + Vite 5. It blends hacker-terminal UI aesthetics with multi-model AI engines to deliver an immersive intelligent dialogue experience.

```
┌─────────────────────────────────────────────────────────────────┐
│                     YYC³ AI Assistant Architecture                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐   ┌──────────────┐   ┌──────────────┐       │
│   │  Components  │   │   Services    │   │ Repositories │       │
│   │  (React 19)  │ → │  (Business)   │ → │  (Data)      │       │
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

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React + TypeScript | 19 / 5.6 |
| **Build Tool** | Vite | 5.x |
| **UI Framework** | shadcn/ui + Radix UI | Latest |
| **Styling** | Tailwind CSS v4 | 4.x |
| **Animation** | Framer Motion | 11.x |
| **Icons** | Lucide React | Latest |
| **API Proxy** | Express + pg | 4.x / 8.x |
| **Database** | PostgreSQL 15 | 15.x |
| **Security** | Helmet + express-rate-limit | 8.x / 7.x |
| **Package Manager** | pnpm | Workspace |
| **Testing** | Vitest + React Testing Library | Latest |
| **Linting** | ESLint 9.x (Flat Config) | 9.x |

## Quick Start

### Frontend Development

```bash
git clone https://github.com/YYC-Cube/YYC3-AI-Aisistant.git
cd YYC3-AI-Aisistant
pnpm install
cp .env.example .env
pnpm dev
```

### API Proxy (Optional — Local PostgreSQL)

```bash
cd server
pnpm install
cp env.example.txt .env
pnpm dev
```

## Project Structure

```
YYC3-AI-Aisistant/
├── components/          # React components
│   ├── ui/              # shadcn/ui base components
│   ├── settings/        # SettingsModal sub-components
│   ├── Chat.tsx         # Main chat component
│   ├── ErrorBoundary.tsx
│   └── SettingsModal.tsx
├── hooks/               # React Hooks
├── services/            # Business service layer
├── repositories/        # Data access layer
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── styles/              # Global styles
├── server/              # Express API proxy
├── docs/                # Documentation (9-layer architecture)
├── scripts/             # Automation scripts
├── public/              # Static assets
├── App.tsx              # Application entry
├── main.tsx             # Render entry
└── vitest.config.ts     # Test configuration
```

## Quality Gates

| Gate | Status | Command |
|------|--------|---------|
| TypeScript | ✅ 0 errors | `pnpm typecheck` |
| ESLint | ✅ 0 errors, 0 warnings | `pnpm lint` |
| Vitest | ✅ 64 tests passed | `pnpm test --run` |
| Build | ✅ ~1s | `pnpm build` |
| Coverage | Core modules 85%+ | `pnpm test:coverage` |

## Development Scripts

```bash
pnpm dev              # Start Vite dev server
pnpm build            # TypeScript compile + Vite production build
pnpm typecheck        # TypeScript type checking
pnpm lint             # ESLint code checking
pnpm test             # Run tests
pnpm test:coverage    # Generate coverage report
pnpm test:ui          # Vitest visual UI
pnpm size-check       # Bundle size check
pnpm doc-check        # Documentation quality check
pnpm doc-link-check   # Documentation link validation
```

## Documentation

YYC³ adopts a **9-layer documentation architecture**. See [docs/README.md](./docs/README.md) for the full index.

| Document | Description |
|----------|-------------|
| [DEVELOPMENT_GUIDE.md](./docs/core/DEVELOPMENT_GUIDE.md) | Complete developer handbook |
| [API_DOCUMENTATION.md](./docs/core/API_DOCUMENTATION.md) | RESTful API specification |
| [ARCHITECTURE_DECISIONS.md](./docs/core/ARCHITECTURE_DECISIONS.md) | Architecture Decision Records (ADR) |
| [SECURITY_GUIDE.md](./docs/core/SECURITY_GUIDE.md) | Security compliance guide |
| [CHANGELOG.md](./CHANGELOG.md) | Version change history |
| [CONTRIBUTING.md](./docs/core/CONTRIBUTING.md) | Contribution guidelines |
| [FAQ.md](./docs/core/FAQ.md) | Frequently asked questions |
| [DEPLOYMENT_GUIDE.md](./docs/extended/DEPLOYMENT_GUIDE.md) | Deployment & operations guide |

## Security Features

- **CORS Whitelist** — Supabase Edge Function restricted to known domains
- **Rate Limiting** — Express 200 req/15min rate limit
- **Helmet** — Automatic HTTP security headers (XSS, Clickjacking, MIME-Sniffing protection)
- **SQL Injection Prevention** — Parameterized queries + table whitelist + identifier regex validation
- **Auth Token** — Bearer Token optional auth, supports no-auth local dev mode
- **ErrorBoundary** — React global error boundary preventing white-screen crashes

## Contributing

Please read [CONTRIBUTING.md](./docs/core/CONTRIBUTING.md) for the PDCA+ development workflow and code standards.

## License

[MIT License](./LICENSE)

---

<div align="center">

**YanYuCloudCube Team**

> *Words Inspire Thousands of Lines of Code | Language Pivots the Intelligence of All Things*
> *言启千行代码 | 语枢万物智能*
>
> *All things converge in cloud pivot; Deep stacks ignite a new era of intelligence*
> *万象归元于云枢 | 深栈智启新纪元*

**© 2025-2026 YYC³ Team. All Rights Reserved.**

</div>
