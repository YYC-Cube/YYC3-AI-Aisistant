/**
 * @file GitHub 数据类型定义
 * @description 定义 GitHub MCP API 操作所需的全部数据结构
 * @module types/github
 * @version 0.9.3
 * @since Intelligence
 *
 * GitHub Types Definition
 * Defines all data structures required for GitHub MCP API operations
 */

/* ──────────────────────────── 仓库 / Repository ──────────────────────────── */

/**
 * GitHub 仓库信息
 * GitHub Repository Information
 */
export interface GitHubRepository {
  /** 仓库唯一标识 / Unique repository ID */
  id: number;
  /** 仓库全名 (owner/name) / Full repository name */
  fullName: string;
  /** 仓库短名 / Short repository name */
  name: string;
  /** 仓库描述 / Repository description */
  description: string | null;
  /** 是否私有 / Is private repository */
  isPrivate: boolean;
  /** 默认分支 / Default branch name */
  defaultBranch: string;
  /** 仓库主页 URL / Repository homepage URL */
  htmlUrl: string;
  /** 仓库 API URL / Repository API URL */
  apiUrl: string;
  /** 仓库 Clone URL / Repository clone URL */
  cloneUrl: string;
  /** 主要编程语言 / Primary programming language */
  language: string | null;
  /** Star 数量 / Star count */
  stargazersCount: number;
  /** Fork 数量 / Fork count */
  forksCount: number;
  /** 开启的 Issue 数量 / Open issue count */
  openIssuesCount: number;
  /** 仓库大小 (KB) / Repository size in KB */
  size: number;
  /** 创建时间 / Created timestamp */
  createdAt: string;
  /** 最后更新时间 / Last updated timestamp */
  updatedAt: string;
  /** 最后推送时间 / Last push timestamp */
  pushedAt: string;
  /** 话题标签列表 / Topic labels */
  topics: string[];
  /** 是否已归档 / Is archived */
  archived: boolean;
  /** 是否已禁用 / Is disabled */
  disabled: boolean;
}

/* ────────────────────────────── 分支 / Branch ────────────────────────────── */

/**
 * GitHub 分支信息
 * GitHub Branch Information
 */
export interface GitHubBranch {
  /** 分支名称 / Branch name */
  name: string;
  /** 最新提交 SHA / Latest commit SHA */
  commitSha: string;
  /** 是否受保护 / Is protected branch */
  isProtected: boolean;
}

/* ──────────────────────────── 提交 / Commit ──────────────────────────── */

/**
 * GitHub 提交信息
 * GitHub Commit Information
 */
export interface GitHubCommit {
  /** 提交 SHA 哈希 / Commit SHA hash */
  sha: string;
  /** 提交消息 / Commit message */
  message: string;
  /** 作者信息 / Author information */
  author: {
    /** 作者名 / Author name */
    name: string;
    /** 作者邮箱 / Author email */
    email: string;
    /** 提交日期 / Commit date */
    date: string;
  };
  /** 提交页面 URL / Commit page URL */
  htmlUrl: string;
}

/* ──────────────────────────── Issue ──────────────────────────── */

/**
 * GitHub Issue 状态
 * GitHub Issue State
 */
export type GitHubIssueState = "open" | "closed";

/**
 * GitHub Issue 信息
 * GitHub Issue Information
 */
export interface GitHubIssue {
  /** Issue 编号 / Issue number */
  number: number;
  /** Issue 标题 / Issue title */
  title: string;
  /** Issue 内容 / Issue body */
  body: string | null;
  /** Issue 状态 / Issue state */
  state: GitHubIssueState;
  /** 标签列表 / Label list */
  labels: GitHubLabel[];
  /** 指派人列表 / Assignees */
  assignees: GitHubUser[];
  /** 创建时间 / Created timestamp */
  createdAt: string;
  /** 更新时间 / Updated timestamp */
  updatedAt: string;
  /** 页面 URL / Page URL */
  htmlUrl: string;
}

/* ──────────────────────── Pull Request ──────────────────────── */

/**
 * GitHub Pull Request 状态
 * GitHub Pull Request State
 */
export type GitHubPRState = "open" | "closed" | "merged";

/**
 * GitHub Pull Request 信息
 * GitHub Pull Request Information
 */
export interface GitHubPullRequest {
  /** PR 编号 / PR number */
  number: number;
  /** PR 标题 / PR title */
  title: string;
  /** PR 内容 / PR body */
  body: string | null;
  /** PR 状态 / PR state */
  state: GitHubPRState;
  /** 源分支 / Head branch */
  headBranch: string;
  /** 目标分支 / Base branch */
  baseBranch: string;
  /** 是否已合并 / Is merged */
  merged: boolean;
  /** 创建时间 / Created timestamp */
  createdAt: string;
  /** 页面 URL / Page URL */
  htmlUrl: string;
}

/* ──────────────────────── 通用 / Common ──────────────────────── */

/**
 * GitHub 用户信息（精简）
 * GitHub User Information (Compact)
 */
export interface GitHubUser {
  /** 用户 ID / User ID */
  id: number;
  /** 用户登录名 / Username */
  login: string;
  /** 用户头像 URL / Avatar URL */
  avatarUrl: string;
  /** 用户主页 / Profile page URL */
  htmlUrl: string;
}

/**
 * GitHub 标签
 * GitHub Label
 */
export interface GitHubLabel {
  /** 标签 ID / Label ID */
  id: number;
  /** 标签名称 / Label name */
  name: string;
  /** 标签颜色 (Hex) / Label color (Hex) */
  color: string;
  /** 标签描述 / Label description */
  description: string | null;
}

/* ──────────────────── 搜索与过滤 / Search & Filter ──────────────────── */

/**
 * 仓库搜索参数
 * Repository Search Parameters
 */
export interface RepoSearchParams {
  /** 搜索关键字 / Search keyword */
  query: string;
  /** 组织名过滤 / Organization filter */
  org?: string;
  /** 编程语言过滤 / Language filter */
  language?: string;
  /** 排序字段 / Sort field */
  sort?: "stars" | "forks" | "updated" | "created";
  /** 排序方向 / Sort direction */
  order?: "asc" | "desc";
  /** 每页数量 / Items per page */
  perPage?: number;
  /** 页码 / Page number */
  page?: number;
}

/**
 * 分页响应包装
 * Paginated Response Wrapper
 */
export interface PaginatedResponse<T> {
  /** 数据项列表 / Data items */
  items: T[];
  /** 总数量 / Total count */
  totalCount: number;
  /** 当前页码 / Current page */
  page: number;
  /** 每页数量 / Per page count */
  perPage: number;
  /** 是否有下一页 / Has next page */
  hasNextPage: boolean;
}

/* ──────────────────── API 操作结果 / API Result ──────────────────── */

/**
 * GitHub API 操作结果
 * GitHub API Operation Result
 */
export interface GitHubOperationResult<T> {
  /** 操作是否成功 / Operation success flag */
  success: boolean;
  /** 返回数据 / Response data */
  data: T | null;
  /** 错误信息 / Error message */
  error: string | null;
  /** 时间戳 / Timestamp */
  timestamp: string;
}

/* ──────────────────── 文件内容 / File Content ──────────────────── */

/**
 * GitHub 文件内容
 * GitHub File Content
 */
export interface GitHubFileContent {
  /** 文件名 / File name */
  name: string;
  /** 文件路径 / File path */
  path: string;
  /** SHA 哈希 / SHA hash */
  sha: string;
  /** 文件大小 / File size */
  size: number;
  /** 文件类型 / File type */
  type: "file" | "dir" | "symlink" | "submodule";
  /** Base64 编码内容 / Base64 encoded content */
  content: string | null;
  /** 编码方式 / Encoding */
  encoding: string | null;
  /** 下载 URL / Download URL */
  downloadUrl: string | null;
}
