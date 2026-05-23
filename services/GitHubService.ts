/**
 * @file GitHub 业务服务层
 * @description 封装 GitHub 操作的全部业务逻辑，协调 Repository 层和 MCP API 调用
 * @module services/GitHubService
 * @version 0.9.3
 * @since Intelligence
 * @layer Service (Controller → Service → Repository → Model)
 *
 * GitHub Business Service Layer
 * Encapsulates all GitHub operation business logic, coordinating Repository layer and MCP API calls
 */

import { gitHubRepository } from "../repositories/GitHubRepository";
import type {
  GitHubBranch,
  GitHubCommit,
  GitHubOperationResult,
  GitHubRepository as GitHubRepo,
  PaginatedResponse,
  RepoSearchParams,
} from "../types/github";

/* ──────────────────── MCP 连接状态 / MCP Connection State ──────────────────── */

/**
 * MCP GitHub 连接状态
 * MCP GitHub Connection Status
 */
export interface MCPConnectionState {
  /** 是否已连接 / Is connected */
  isConnected: boolean;
  /** 当前认证用户 / Currently authenticated user */
  authenticatedUser: string | null;
  /** 组织名称 / Organization name */
  organization: string;
  /** 最后验证时间 / Last verification time */
  lastVerifiedAt: string | null;
  /** 可用仓库数量 / Available repository count */
  repoCount: number;
  /** 连接延迟 (ms) / Connection latency (ms) */
  latency: number;
}

/* ──────────────────── 模拟数据 / Mock Data ──────────────────── */

/**
 * 模拟仓库数据（用于演示环境）
 * Mock repository data (for demo environment)
 *
 * 生产环境中将通过 MCP GitHub 工具获取真实数据
 * In production, real data will be fetched via MCP GitHub tools
 */
const MOCK_REPOSITORIES: GitHubRepo[] = [
  {
    id: 1001,
    fullName: "YY-Nexus/YYC-Cube",
    name: "YYC-Cube",
    description: "YYC3 AI Assistant Ecosystem - Core Monorepo | YYC3 AI 家族生态系统核心仓库",
    isPrivate: false,
    defaultBranch: "main",
    htmlUrl: "https://github.com/YY-Nexus/YYC-Cube",
    apiUrl: "https://api.github.com/repos/YY-Nexus/YYC-Cube",
    cloneUrl: "https://github.com/YY-Nexus/YYC-Cube.git",
    language: "TypeScript",
    stargazersCount: 42,
    forksCount: 8,
    openIssuesCount: 15,
    size: 28400,
    createdAt: "2024-01-15T08:00:00Z",
    updatedAt: "2026-02-14T10:30:00Z",
    pushedAt: "2026-02-14T09:45:00Z",
    topics: ["ai", "family", "mcp", "typescript", "terminal-ui"],
    archived: false,
    disabled: false,
  },
  {
    id: 1002,
    fullName: "YY-Nexus/Ralph-Loop",
    name: "Ralph-Loop",
    description: "文档智能闭环工作流系统 | Intelligent Document Closed-Loop Workflow System",
    isPrivate: false,
    defaultBranch: "main",
    htmlUrl: "https://github.com/YY-Nexus/Ralph-Loop",
    apiUrl: "https://api.github.com/repos/YY-Nexus/Ralph-Loop",
    cloneUrl: "https://github.com/YY-Nexus/Ralph-Loop.git",
    language: "Python",
    stargazersCount: 18,
    forksCount: 3,
    openIssuesCount: 7,
    size: 15200,
    createdAt: "2024-03-20T12:00:00Z",
    updatedAt: "2026-02-13T15:00:00Z",
    pushedAt: "2026-02-13T14:30:00Z",
    topics: ["workflow", "document", "automation", "fastapi"],
    archived: false,
    disabled: false,
  },
  {
    id: 1003,
    fullName: "YY-Nexus/YYC3-Terminal",
    name: "YYC3-Terminal",
    description: "终端对话界面 | Terminal UI for AI Assistant Interaction",
    isPrivate: false,
    defaultBranch: "main",
    htmlUrl: "https://github.com/YY-Nexus/YYC3-Terminal",
    apiUrl: "https://api.github.com/repos/YY-Nexus/YYC3-Terminal",
    cloneUrl: "https://github.com/YY-Nexus/YYC3-Terminal.git",
    language: "TypeScript",
    stargazersCount: 25,
    forksCount: 5,
    openIssuesCount: 4,
    size: 12800,
    createdAt: "2024-06-01T09:00:00Z",
    updatedAt: "2026-02-14T08:00:00Z",
    pushedAt: "2026-02-14T07:50:00Z",
    topics: ["terminal", "react", "tailwind", "hacker-ui"],
    archived: false,
    disabled: false,
  },
  {
    id: 1004,
    fullName: "YY-Nexus/MCP-Bridge",
    name: "MCP-Bridge",
    description: "MCP 协议桥接层 | Model Context Protocol Bridge Layer",
    isPrivate: true,
    defaultBranch: "develop",
    htmlUrl: "https://github.com/YY-Nexus/MCP-Bridge",
    apiUrl: "https://api.github.com/repos/YY-Nexus/MCP-Bridge",
    cloneUrl: "https://github.com/YY-Nexus/MCP-Bridge.git",
    language: "TypeScript",
    stargazersCount: 0,
    forksCount: 0,
    openIssuesCount: 12,
    size: 5600,
    createdAt: "2025-09-10T10:00:00Z",
    updatedAt: "2026-02-14T11:00:00Z",
    pushedAt: "2026-02-14T10:55:00Z",
    topics: ["mcp", "bridge", "protocol", "api-gateway"],
    archived: false,
    disabled: false,
  },
];

const MOCK_BRANCHES: GitHubBranch[] = [
  { name: "main", commitSha: "abc123def456", isProtected: true },
  { name: "develop", commitSha: "789ghi012jkl", isProtected: false },
  { name: "feature/v0.9.3-intelligence", commitSha: "mno345pqr678", isProtected: false },
  { name: "hotfix/settings-modal", commitSha: "stu901vwx234", isProtected: false },
];

const MOCK_COMMITS: GitHubCommit[] = [
  {
    sha: "a1b2c3d4e5f6",
    message: "fix(settings): resolve ReferenceError for installedExtensions state",
    author: { name: "YanYu", email: "admin@0379.email", date: "2026-02-14T09:00:00Z" },
    htmlUrl: "https://github.com/YY-Nexus/YYC-Cube/commit/a1b2c3d4e5f6",
  },
  {
    sha: "b2c3d4e5f6a1",
    message: "feat(audio): integrate sound engine into ChatContainer and SystemStartup",
    author: { name: "YanYu", email: "admin@0379.email", date: "2026-02-13T18:00:00Z" },
    htmlUrl: "https://github.com/YY-Nexus/YYC-Cube/commit/b2c3d4e5f6a1",
  },
  {
    sha: "c3d4e5f6a1b2",
    message: "feat(mcp): verify GitHub MCP connection with 120+ repos discovered",
    author: { name: "YanYu", email: "admin@0379.email", date: "2026-02-13T15:30:00Z" },
    htmlUrl: "https://github.com/YY-Nexus/YYC-Cube/commit/c3d4e5f6a1b2",
  },
  {
    sha: "d4e5f6a1b2c3",
    message: "docs: update yyc3.md to v0.9.3 Intelligence milestone",
    author: { name: "YanYu", email: "admin@0379.email", date: "2026-02-13T12:00:00Z" },
    htmlUrl: "https://github.com/YY-Nexus/YYC-Cube/commit/d4e5f6a1b2c3",
  },
];

/* ──────────────────── 服务类 / Service Class ──────────────────── */

/**
 * GitHub 业务服务
 * GitHub Business Service
 *
 * 职责：
 * - 协调 MCP GitHub API 调用与本地缓存
 * - 实现搜索、过滤、排序等业务逻辑
 * - 处理错误恢复与降级策略
 * - 提供统一的操作结果封装
 *
 * Responsibilities:
 * - Coordinates MCP GitHub API calls with local cache
 * - Implements search, filter, sort business logic
 * - Handles error recovery and degradation strategies
 * - Provides unified operation result wrapping
 */
class GitHubServiceImpl {
  /** MCP 连接状态 / MCP connection state */
  private connectionState: MCPConnectionState = {
    isConnected: true,
    authenticatedUser: "YanYu",
    organization: "YY-Nexus",
    lastVerifiedAt: new Date().toISOString(),
    repoCount: 120,
    latency: 45,
  };

  /* ──────────── 连接管理 / Connection Management ──────────── */

  /**
   * 获取当前 MCP 连接状态
   * Get current MCP connection status
   *
   * @returns {MCPConnectionState} 连接状态 / Connection state
   */
  getConnectionState(): MCPConnectionState {
    return { ...this.connectionState };
  }

  /**
   * 验证 MCP GitHub 连接
   * Verify MCP GitHub connection
   *
   * @returns {Promise<GitHubOperationResult<MCPConnectionState>>} 验证结果 / Verification result
   */
  async verifyConnection(): Promise<GitHubOperationResult<MCPConnectionState>> {
    const startTime = Date.now();

    try {
      // 模拟 MCP 连接验证（生产环境通过 MCP 工具执行）
      // Simulate MCP connection verification (via MCP tools in production)
      await this.simulateNetworkDelay(200);

      this.connectionState = {
        ...this.connectionState,
        isConnected: true,
        lastVerifiedAt: new Date().toISOString(),
        latency: Date.now() - startTime,
      };

      return this.wrapResult(this.connectionState);
    } catch {
      this.connectionState.isConnected = false;
      return this.wrapError("MCP_CONNECTION_VERIFY_FAILED / MCP 连接验证失败");
    }
  }

  /* ──────────── 仓库操作 / Repository Operations ──────────── */

  /**
   * 获取组织下所有仓库列表
   * Get all repositories under organization
   *
   * 优先从缓存读取，缓存过期时从 MCP API 拉取
   * Reads from cache first, fetches from MCP API when cache expires
   *
   * @param {boolean} [forceRefresh=false] - 强制刷新 / Force refresh
   * @returns {Promise<GitHubOperationResult<GitHubRepo[]>>} 仓库列表 / Repository list
   */
  async listRepositories(forceRefresh: boolean = false): Promise<GitHubOperationResult<GitHubRepo[]>> {
    try {
      // 尝试从缓存读取 / Try reading from cache
      if (!forceRefresh) {
        const cached = gitHubRepository.getRepositories();
        if (cached.length > 0) {
          return this.wrapResult(cached);
        }
      }

      // 模拟 MCP API 调用（生产环境使用真实 MCP 工具）
      // Simulate MCP API call (uses real MCP tools in production)
      await this.simulateNetworkDelay(300);
      const repos = [...MOCK_REPOSITORIES];

      // 写入缓存 / Write to cache
      gitHubRepository.saveRepositories(repos);

      return this.wrapResult(repos);
    } catch {
      // 降级策略：返回缓存数据 / Degradation: return cached data
      const fallback = gitHubRepository.getRepositories();
      if (fallback.length > 0) {
        return this.wrapResult(fallback);
      }
      return this.wrapError("REPO_LIST_FETCH_FAILED / 获取仓库列表失败");
    }
  }

  /**
   * 搜索仓库
   * Search repositories
   *
   * @param {RepoSearchParams} params - 搜索参数 / Search parameters
   * @returns {Promise<GitHubOperationResult<PaginatedResponse<GitHubRepo>>>} 搜索结果 / Search results
   */
  async searchRepositories(
    params: RepoSearchParams
  ): Promise<GitHubOperationResult<PaginatedResponse<GitHubRepo>>> {
    try {
      const allRepos = gitHubRepository.getRepositories().length > 0
        ? gitHubRepository.getRepositories()
        : MOCK_REPOSITORIES;

      // 应用过滤条件 / Apply filters
      const filtered = allRepos.filter((repo) => {
        const matchesQuery =
          !params.query ||
          repo.name.toLowerCase().includes(params.query.toLowerCase()) ||
          (repo.description?.toLowerCase().includes(params.query.toLowerCase()) ?? false);

        const matchesOrg =
          !params.org ||
          repo.fullName.toLowerCase().startsWith(params.org.toLowerCase());

        const matchesLang =
          !params.language ||
          repo.language?.toLowerCase() === params.language.toLowerCase();

        return matchesQuery && matchesOrg && matchesLang;
      });

      // 应用排序 / Apply sorting
      const sortField = params.sort ?? "updated";
      const sortOrder = params.order ?? "desc";
      filtered.sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case "stars":
            comparison = a.stargazersCount - b.stargazersCount;
            break;
          case "forks":
            comparison = a.forksCount - b.forksCount;
            break;
          case "updated":
            comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
            break;
          case "created":
            comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            break;
        }
        return sortOrder === "desc" ? -comparison : comparison;
      });

      // 应用分页 / Apply pagination
      const perPage = params.perPage ?? 20;
      const page = params.page ?? 1;
      const startIndex = (page - 1) * perPage;
      const paginatedItems = filtered.slice(startIndex, startIndex + perPage);

      const result: PaginatedResponse<GitHubRepo> = {
        items: paginatedItems,
        totalCount: filtered.length,
        page,
        perPage,
        hasNextPage: startIndex + perPage < filtered.length,
      };

      return this.wrapResult(result);
    } catch {
      return this.wrapError("REPO_SEARCH_FAILED / 搜索仓库失败");
    }
  }

  /**
   * 获取单个仓库详情
   * Get single repository details
   *
   * @param {string} owner - 仓库所有者 / Repository owner
   * @param {string} repo - 仓库名称 / Repository name
   * @returns {Promise<GitHubOperationResult<GitHubRepo>>} 仓库详情 / Repository details
   */
  async getRepository(owner: string, repo: string): Promise<GitHubOperationResult<GitHubRepo>> {
    const fullName = `${owner}/${repo}`;

    try {
      // 尝试缓存 / Try cache
      const cached = gitHubRepository.getRepositoryByName(fullName);
      if (cached) return this.wrapResult(cached);

      // 模拟 API 请求 / Simulate API request
      await this.simulateNetworkDelay(150);
      const found = MOCK_REPOSITORIES.find((r) => r.fullName === fullName);

      if (!found) {
        return this.wrapError(`REPO_NOT_FOUND: ${fullName} / 未找到仓库: ${fullName}`);
      }

      gitHubRepository.saveRepository(found);
      return this.wrapResult(found);
    } catch {
      return this.wrapError(`REPO_FETCH_FAILED: ${fullName} / 获取仓库失败: ${fullName}`);
    }
  }

  /* ──────────── 分支操作 / Branch Operations ──────────── */

  /**
   * 获取仓库分支列表
   * Get repository branch list
   *
   * @param {string} owner - 仓库所有者 / Repository owner
   * @param {string} repo - 仓库名称 / Repository name
   * @returns {Promise<GitHubOperationResult<GitHubBranch[]>>} 分支列表 / Branch list
   */
  async listBranches(owner: string, repo: string): Promise<GitHubOperationResult<GitHubBranch[]>> {
    const fullName = `${owner}/${repo}`;

    try {
      const cached = gitHubRepository.getBranches(fullName);
      if (cached.length > 0) return this.wrapResult(cached);

      await this.simulateNetworkDelay(100);
      gitHubRepository.saveBranches(fullName, MOCK_BRANCHES);
      return this.wrapResult(MOCK_BRANCHES);
    } catch {
      return this.wrapError(`BRANCH_LIST_FAILED: ${fullName} / 获取分支列表失败: ${fullName}`);
    }
  }

  /* ──────────── 提交操作 / Commit Operations ──────────── */

  /**
   * 获取仓库提交历史
   * Get repository commit history
   *
   * @param {string} owner - 仓库所有者 / Repository owner
   * @param {string} repo - 仓库名称 / Repository name
   * @param {number} [limit=20] - 返回数量限制 / Result count limit
   * @returns {Promise<GitHubOperationResult<GitHubCommit[]>>} 提交列表 / Commit list
   */
  async listCommits(
    owner: string,
    repo: string,
    limit: number = 20
  ): Promise<GitHubOperationResult<GitHubCommit[]>> {
    const fullName = `${owner}/${repo}`;

    try {
      const cached = gitHubRepository.getCommits(fullName);
      if (cached.length > 0) return this.wrapResult(cached.slice(0, limit));

      await this.simulateNetworkDelay(200);
      gitHubRepository.saveCommits(fullName, MOCK_COMMITS);
      return this.wrapResult(MOCK_COMMITS.slice(0, limit));
    } catch {
      return this.wrapError(`COMMIT_LIST_FAILED: ${fullName} / 获取提交历史失败: ${fullName}`);
    }
  }

  /* ──────────── 缓存管理 / Cache Management ──────────── */

  /**
   * 获取缓存统计信息
   * Get cache statistics
   *
   * @returns {{ totalKeys: number; totalSize: number; lastSync: Date | null }} 缓存统计
   */
  getCacheStats(): { totalKeys: number; totalSize: number; lastSync: Date | null } {
    return gitHubRepository.getCacheStats();
  }

  /**
   * 清除所有 GitHub 缓存
   * Clear all GitHub cache
   */
  clearCache(): void {
    gitHubRepository.clearAllCache();
  }

  /* ──────────── 内部工具 / Internal Utilities ──────────── */

  /**
   * 模拟网络延迟（演示环境使用）
   * Simulate network delay (for demo environment)
   *
   * @param {number} ms - 延迟毫秒数 / Delay milliseconds
   * @returns {Promise<void>}
   */
  private simulateNetworkDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 封装成功结果
   * Wrap success result
   *
   * @template T - 数据类型 / Data type
   * @param {T} data - 返回数据 / Response data
   * @returns {GitHubOperationResult<T>} 操作结果 / Operation result
   */
  private wrapResult<T>(data: T): GitHubOperationResult<T> {
    return {
      success: true,
      data,
      error: null,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 封装错误结果
   * Wrap error result
   *
   * @template T - 数据类型 / Data type
   * @param {string} message - 错误消息 / Error message
   * @returns {GitHubOperationResult<T>} 操作结果 / Operation result
   */
  private wrapError<T>(message: string): GitHubOperationResult<T> {
    return {
      success: false,
      data: null,
      error: message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * GitHub 业务服务单例实例
 * GitHub Business Service singleton instance
 */
export const gitHubService = new GitHubServiceImpl();
