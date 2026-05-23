/**
 * @file 数据库通道类型定义
 * @description 定义本地 PostgreSQL 15 和远程数据库适配层的全部数据结构
 * @module types/database
 * @version 0.9.4
 * @since Personalize
 *
 * Database Channel Type Definitions
 * Defines all data structures for local PostgreSQL 15 and remote database adapter layer
 */

/* ──────────────────── 数据库连接配置 / Database Connection Config ──────────────────── */

/**
 * 支持的数据库提供者类型
 * Supported database provider types
 */
export type DatabaseProvider = "postgresql" | "supabase" | "sqlite" | "localStorage";

/**
 * 数据库连接状态
 * Database connection status
 */
export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error" | "migrating";

/**
 * SSL 模式类型
 * SSL mode types
 */
export type SSLMode = "disable" | "require" | "verify-ca" | "verify-full" | "prefer";

/**
 * 数据库连接配置
 * Database Connection Configuration
 */
export interface DatabaseConfig {
  /** 配置唯一标识 / Config unique identifier */
  id: string;
  /** 配置名称（用户友好） / Config display name */
  name: string;
  /** 数据库提供者 / Database provider */
  provider: DatabaseProvider;
  /** 主机地址 / Host address */
  host: string;
  /** 端口号 / Port number */
  port: number;
  /** 数据库名称 / Database name */
  database: string;
  /** 连接用户名 / Connection username */
  username: string;
  /** 连接密码（加密存储） / Connection password (encrypted storage) */
  password: string;
  /** Schema 名称 / Schema name */
  schema: string;
  /** SSL 模式 / SSL mode */
  sslMode: SSLMode;
  /** 连接池大小 / Connection pool size */
  poolSize: number;
  /** 连接超时 (毫秒) / Connection timeout (ms) */
  connectionTimeout: number;
  /** 空闲超时 (毫秒) / Idle timeout (ms) */
  idleTimeout: number;
  /** 是否自动迁移 / Auto migration enabled */
  autoMigrate: boolean;
  /** 是否启用日志 / Logging enabled */
  enableLogging: boolean;
  /** 创建时间 / Created timestamp */
  createdAt: string;
  /** 最后更新时间 / Last updated timestamp */
  updatedAt: string;
}

/**
 * 默认 PostgreSQL 15 本地配置
 * Default PostgreSQL 15 local configuration
 */
export const DEFAULT_PG_CONFIG: DatabaseConfig = {
  id: "pg_local_default",
  name: "YYC3_LOCAL_PG15",
  provider: "postgresql",
  host: "localhost",
  port: 5432,
  database: "yyc3_family",
  username: "yyc3_admin",
  password: "",
  schema: "public",
  sslMode: "prefer",
  poolSize: 10,
  connectionTimeout: 5000,
  idleTimeout: 30000,
  autoMigrate: true,
  enableLogging: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/* ──────────────────── 本地 API 代理配置 / Local API Proxy Config ──────────────────── */

/**
 * 本地 API 代理配置
 * Local API Proxy Configuration
 *
 * 浏览器无法直接连接 PostgreSQL，需要通过本地代理服务中转
 * Browser cannot connect to PostgreSQL directly, requires a local proxy service
 */
export interface LocalAPIProxyConfig {
  /** 代理服务基础 URL / Proxy service base URL */
  baseUrl: string;
  /** API 版本前缀 / API version prefix */
  apiVersion: string;
  /** 认证令牌 / Authentication token */
  authToken: string;
  /** 请求超时 (毫秒) / Request timeout (ms) */
  timeout: number;
  /** 是否启用重试 / Retry enabled */
  enableRetry: boolean;
  /** 最大重试次数 / Max retry count */
  maxRetries: number;
  /** 心跳检测间隔 (毫秒) / Heartbeat interval (ms) */
  heartbeatInterval: number;
}

/**
 * 默认本地 API 代理配置
 * Default local API proxy configuration
 */
export const DEFAULT_PROXY_CONFIG: LocalAPIProxyConfig = {
  baseUrl: "http://localhost:3721",
  apiVersion: "v1",
  authToken: "",
  timeout: 10000,
  enableRetry: true,
  maxRetries: 3,
  heartbeatInterval: 30000,
};

/* ──────────────────── 查询与响应 / Query & Response ──────────────────── */

/**
 * 数据库查询参数
 * Database Query Parameters
 */
export interface DatabaseQuery {
  /** 目标表名 / Target table name */
  table: string;
  /** 查询动作 / Query action */
  action: "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "UPSERT";
  /** WHERE 条件列表 / WHERE conditions */
  conditions?: QueryCondition[];
  /** 查询字段列表 / Select columns */
  columns?: string[];
  /** 插入/更新数据 / Insert/Update data */
  data?: Record<string, string | number | boolean | null>;
  /** 排序规则 / Order by rules */
  orderBy?: OrderByClause[];
  /** 限制返回数量 / Limit count */
  limit?: number;
  /** 偏移量 / Offset */
  offset?: number;
}

/**
 * 查询条件
 * Query Condition
 */
export interface QueryCondition {
  /** 字段名 / Column name */
  column: string;
  /** 操作符 / Operator */
  operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "LIKE" | "ILIKE" | "IN" | "IS NULL" | "IS NOT NULL";
  /** 比较值 / Comparison value */
  value: string | number | boolean | null | Array<string | number>;
}

/**
 * 排序子句
 * Order By Clause
 */
export interface OrderByClause {
  /** 字段名 / Column name */
  column: string;
  /** 排序方向 / Sort direction */
  direction: "ASC" | "DESC";
}

/**
 * 数据库操作结果
 * Database Operation Result
 */
export interface DatabaseResult<T> {
  /** 操作是否成功 / Operation success */
  success: boolean;
  /** 返回数据 / Response data */
  data: T | null;
  /** 影响行数 / Affected rows count */
  affectedRows: number;
  /** 错误信息 / Error message */
  error: string | null;
  /** 查询执行时间 (毫秒) / Query execution time (ms) */
  executionTime: number;
  /** 时间戳 / Timestamp */
  timestamp: string;
}

/* ──────────────────── 迁移 / Migration ──────────────────── */

/**
 * 数据库迁移状态
 * Database Migration Status
 */
export type MigrationStatus = "pending" | "running" | "completed" | "failed" | "rolled_back";

/**
 * 数据库迁移记录
 * Database Migration Record
 */
export interface MigrationRecord {
  /** 迁移版本号 / Migration version number */
  version: string;
  /** 迁移名称 / Migration name */
  name: string;
  /** 迁移状态 / Migration status */
  status: MigrationStatus;
  /** 上行 SQL / Up SQL */
  upSql: string;
  /** 下行 SQL / Down SQL */
  downSql: string;
  /** 执行时间 / Execution timestamp */
  executedAt: string | null;
  /** 校验和 / Checksum */
  checksum: string;
}

/* ──────────────────── 连接健康 / Connection Health ──────────────────── */

/**
 * 数据库连接健康信息
 * Database Connection Health Info
 */
export interface ConnectionHealth {
  /** 连接状态 / Connection status */
  status: ConnectionStatus;
  /** 延迟 (毫秒) / Latency (ms) */
  latency: number;
  /** PostgreSQL 版本 / PostgreSQL version */
  serverVersion: string;
  /** 当前活跃连接数 / Active connections */
  activeConnections: number;
  /** 连接池最大容量 / Max pool size */
  maxConnections: number;
  /** 数据库大小 (字节) / Database size (bytes) */
  databaseSize: number;
  /** 最后检测时间 / Last check timestamp */
  lastCheckedAt: string;
  /** 正常运行时间 (秒) / Uptime (seconds) */
  uptime: number;
}