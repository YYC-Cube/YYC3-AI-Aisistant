# Changelog

All notable changes to the YYC³ AI Assistant project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.4] - 2026-05-23

### Added

- **Security Hardening**: CORS whitelist for Supabase Edge Function (replaced `origin: "*"`)
- **Security Hardening**: Express Rate Limiting middleware (200 req/15min)
- **Security Hardening**: Helmet HTTP security headers integration
- **Security Hardening**: React global `ErrorBoundary` component with dev/prod modes
- **Security Hardening**: Root `.env.example` environment variable template
- **Code Quality**: ESLint warnings cleared from 13 → 0
- **Code Quality**: SettingsModal refactored from 1802 → 1386 lines (extracted `UiUxTab`, `ModelsTab`)
- **Code Quality**: `SystemStartup` startup logs extracted to module-level constant
- **Code Quality**: `useChatPersistence` exhaustive-deps fix with ref pattern
- **Code Quality**: `ChatContainer` dependency array simplified
- **Testing**: 64 total test cases across 8 test files (was 32/3)
- **Testing**: `useUISettings` hook tests (10 cases, 95.79% coverage)
- **Testing**: `GitHubService` unit tests (7 cases, 83.87% coverage)
- **Testing**: `DatabaseService` unit tests (5 cases, 68.82% coverage)
- **Testing**: `GitHubRepository` unit tests (4 cases, 86.88% coverage)
- **Testing**: `ErrorBoundary` component tests (6 cases, 100% coverage)
- **Build**: Tailwind CSS v4 PostCSS migration (`@tailwindcss/postcss`)
- **Build**: `tsconfig.json` Vite client types (`vite/client`)
- **Docs**: Professional README.md with banner image, badges, and brand identity
- **Docs**: English README.en.md with full translation
- **Docs**: Nine-layer documentation architecture under `docs/`
- **Docs**: Documentation quality auto-check script (`scripts/doc-quality-check.js`)
- **Docs**: Documentation link validation script (`scripts/doc-link-check.js`)
- **Docs**: CI/CD documentation quality gate integration

### Changed

- ESLint flat config v9 with `allowExportNames` for shadcn/ui components
- ESLint `components/ui/` directory exempted from `react-refresh` rule
- PostCSS config updated for Tailwind CSS v4 plugin migration
- `vitest.config.ts` and `tsconfig.json` cleaned up `supabase` references

### Removed

- `supabase/` directory (Edge Function source deployed to Supabase cloud, not needed locally)
- 13 ESLint warnings across codebase

## [0.9.3] - 2026-02-14

### Added

- AI Assistant agent status management (ARCHITECT_PRIME, CODE_WEAVER, DATA_NEXUS, SECURE_SENTINEL)
- MCP DevOps connectivity panel with server probing
- Workflows tab with CRUD operations
- GitHub integration via MCP tools
- Sound engine integration into ChatContainer and SystemStartup
- System startup animation sequence

### Changed

- Settings modal expanded to 10-tab configuration system
- UI/UX settings with theme color engine, typography config, visual effects
- Database configuration panel with PostgreSQL 15 local channel support

## [0.9.2] - 2026-01-20

### Added

- Express API proxy server (`server/yyc3-api-proxy.ts`) on port 3721
- PostgreSQL 15 schema and connection pooling
- Local API proxy architecture (Browser → REST API → PostgreSQL)
- Channel-based configuration storage
- UI settings persistence hook (`useUISettings`)

### Changed

- Chat persistence migrated from simple localStorage to hook-based architecture
- Model configuration supports multiple providers (Ollama, OpenAI, Zhipu, Anthropic)

## [0.9.1] - 2025-12-15

### Added

- Initial multi-model AI conversation system
- Terminal-styled UI with hacker aesthetic
- Channel management with preset configurations
- Chat export/import functionality
- Supabase cloud sync hook

## [0.9.0] - 2025-11-01

### Added

- Project initialization with React + TypeScript + Vite
- shadcn/ui component library integration
- Tailwind CSS styling system
- Framer Motion animation framework
- Basic chat interface with message streaming

---

<div align="center">

**YanYuCloudCube Team** · [GitHub](https://github.com/YYC-Cube/YYC3-AI-Aisistant) · [admin@0379.email](mailto:admin@0379.email)

</div>
