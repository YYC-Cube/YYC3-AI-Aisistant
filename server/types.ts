/**
 * @file YYC3 本地 API 代理服务器 - 类型定义
 * @description Express 代理服务端类型，映射前端 DatabaseQuery 结构
 * @module server/types
 * @version 0.9.4
 * @since Personalize
 *
 * YYC3 Local API Proxy Server - Type Definitions
 * Express proxy server-side types, mapping frontend DatabaseQuery structures
 */

/* ──────────────────── 请求体类型 / Request Body Types ──────────────────── */

/**
 * 结构化查询请求体
 * Structured query request body
 */
export interface QueryRequestBody {
  /** 目标表名 / Target table name */
  table: string;
  /** 查询动作 / Query action */
  action: "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "UPSERT";
  /** WHERE 条件列表 / WHERE conditions */
  conditions?: QueryConditionPayload[];
  /** 查询字段列表 / Select columns */
  columns?: string[];
  /** 插入/更新数据 / Insert/Update data */
  data?: Record<string, string | number | boolean | null>;
  /** 排序规则 / Order by rules */
  orderBy?: OrderByPayload[];
  /** 限制返回数量 / Limit count */
  limit?: number;
  /** 偏移量 / Offset */
  offset?: number;
}

/**
 * 查询条件载荷
 * Query condition payload
 */
export interface QueryConditionPayload {
  /** 字段名 / Column name */
  column: string;
  /** 操作符 / Operator */
  operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "LIKE" | "ILIKE" | "IN" | "IS NULL" | "IS NOT NULL";
  /** 比较值 / Comparison value */
  value: string | number | boolean | null | Array<string | number>;
}

/**
 * 排序载荷
 * Order by payload
 */
export interface OrderByPayload {
  /** 字段名 / Column name */
  column: string;
  /** 排序方向 / Sort direction */
  direction: "ASC" | "DESC";
}

/* ──────────────────── 响应类型 / Response Types ──────────────────── */

/**
 * 标准 API 响应体
 * Standard API response body
 */
export interface ApiResponse<T> {
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

/**
 * 健康检查响应数据
 * Health check response data
 */
export interface HealthData {
  /** 连接状态 / Connection status */
  status: "connected" | "disconnected" | "error";
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

/**
 * 迁移状态响应
 * Migration status response
 */
export interface MigrationStatusData {
  /** 待执行迁移数 / Pending migrations count */
  pending: number;
  /** 已完成迁移数 / Completed migrations count */
  completed: number;
  /** 当前版本 / Current version */
  currentVersion: string;
}

/**
 * 迁移执行结果
 * Migration run result
 */
export interface MigrationRunData {
  /** 执行的迁移数 / Migrations run count */
  migrationsRun: number;
  /** 当前版本 / Current version */
  currentVersion: string;
}

/* ──────────────────── 服务器配置 / Server Config ──────────────────── */

/**
 * 服务器启动配置
 * Server startup configuration
 */
export interface ServerConfig {
  /** 监听端口 / Listen port */
  port: number;
  /** CORS 允许的域 / CORS allowed origins */
  corsOrigins: string[];
  /** 认证令牌 (可选) / Auth token (optional) */
  authToken: string;
  /** PostgreSQL 连接字符串 / PostgreSQL connection string */
  pgConnectionString: string;
  /** 连接池大小 / Connection pool size */
  pgPoolSize: number;
  /** 空闲超时 (毫秒) / Idle timeout (ms) */
  pgIdleTimeout: number;
  /** 连接超时 (毫秒) / Connection timeout (ms) */
  pgConnectionTimeout: number;
  /** 日志级别 / Log level */
  logLevel: "debug" | "info" | "warn" | "error";
}

/**
 * 允许的表名白名单
 * Allowed table names whitelist
 *
 * 防止 SQL 注入 - 仅允许访问预定义的表
 * Prevents SQL injection - only allows access to predefined tables
 */
export const ALLOWED_TABLES: ReadonlyArray<string> = [
  "chats",
  "channels",
  "agents",
  "workflows",
  "system_configs",
  "mcp_connections",
  "github_repo_cache",
  "migration_log",
] as const;

/**
 * 允许的列名正则 (防注入)
 * Allowed column name regex (injection prevention)
 */
export const SAFE_IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
