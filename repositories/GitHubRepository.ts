/**
 * @file GitHub 数据仓库层
 * @description 封装所有 GitHub MCP API 的底层数据操作，提供标准化的 CRUD 接口
 * @module repositories/GitHubRepository
 * @version 0.9.3
 * @since Intelligence
 * @layer Repository (Controller → Service → Repository → Model)
 *
 * GitHub Data Repository Layer
 * Encapsulates all GitHub MCP API low-level data operations with standardized CRUD interfaces
 */

import type {
  GitHubRepository as GitHubRepo,
  GitHubBranch,
  GitHubCommit,
  GitHubIssue,
} from "../types/github";

/* ──────────────────── 本地缓存键 / Local Cache Keys ──────────────────── */

const CACHE_KEYS = {
  REPOS: "yyc3_github_repos",
  REPO_DETAIL: "yyc3_github_repo_",
  BRANCHES: "yyc3_github_branches_",
  COMMITS: "yyc3_github_commits_",
  ISSUES: "yyc3_github_issues_",
  SYNC_TIMESTAMP: "yyc3_github_last_sync",
} as const;

/** 缓存过期时间（毫秒）/ Cache expiry time (ms) - 5 minutes */
const CACHE_TTL = 5 * 60 * 1000;

/* ──────────────────── 缓存条目 / Cache Entry ──────────────────── */

/**
 * 带时间戳的缓存条目
 * Timestamped cache entry
 */
interface CacheEntry<T> {
  /** 缓存数据 / Cached data */
  data: T;
  /** 缓存时间戳 / Cache timestamp */
  cachedAt: number;
}

/* ──────────────────── 仓库类 / Repository Class ──────────────────── */

/**
 * GitHub 数据仓库
 * GitHub Data Repository
 *
 * 职责：
 * - 管理 GitHub 数据的本地缓存（localStorage）
 * - 提供统一的数据访问接口
 * - 处理 MCP API 的原始数据映射
 * - 不包含业务逻辑（由 Service 层负责）
 *
 * Responsibilities:
 * - Manages local cache (localStorage) for GitHub data
 * - Provides unified data access interface
 * - Handles raw MCP API data mapping
 * - Contains no business logic (handled by Service layer)
 */
class GitHubRepositoryImpl {
  /* ──────────── 通用缓存操作 / Generic Cache Operations ──────────── */

  /**
   * 从本地缓存读取数据
   * Read data from local cache
   *
   * @template T - 缓存数据类型 / Cache data type
   * @param {string} key - 缓存键 / Cache key
   * @returns {T | null} 缓存数据或 null / Cached data or null
   */
  private readCache<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;

      const entry: CacheEntry<T> = JSON.parse(raw);
      const now = Date.now();

      if (now - entry.cachedAt > CACHE_TTL) {
        localStorage.removeItem(key);
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  }

  /**
   * 写入本地缓存
   * Write data to local cache
   *
   * @template T - 缓存数据类型 / Cache data type
   * @param {string} key - 缓存键 / Cache key
   * @param {T} data - 要缓存的数据 / Data to cache
   */
  private writeCache<T>(key: string, data: T): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        cachedAt: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(entry));
    } catch {
      // 静默处理存储配额超限 / Silently handle storage quota exceeded
    }
  }

  /**
   * 清除指定前缀的缓存
   * Clear cache entries with specified prefix
   *
   * @param {string} prefix - 缓存键前缀 / Cache key prefix
   */
  private clearCacheByPrefix(prefix: string): void {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(prefix));
    keys.forEach((k) => localStorage.removeItem(k));
  }

  /* ──────────── 仓库列表操作 / Repository List Operations ──────────── */

  /**
   * 获取缓存的仓库列表
   * Get cached repository list
   *
   * @returns {GitHubRepo[]} 仓库列表 / Repository list
   */
  getRepositories(): GitHubRepo[] {
    return this.readCache<GitHubRepo[]>(CACHE_KEYS.REPOS) ?? [];
  }

  /**
   * 存储仓库列表到本地缓存
   * Store repository list to local cache
   *
   * @param {GitHubRepo[]} repos - 仓库列表 / Repository list
   */
  saveRepositories(repos: GitHubRepo[]): void {
    this.writeCache(CACHE_KEYS.REPOS, repos);
    this.updateSyncTimestamp();
  }

  /**
   * 获取单个仓库详情（从缓存）
   * Get single repository details (from cache)
   *
   * @param {string} fullName - 仓库全名 (owner/repo) / Full repository name
   * @returns {GitHubRepo | null} 仓库信息或 null / Repository info or null
   */
  getRepositoryByName(fullName: string): GitHubRepo | null {
    const cacheKey = `${CACHE_KEYS.REPO_DETAIL}${fullName.replace("/", "_")}`;
    return this.readCache<GitHubRepo>(cacheKey);
  }

  /**
   * 存储单个仓库详情
   * Store single repository details
   *
   * @param {GitHubRepo} repo - 仓库信息 / Repository info
   */
  saveRepository(repo: GitHubRepo): void {
    const cacheKey = `${CACHE_KEYS.REPO_DETAIL}${repo.fullName.replace("/", "_")}`;
    this.writeCache(cacheKey, repo);
  }

  /* ──────────── 分支操作 / Branch Operations ──────────── */

  /**
   * 获取缓存的分支列表
   * Get cached branch list
   *
   * @param {string} repoFullName - 仓库全名 / Full repository name
   * @returns {GitHubBranch[]} 分支列表 / Branch list
   */
  getBranches(repoFullName: string): GitHubBranch[] {
    const cacheKey = `${CACHE_KEYS.BRANCHES}${repoFullName.replace("/", "_")}`;
    return this.readCache<GitHubBranch[]>(cacheKey) ?? [];
  }

  /**
   * 存储分支列表
   * Store branch list
   *
   * @param {string} repoFullName - 仓库全名 / Full repository name
   * @param {GitHubBranch[]} branches - 分支列表 / Branch list
   */
  saveBranches(repoFullName: string, branches: GitHubBranch[]): void {
    const cacheKey = `${CACHE_KEYS.BRANCHES}${repoFullName.replace("/", "_")}`;
    this.writeCache(cacheKey, branches);
  }

  /* ──────────── 提交操作 / Commit Operations ──────────── */

  /**
   * 获取缓存的提交列表
   * Get cached commit list
   *
   * @param {string} repoFullName - 仓库全名 / Full repository name
   * @returns {GitHubCommit[]} 提交列表 / Commit list
   */
  getCommits(repoFullName: string): GitHubCommit[] {
    const cacheKey = `${CACHE_KEYS.COMMITS}${repoFullName.replace("/", "_")}`;
    return this.readCache<GitHubCommit[]>(cacheKey) ?? [];
  }

  /**
   * 存储提交列表
   * Store commit list
   *
   * @param {string} repoFullName - 仓库全名 / Full repository name
   * @param {GitHubCommit[]} commits - 提交列表 / Commit list
   */
  saveCommits(repoFullName: string, commits: GitHubCommit[]): void {
    const cacheKey = `${CACHE_KEYS.COMMITS}${repoFullName.replace("/", "_")}`;
    this.writeCache(cacheKey, commits);
  }

  /* ──────────── Issue 操作 / Issue Operations ──────────── */

  /**
   * 获取缓存的 Issue 列表
   * Get cached issue list
   *
   * @param {string} repoFullName - 仓库全名 / Full repository name
   * @returns {GitHubIssue[]} Issue 列表 / Issue list
   */
  getIssues(repoFullName: string): GitHubIssue[] {
    const cacheKey = `${CACHE_KEYS.ISSUES}${repoFullName.replace("/", "_")}`;
    return this.readCache<GitHubIssue[]>(cacheKey) ?? [];
  }

  /**
   * 存储 Issue 列表
   * Store issue list
   *
   * @param {string} repoFullName - 仓库全名 / Full repository name
   * @param {GitHubIssue[]} issues - Issue 列表 / Issue list
   */
  saveIssues(repoFullName: string, issues: GitHubIssue[]): void {
    const cacheKey = `${CACHE_KEYS.ISSUES}${repoFullName.replace("/", "_")}`;
    this.writeCache(cacheKey, issues);
  }

  /* ──────────── 同步状态 / Sync Status ──────────── */

  /**
   * 更新最后同步时间戳
   * Update last sync timestamp
   */
  private updateSyncTimestamp(): void {
    localStorage.setItem(CACHE_KEYS.SYNC_TIMESTAMP, Date.now().toString());
  }

  /**
   * 获取最后同步时间
   * Get last sync timestamp
   *
   * @returns {Date | null} 最后同步时间或 null / Last sync time or null
   */
  getLastSyncTime(): Date | null {
    const ts = localStorage.getItem(CACHE_KEYS.SYNC_TIMESTAMP);
    return ts ? new Date(parseInt(ts, 10)) : null;
  }

  /**
   * 清除所有 GitHub 缓存数据
   * Clear all GitHub cached data
   */
  clearAllCache(): void {
    this.clearCacheByPrefix("yyc3_github_");
  }

  /**
   * 获取缓存统计信息
   * Get cache statistics
   *
   * @returns {{ totalKeys: number; totalSize: number; lastSync: Date | null }} 缓存统计
   */
  getCacheStats(): { totalKeys: number; totalSize: number; lastSync: Date | null } {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("yyc3_github_"));
    let totalSize = 0;
    keys.forEach((k) => {
      const val = localStorage.getItem(k);
      if (val) totalSize += val.length * 2; // UTF-16 编码估算 / UTF-16 encoding estimate
    });

    return {
      totalKeys: keys.length,
      totalSize,
      lastSync: this.getLastSyncTime(),
    };
  }
}

/**
 * GitHub 数据仓库单例实例
 * GitHub Data Repository singleton instance
 */
export const gitHubRepository = new GitHubRepositoryImpl();
