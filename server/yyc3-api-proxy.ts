/**
 * @file YYC³ AI Family - 本地 API 代理服务器
 * @description Express 代理服务，桥接前端浏览器与本地 PostgreSQL 15 数据库
 * @module server/yyc3-api-proxy
 * @version 0.9.4
 * @since Personalize
 * @port 3721
 *
 * YYC³ AI Family - Local API Proxy Server
 * Express proxy service bridging frontend browser and local PostgreSQL 15 database
 *
 * 架构 / Architecture:
 * ┌─────────────┐     REST API     ┌─────────────────────┐     pg Pool     ┌──────────────┐
 * │  YYC3 Front │ ──────────────→  │  Express Proxy      │ ─────────────→  │ PostgreSQL   │
 * │  (Browser)  │ ←──────────────  │  localhost:3721      │ ←─────────────  │ 15 (:5432)   │
 * └─────────────┘                  └─────────────────────┘                 └──────────────┘
 *
 * 端点清单 / Endpoint Inventory:
 * ┌──────────────────────────────┬────────┬──────────────────────────────────────────┐
 * │ Endpoint                     │ Method │ Description                              │
 * ├──────────────────────────────┼────────┼──────────────────────────────────────────┤
 * │ /api/v1/health               │ GET    │ 健康检查 / Health check                   │
 * │ /api/v1/query                │ POST   │ 结构化查询 / Structured query              │
 * │ /api/v1/data/:table          │ GET    │ 列表查询 / List records                   │
 * │ /api/v1/data/:table          │ POST   │ 插入记录 / Insert record                  │
 * │ /api/v1/data/:table/:id      │ GET    │ 单条查询 / Get single record              │
 * │ /api/v1/data/:table/:id      │ PUT    │ 更新记录 / Update record                  │
 * │ /api/v1/data/:table/:id      │ DELETE │ 删除记录 / Delete record                  │
 * │ /api/v1/migrations/status    │ GET    │ 迁移状态 / Migration status               │
 * │ /api/v1/migrations/run       │ POST   │ 执行迁移 / Run migrations                 │
 * │ /api/v1/tables               │ GET    │ 表清单 / List tables                      │
 * └──────────────────────────────┴────────┴──────────────────────────────────────────┘
 *
 * 启动方式 / Startup:
 *   npx ts-node server/yyc3-api-proxy.ts
 *   -- 或 / or --
 *   npx tsx server/yyc3-api-proxy.ts
 *
 * 环境变量 / Environment Variables:
 *   YYC3_PORT              - 服务端口 (default: 3721)
 *   YYC3_PG_HOST           - PG 主机 (default: localhost)
 *   YYC3_PG_PORT           - PG 端口 (default: 5432)
 *   YYC3_PG_DATABASE       - 数据库名 (default: yyc3_family)
 *   YYC3_PG_USER           - 用户名 (default: yyc3_admin)
 *   YYC3_PG_PASSWORD       - 密码 (default: '')
 *   YYC3_PG_SSL            - SSL 模式 (default: prefer)
 *   YYC3_AUTH_TOKEN         - 认证令牌 (default: '' = 无认证)
 *   YYC3_CORS_ORIGINS       - CORS 域 (default: http://localhost:5173,http://localhost:3000)
 *   YYC3_PG_POOL_SIZE       - 连接池大小 (default: 10)
 *   YYC3_LOG_LEVEL          - 日志级别 (default: info)
 */

import cors from "cors";
import { config as dotenvConfig } from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { Pool, PoolConfig } from "pg";
import type {
  ApiResponse,
  HealthData,
  MigrationRunData,
  MigrationStatusData,
  QueryConditionPayload,
  QueryRequestBody,
  ServerConfig,
} from "./types";
import { ALLOWED_TABLES, SAFE_IDENTIFIER_REGEX } from "./types";

/* ══════════════════════════════════════════════════════════════════════
 *  环境变量加载 / Load Environment Variables
 * ══════════════════════════════════════════════════════════════════════ */

dotenvConfig();

/* ══════════════════════════════════════════════════════════════════════
 *  日志工具 / Logger Utility
 * ══════════════════════════════════════════════════════════════════════ */

/**
 * 日志级别定义
 * Log level definition
 */
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;

/**
 * 结构化日志器
 * Structured logger
 *
 * @param {"debug" | "info" | "warn" | "error"} configuredLevel - 配置的日志级别
 * @returns 日志方法集合 / Logger methods collection
 */
function createLogger(configuredLevel: "debug" | "info" | "warn" | "error") {
  const threshold = LOG_LEVELS[configuredLevel];

  const emit = (level: "debug" | "info" | "warn" | "error", message: string, meta?: Record<string, unknown>) => {
    if (LOG_LEVELS[level] < threshold) return;
    const entry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      service: "yyc3-api-proxy",
      message,
      ...meta,
    };
    process.stdout.write(JSON.stringify(entry) + "\n");
  };

  return {
    debug: (msg: string, meta?: Record<string, unknown>) => emit("debug", msg, meta),
    info: (msg: string, meta?: Record<string, unknown>) => emit("info", msg, meta),
    warn: (msg: string, meta?: Record<string, unknown>) => emit("warn", msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => emit("error", msg, meta),
  };
}

/* ══════════════════════════════════════════════════════════════════════
 *  配置加载 / Config Loading
 * ══════════════════════════════════════════════════════════════════════ */

/**
 * 从环境变量加载服务器配置
 * Load server configuration from environment variables
 *
 * @returns {ServerConfig} 服务器配置 / Server configuration
 */
function loadConfig(): ServerConfig {
  return {
    port: parseInt(process.env.YYC3_PORT ?? "3721", 10),
    corsOrigins: (process.env.YYC3_CORS_ORIGINS ?? "http://localhost:5173,http://localhost:3000,http://localhost:5174").split(","),
    authToken: process.env.YYC3_AUTH_TOKEN ?? "",
    pgConnectionString: buildPgConnectionString(),
    pgPoolSize: parseInt(process.env.YYC3_PG_POOL_SIZE ?? "10", 10),
    pgIdleTimeout: 30000,
    pgConnectionTimeout: 5000,
    logLevel: (process.env.YYC3_LOG_LEVEL ?? "info") as ServerConfig["logLevel"],
  };
}

/**
 * 构建 PostgreSQL 连接字符串
 * Build PostgreSQL connection string
 *
 * @returns {string} 连接字符串 / Connection string
 */
function buildPgConnectionString(): string {
  const host = process.env.YYC3_PG_HOST ?? "localhost";
  const port = process.env.YYC3_PG_PORT ?? "5432";
  const db = process.env.YYC3_PG_DATABASE ?? "yyc3_family";
  const user = process.env.YYC3_PG_USER ?? "yyc3_admin";
  const password = process.env.YYC3_PG_PASSWORD ?? "";
  const ssl = process.env.YYC3_PG_SSL ?? "prefer";
  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${db}?sslmode=${ssl}`;
}

/* ══════════════════════════════════════════════════════════════════════
 *  PostgreSQL 连接池 / PostgreSQL Connection Pool
 * ══════════════════════════════════════════════════════════════════════ */

/**
 * 初始化 PostgreSQL 连接池
 * Initialize PostgreSQL connection pool
 *
 * @param {ServerConfig} config - 服务器配置 / Server configuration
 * @returns {Pool} PostgreSQL 连接池 / PostgreSQL connection pool
 */
function createPool(config: ServerConfig): Pool {
  const poolConfig: PoolConfig = {
    connectionString: config.pgConnectionString,
    max: config.pgPoolSize,
    idleTimeoutMillis: config.pgIdleTimeout,
    connectionTimeoutMillis: config.pgConnectionTimeout,
  };
  return new Pool(poolConfig);
}

/* ══════════════════════════════════════════════════════════════════════
 *  中间件 / Middleware
 * ══════════════════════════════════════════════════════════════════════ */

/**
 * 认证中间件工厂
 * Authentication middleware factory
 *
 * 当 authToken 为空时跳过认证（本地开发模式）
 * Skips authentication when authToken is empty (local dev mode)
 *
 * @param {string} authToken - 期望的认证令牌 / Expected auth token
 * @returns {Function} Express 中间件 / Express middleware
 */
function createAuthMiddleware(authToken: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!authToken) {
      next();
      return;
    }

    const header = req.headers.authorization;
    if (!header || header !== `Bearer ${authToken}`) {
      res.status(401).json({
        success: false,
        data: null,
        affectedRows: 0,
        error: "UNAUTHORIZED / 未授权：无效的认证令牌",
        executionTime: 0,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    next();
  };
}

/**
 * 请求日志中间件
 * Request logging middleware
 *
 * @param {ReturnType<typeof createLogger>} logger - 日志器 / Logger
 * @returns {Function} Express 中间件 / Express middleware
 */
function createRequestLogger(logger: ReturnType<typeof createLogger>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();
    res.on("finish", () => {
      logger.info("REQUEST_PROCESSED", {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: Date.now() - start,
      });
    });
    next();
  };
}

/* ══════════════════════════════════════════════════════════════════════
 *  安全验证 / Security Validation
 * ══════════════════════════════════════════════════════════════════════ */

/**
 * 验证表名是否在白名单中
 * Validate table name is in whitelist
 *
 * @param {string} table - 表名 / Table name
 * @returns {boolean} 是否合法 / Is valid
 */
function isValidTable(table: string): boolean {
  return ALLOWED_TABLES.includes(table);
}

/**
 * 验证标识符是否安全（防 SQL 注入）
 * Validate identifier is safe (SQL injection prevention)
 *
 * @param {string} identifier - 标识符 / Identifier
 * @returns {boolean} 是否安全 / Is safe
 */
function isSafeIdentifier(identifier: string): boolean {
  return SAFE_IDENTIFIER_REGEX.test(identifier);
}

/**
 * 构建错误响应
 * Build error response
 *
 * @param {string} error - 错误信息 / Error message
 * @param {number} startTime - 请求开始时间 / Request start time
 * @returns {ApiResponse<null>} 错误响应体 / Error response body
 */
function errorResponse(error: string, startTime: number): ApiResponse<null> {
  return {
    success: false,
    data: null,
    affectedRows: 0,
    error,
    executionTime: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  };
}

/* ══════════════════════════════════════════════════════════════════════
 *  SQL 构建器 / SQL Builder
 * ══════════════════════════════════════════════════════════════════════ */

/**
 * 构建 WHERE 子句
 * Build WHERE clause from conditions
 *
 * @param {QueryConditionPayload[]} conditions - 条件列表 / Condition list
 * @param {number} paramOffset - 参数偏移量 / Parameter offset
 * @returns {{ clause: string; values: Array<string | number | boolean | null> }} WHERE 子句和参数值
 */
function buildWhereClause(
  conditions: QueryConditionPayload[],
  paramOffset: number = 1
): { clause: string; values: Array<string | number | boolean | null> } {
  const parts: string[] = [];
  const values: Array<string | number | boolean | null> = [];

  for (const cond of conditions) {
    if (!isSafeIdentifier(cond.column)) {
      throw new Error(`INVALID_COLUMN / 非法列名: ${cond.column}`);
    }

    const col = `"${cond.column}"`;

    switch (cond.operator) {
      case "IS NULL":
        parts.push(`${col} IS NULL`);
        break;
      case "IS NOT NULL":
        parts.push(`${col} IS NOT NULL`);
        break;
      case "IN": {
        if (!Array.isArray(cond.value)) {
          throw new Error(`IN_REQUIRES_ARRAY / IN 操作符需要数组值`);
        }
        const placeholders = cond.value.map((_, i) => `$${paramOffset + values.length + i}`);
        parts.push(`${col} IN (${placeholders.join(", ")})`);
        values.push(...(cond.value as Array<string | number>));
        break;
      }
      default: {
        parts.push(`${col} ${cond.operator} $${paramOffset + values.length}`);
        values.push(cond.value as string | number | boolean | null);
      }
    }
  }

  return {
    clause: parts.length > 0 ? `WHERE ${parts.join(" AND ")}` : "",
    values,
  };
}

/* ══════════════════════════════════════════════════════════════════════
 *  路由处理器 / Route Handlers
 * ═════════════════════════════════════════════════════════════════════ */

/**
 * 创建路由器
 * Create router with all API endpoints
 *
 * @param {Pool} pool - PostgreSQL 连接池 / PostgreSQL connection pool
 * @param {ReturnType<typeof createLogger>} logger - 日志器 / Logger
 * @returns {express.Router} Express 路由器 / Express router
 */
function createApiRouter(pool: Pool, logger: ReturnType<typeof createLogger>): express.Router {
  const router = express.Router();

  /* ──────────── GET /health ──────────── */

  /**
   * 健康检查端点
   * Health check endpoint
   *
   * 返回数据库连接状态、版本、活跃连接数、数据库大小等
   * Returns database connection status, version, active connections, database size, etc.
   */
  router.get("/health", async (_req: Request, res: Response): Promise<void> => {
    const start = Date.now();
    try {
      const client = await pool.connect();
      try {
        const versionResult = await client.query("SELECT version()");
        const versionStr: string = versionResult.rows[0]?.version ?? "Unknown";

        const statsResult = await client.query(`
          SELECT
            (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) AS active_connections,
            (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') AS max_connections,
            (SELECT pg_database_size(current_database())) AS database_size,
            (SELECT EXTRACT(EPOCH FROM (now() - pg_postmaster_start_time()))::int) AS uptime
        `);

        const stats = statsResult.rows[0];
        const latency = Date.now() - start;

        const healthData: HealthData = {
          status: "connected",
          latency,
          serverVersion: versionStr,
          activeConnections: parseInt(stats.active_connections, 10),
          maxConnections: parseInt(stats.max_connections, 10),
          databaseSize: parseInt(stats.database_size, 10),
          lastCheckedAt: new Date().toISOString(),
          uptime: parseInt(stats.uptime, 10),
        };

        const response: ApiResponse<HealthData> = {
          success: true,
          data: healthData,
          affectedRows: 0,
          error: null,
          executionTime: latency,
          timestamp: new Date().toISOString(),
        };

        res.json(response);
      } finally {
        client.release();
      }
    } catch (err) {
      logger.error("HEALTH_CHECK_FAILED", { error: (err as Error).message });
      res.status(503).json(errorResponse(
        `PG_CONNECTION_FAILED / 数据库连接失败: ${(err as Error).message}`,
        start
      ));
    }
  });

  /* ──────────── POST /query ──────────── */

  /**
   * 结构化查询端点
   * Structured query endpoint
   *
   * 接收前端 DatabaseQuery 格式，构建并执行 SQL
   * Receives frontend DatabaseQuery format, builds and executes SQL
   */
  router.post("/query", async (req: Request, res: Response): Promise<void> => {
    const start = Date.now();
    const body: QueryRequestBody = req.body;

    /** 验证表名 / Validate table name */
    if (!body.table || !isValidTable(body.table)) {
      res.status(400).json(errorResponse(
        `INVALID_TABLE / 无效表名: ${body.table}. 允许的表: ${ALLOWED_TABLES.join(", ")}`,
        start
      ));
      return;
    }

    /** 验证操作类型 / Validate action type */
    const validActions = ["SELECT", "INSERT", "UPDATE", "DELETE", "UPSERT"];
    if (!body.action || !validActions.includes(body.action)) {
      res.status(400).json(errorResponse(
        `INVALID_ACTION / 无效操作: ${body.action}`,
        start
      ));
      return;
    }

    try {
      const client = await pool.connect();
      try {
        let result;

        switch (body.action) {
          case "SELECT": {
            const cols = body.columns?.every(c => isSafeIdentifier(c))
              ? body.columns.map(c => `"${c}"`).join(", ")
              : "*";
            const { clause, values } = body.conditions
              ? buildWhereClause(body.conditions)
              : { clause: "", values: [] };

            let orderClause = "";
            if (body.orderBy && body.orderBy.length > 0) {
              const orderParts = body.orderBy
                .filter(o => isSafeIdentifier(o.column))
                .map(o => `"${o.column}" ${o.direction === "DESC" ? "DESC" : "ASC"}`);
              if (orderParts.length > 0) orderClause = `ORDER BY ${orderParts.join(", ")}`;
            }

            const limitClause = body.limit ? `LIMIT ${Math.min(body.limit, 1000)}` : "LIMIT 100";
            const offsetClause = body.offset ? `OFFSET ${Math.max(0, body.offset)}` : "";

            const sql = `SELECT ${cols} FROM "${body.table}" ${clause} ${orderClause} ${limitClause} ${offsetClause}`.trim();
            logger.debug("QUERY_EXECUTE", { sql, params: values });
            result = await client.query(sql, values);

            res.json({
              success: true,
              data: result.rows,
              affectedRows: result.rowCount ?? 0,
              error: null,
              executionTime: Date.now() - start,
              timestamp: new Date().toISOString(),
            });
            break;
          }

          case "INSERT": {
            if (!body.data || Object.keys(body.data).length === 0) {
              res.status(400).json(errorResponse("INSERT_REQUIRES_DATA / INSERT 需要数据", start));
              return;
            }

            const keys = Object.keys(body.data).filter(isSafeIdentifier);
            const vals = keys.map(k => body.data![k]);
            const placeholders = keys.map((_, i) => `$${i + 1}`);

            const sql = `INSERT INTO "${body.table}" (${keys.map(k => `"${k}"`).join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`;
            logger.debug("QUERY_INSERT", { sql });
            result = await client.query(sql, vals);

            res.json({
              success: true,
              data: result.rows[0] ?? null,
              affectedRows: result.rowCount ?? 0,
              error: null,
              executionTime: Date.now() - start,
              timestamp: new Date().toISOString(),
            });
            break;
          }

          case "UPDATE": {
            if (!body.data || !body.conditions || body.conditions.length === 0) {
              res.status(400).json(errorResponse("UPDATE_REQUIRES_DATA_AND_CONDITIONS / UPDATE 需要数据和条件", start));
              return;
            }

            const dataKeys = Object.keys(body.data).filter(isSafeIdentifier);
            const setParts = dataKeys.map((k, i) => `"${k}" = $${i + 1}`);
            const setVals = dataKeys.map(k => body.data![k]);

            const { clause, values: whereVals } = buildWhereClause(body.conditions, dataKeys.length + 1);
            const allVals = [...setVals, ...whereVals];

            const sql = `UPDATE "${body.table}" SET ${setParts.join(", ")}, "updated_at" = NOW() ${clause} RETURNING *`;
            logger.debug("QUERY_UPDATE", { sql });
            result = await client.query(sql, allVals);

            res.json({
              success: true,
              data: result.rows,
              affectedRows: result.rowCount ?? 0,
              error: null,
              executionTime: Date.now() - start,
              timestamp: new Date().toISOString(),
            });
            break;
          }

          case "DELETE": {
            if (!body.conditions || body.conditions.length === 0) {
              res.status(400).json(errorResponse("DELETE_REQUIRES_CONDITIONS / DELETE 需要条件（防止误删全表）", start));
              return;
            }

            const { clause, values: delVals } = buildWhereClause(body.conditions);
            const sql = `DELETE FROM "${body.table}" ${clause} RETURNING *`;
            logger.debug("QUERY_DELETE", { sql });
            result = await client.query(sql, delVals);

            res.json({
              success: true,
              data: result.rows,
              affectedRows: result.rowCount ?? 0,
              error: null,
              executionTime: Date.now() - start,
              timestamp: new Date().toISOString(),
            });
            break;
          }

          case "UPSERT": {
            if (!body.data) {
              res.status(400).json(errorResponse("UPSERT_REQUIRES_DATA / UPSERT 需要数据", start));
              return;
            }

            const upsertKeys = Object.keys(body.data).filter(isSafeIdentifier);
            const upsertVals = upsertKeys.map(k => body.data![k]);
            const upsertPlaceholders = upsertKeys.map((_, i) => `$${i + 1}`);
            const updateSet = upsertKeys
              .filter(k => k !== "id")
              .map((k, i) => `"${k}" = EXCLUDED."${k}"`)
              .join(", ");

            const idCol = upsertKeys.includes("id") ? "id" : upsertKeys[0];
            const sql = `INSERT INTO "${body.table}" (${upsertKeys.map(k => `"${k}"`).join(", ")}) VALUES (${upsertPlaceholders.join(", ")}) ON CONFLICT ("${idCol}") DO UPDATE SET ${updateSet}, "updated_at" = NOW() RETURNING *`;
            logger.debug("QUERY_UPSERT", { sql });
            result = await client.query(sql, upsertVals);

            res.json({
              success: true,
              data: result.rows,
              affectedRows: result.rowCount ?? 0,
              error: null,
              executionTime: Date.now() - start,
              timestamp: new Date().toISOString(),
            });
            break;
          }
        }
      } finally {
        client.release();
      }
    } catch (err) {
      logger.error("QUERY_FAILED", { error: (err as Error).message, table: body.table, action: body.action });
      res.status(500).json(errorResponse(
        `QUERY_ERROR / 查询错误: ${(err as Error).message}`,
        start
      ));
    }
  });

  /* ──────────── GET /data/:table ──────────── */

  /**
   * 列表查询端点
   * List records endpoint
   */
  router.get("/data/:table", async (req: Request, res: Response): Promise<void> => {
    const start = Date.now();
    const { table } = req.params;

    if (!isValidTable(table)) {
      res.status(400).json(errorResponse(`INVALID_TABLE / 无效表名: ${table}`, start));
      return;
    }

    try {
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 100, 1000);
      const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);
      const orderBy = (req.query.orderBy as string) || "updated_at";
      const orderDir = (req.query.orderDir as string)?.toUpperCase() === "ASC" ? "ASC" : "DESC";

      if (!isSafeIdentifier(orderBy)) {
        res.status(400).json(errorResponse(`INVALID_ORDER_COLUMN / 非法排序列: ${orderBy}`, start));
        return;
      }

      const client = await pool.connect();
      try {
        const result = await client.query(
          `SELECT * FROM "${table}" ORDER BY "${orderBy}" ${orderDir} LIMIT $1 OFFSET $2`,
          [limit, offset]
        );
        const countResult = await client.query(`SELECT count(*) AS total FROM "${table}"`);

        res.json({
          success: true,
          data: result.rows,
          affectedRows: result.rowCount ?? 0,
          total: parseInt(countResult.rows[0].total, 10),
          error: null,
          executionTime: Date.now() - start,
          timestamp: new Date().toISOString(),
        });
      } finally {
        client.release();
      }
    } catch (err) {
      logger.error("LIST_FAILED", { error: (err as Error).message, table });
      res.status(500).json(errorResponse(`LIST_ERROR / 查询失败: ${(err as Error).message}`, start));
    }
  });

  /* ──────────── POST /data/:table ──────────── */

  /**
   * 插入记录端点
   * Insert record endpoint
   */
  router.post("/data/:table", async (req: Request, res: Response): Promise<void> => {
    const start = Date.now();
    const { table } = req.params;

    if (!isValidTable(table)) {
      res.status(400).json(errorResponse(`INVALID_TABLE / 无效表名: ${table}`, start));
      return;
    }

    const data: Record<string, unknown> = req.body;
    if (!data || Object.keys(data).length === 0) {
      res.status(400).json(errorResponse("EMPTY_BODY / 请求体为空", start));
      return;
    }

    try {
      const keys = Object.keys(data).filter(isSafeIdentifier);
      const vals = keys.map(k => data[k]);
      const placeholders = keys.map((_, i) => `$${i + 1}`);

      const client = await pool.connect();
      try {
        const result = await client.query(
          `INSERT INTO "${table}" (${keys.map(k => `"${k}"`).join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
          vals
        );

        res.status(201).json({
          success: true,
          data: result.rows[0] ?? null,
          affectedRows: result.rowCount ?? 0,
          error: null,
          executionTime: Date.now() - start,
          timestamp: new Date().toISOString(),
        });
      } finally {
        client.release();
      }
    } catch (err) {
      logger.error("INSERT_FAILED", { error: (err as Error).message, table });
      res.status(500).json(errorResponse(`INSERT_ERROR / 插入失败: ${(err as Error).message}`, start));
    }
  });

  /* ──────────── GET /data/:table/:id ──────────── */

  /**
   * 单条查询端点
   * Get single record endpoint
   */
  router.get("/data/:table/:id", async (req: Request, res: Response): Promise<void> => {
    const start = Date.now();
    const { table, id } = req.params;

    if (!isValidTable(table)) {
      res.status(400).json(errorResponse(`INVALID_TABLE / 无效表名: ${table}`, start));
      return;
    }

    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`SELECT * FROM "${table}" WHERE id = $1`, [id]);

        if (result.rowCount === 0) {
          res.status(404).json(errorResponse(`RECORD_NOT_FOUND / 记录未找到: ${id}`, start));
          return;
        }

        res.json({
          success: true,
          data: result.rows[0],
          affectedRows: 1,
          error: null,
          executionTime: Date.now() - start,
          timestamp: new Date().toISOString(),
        });
      } finally {
        client.release();
      }
    } catch (err) {
      logger.error("GET_RECORD_FAILED", { error: (err as Error).message, table, id });
      res.status(500).json(errorResponse(`GET_ERROR / 查询失败: ${(err as Error).message}`, start));
    }
  });

  /* ──────────── PUT /data/:table/:id ──────────── */

  /**
   * 更新记录端点
   * Update record endpoint
   */
  router.put("/data/:table/:id", async (req: Request, res: Response): Promise<void> => {
    const start = Date.now();
    const { table, id } = req.params;

    if (!isValidTable(table)) {
      res.status(400).json(errorResponse(`INVALID_TABLE / 无效表名: ${table}`, start));
      return;
    }

    const data: Record<string, unknown> = req.body;
    if (!data || Object.keys(data).length === 0) {
      res.status(400).json(errorResponse("EMPTY_BODY / 请求体为空", start));
      return;
    }

    try {
      const keys = Object.keys(data).filter(k => isSafeIdentifier(k) && k !== "id" && k !== "created_at");
      const setParts = keys.map((k, i) => `"${k}" = $${i + 1}`);
      const vals = [...keys.map(k => data[k]), id];

      const client = await pool.connect();
      try {
        const result = await client.query(
          `UPDATE "${table}" SET ${setParts.join(", ")}, "updated_at" = NOW() WHERE id = $${keys.length + 1} RETURNING *`,
          vals
        );

        if (result.rowCount === 0) {
          res.status(404).json(errorResponse(`RECORD_NOT_FOUND / 记录未找到: ${id}`, start));
          return;
        }

        res.json({
          success: true,
          data: result.rows[0],
          affectedRows: result.rowCount ?? 0,
          error: null,
          executionTime: Date.now() - start,
          timestamp: new Date().toISOString(),
        });
      } finally {
        client.release();
      }
    } catch (err) {
      logger.error("UPDATE_FAILED", { error: (err as Error).message, table, id });
      res.status(500).json(errorResponse(`UPDATE_ERROR / 更新失败: ${(err as Error).message}`, start));
    }
  });

  /* ──────────── DELETE /data/:table/:id ──────────── */

  /**
   * 删除记录端点
   * Delete record endpoint
   */
  router.delete("/data/:table/:id", async (req: Request, res: Response): Promise<void> => {
    const start = Date.now();
    const { table, id } = req.params;

    if (!isValidTable(table)) {
      res.status(400).json(errorResponse(`INVALID_TABLE / 无效表名: ${table}`, start));
      return;
    }

    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`DELETE FROM "${table}" WHERE id = $1 RETURNING *`, [id]);

        if (result.rowCount === 0) {
          res.status(404).json(errorResponse(`RECORD_NOT_FOUND / 记录未找到: ${id}`, start));
          return;
        }

        res.json({
          success: true,
          data: null,
          affectedRows: result.rowCount ?? 0,
          error: null,
          executionTime: Date.now() - start,
          timestamp: new Date().toISOString(),
        });
      } finally {
        client.release();
      }
    } catch (err) {
      logger.error("DELETE_FAILED", { error: (err as Error).message, table, id });
      res.status(500).json(errorResponse(`DELETE_ERROR / 删除失败: ${(err as Error).message}`, start));
    }
  });

  /* ──────────── GET /tables ──────────── */

  /**
   * 列出所有可用表
   * List all available tables
   */
  router.get("/tables", async (_req: Request, res: Response): Promise<void> => {
    const start = Date.now();
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT
            t.table_name,
            (SELECT count(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS column_count,
            pg_total_relation_size(quote_ident(t.table_name))::bigint AS size_bytes
          FROM information_schema.tables t
          WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
          ORDER BY t.table_name
        `);

        res.json({
          success: true,
          data: result.rows.map((r: Record<string, unknown>) => ({
            name: r.table_name,
            columnCount: parseInt(r.column_count as string, 10),
            sizeBytes: parseInt(r.size_bytes as string, 10),
            isAllowed: ALLOWED_TABLES.includes(r.table_name as string),
          })),
          affectedRows: result.rowCount ?? 0,
          error: null,
          executionTime: Date.now() - start,
          timestamp: new Date().toISOString(),
        });
      } finally {
        client.release();
      }
    } catch (err) {
      logger.error("LIST_TABLES_FAILED", { error: (err as Error).message });
      res.status(500).json(errorResponse(`TABLES_ERROR / 查询表失败: ${(err as Error).message}`, start));
    }
  });

  /* ──────────── GET /migrations/status ──────────── */

  /**
   * 迁移状态端点
   * Migration status endpoint
   */
  router.get("/migrations/status", async (_req: Request, res: Response): Promise<void> => {
    const start = Date.now();
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT
            count(*) FILTER (WHERE status = 'completed') AS completed,
            count(*) FILTER (WHERE status = 'pending') AS pending,
            max(version) AS current_version
          FROM migration_log
        `);

        const row = result.rows[0];
        const statusData: MigrationStatusData = {
          completed: parseInt(row.completed, 10),
          pending: parseInt(row.pending, 10),
          currentVersion: row.current_version ?? "0.0.0",
        };

        res.json({
          success: true,
          data: statusData,
          affectedRows: 0,
          error: null,
          executionTime: Date.now() - start,
          timestamp: new Date().toISOString(),
        });
      } finally {
        client.release();
      }
    } catch (err) {
      logger.error("MIGRATION_STATUS_FAILED", { error: (err as Error).message });
      res.status(500).json(errorResponse(`MIGRATION_STATUS_ERROR / 迁移状态查询失败: ${(err as Error).message}`, start));
    }
  });

  /* ──────────── POST /migrations/run ──────────── */

  /**
   * 执行迁移端点
   * Run migrations endpoint
   *
   * 检查并记录迁移版本，实际 DDL 应通过 psql 执行
   * Checks and records migration versions, actual DDL should be run via psql
   */
  router.post("/migrations/run", async (_req: Request, res: Response): Promise<void> => {
    const start = Date.now();
    try {
      const client = await pool.connect();
      try {
        /** 获取当前最新版本 / Get current latest version */
        const currentResult = await client.query(
          `SELECT max(version) AS current_version FROM migration_log WHERE status = 'completed'`
        );
        const currentVersion = currentResult.rows[0]?.current_version ?? "0.0.0";

        /** 记录本次版本检查 / Record this version check */
        await client.query(
          `INSERT INTO migration_log (version, name, status, checksum)
           VALUES ($1, $2, 'completed', md5($2))
           ON CONFLICT (version) DO NOTHING`,
          ["0.9.4", "personalize_layer"]
        );

        const runData: MigrationRunData = {
          migrationsRun: currentVersion === "0.9.4" ? 0 : 1,
          currentVersion: "0.9.4",
        };

        res.json({
          success: true,
          data: runData,
          affectedRows: runData.migrationsRun,
          error: null,
          executionTime: Date.now() - start,
          timestamp: new Date().toISOString(),
        });
      } finally {
        client.release();
      }
    } catch (err) {
      logger.error("MIGRATION_RUN_FAILED", { error: (err as Error).message });
      res.status(500).json(errorResponse(`MIGRATION_RUN_ERROR / 迁移执行失败: ${(err as Error).message}`, start));
    }
  });

  return router;
}

/* ══════════════════════════════════════════════════════════════════════
 *  服务器启动 / Server Startup
 * ══════════════════════════════════════════════════════════════════════ */

/**
 * 启动 API 代理服务器
 * Start API proxy server
 */
async function startServer(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);
  const pool = createPool(config);
  const app = express();

  /** 全局安全中间件 / Global Security Middleware */
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: "RATE_LIMIT_EXCEEDED / 请求过于频繁，请稍后重试",
      timestamp: new Date().toISOString(),
    },
  });
  app.use("/api/", limiter);

  app.use(cors({ origin: config.corsOrigins, credentials: true }));
  app.use(express.json({ limit: "10mb" }));
  app.use(createRequestLogger(logger));
  app.use("/api/v1", createAuthMiddleware(config.authToken));

  /** API 路由 / API Routes */
  app.use("/api/v1", createApiRouter(pool, logger));

  /** 根路径信息 / Root path info */
  app.get("/", (_req: Request, res: Response) => {
    res.json({
      service: "YYC³ AI Family - Local API Proxy",
      version: "0.9.4",
      codename: "Personalize",
      apiBase: "/api/v1",
      endpoints: [
        "GET  /api/v1/health",
        "POST /api/v1/query",
        "GET  /api/v1/data/:table",
        "POST /api/v1/data/:table",
        "GET  /api/v1/data/:table/:id",
        "PUT  /api/v1/data/:table/:id",
        "DELETE /api/v1/data/:table/:id",
        "GET  /api/v1/tables",
        "GET  /api/v1/migrations/status",
        "POST /api/v1/migrations/run",
      ],
      status: "OPERATIONAL",
    });
  });

  /** 验证数据库连接 / Verify database connection */
  try {
    const client = await pool.connect();
    const vr = await client.query("SELECT version()");
    client.release();
    logger.info("PG_CONNECTED", {
      version: (vr.rows[0]?.version as string).split(",")[0],
      pool: config.pgPoolSize,
    });
  } catch (err) {
    logger.error("PG_CONNECTION_FAILED", { error: (err as Error).message });
    logger.warn("SERVER_STARTING_WITHOUT_PG", {
      hint: "请确保 PostgreSQL 15 已启动并运行 docs/postgresql-15-schema.sql / Ensure PostgreSQL 15 is running and execute docs/postgresql-15-schema.sql",
    });
  }

  /** 启动监听 / Start listening */
  app.listen(config.port, () => {
    logger.info("SERVER_STARTED", {
      port: config.port,
      cors: config.corsOrigins,
      auth: config.authToken ? "ENABLED" : "DISABLED",
      endpoints: 10,
    });
    logger.info("YYC3_PROXY_READY", {
      message: `API 代理服务已就绪 / API proxy service ready at http://localhost:${config.port}`,
    });
  });

  /** 优雅关闭 / Graceful shutdown */
  const shutdown = async (signal: string) => {
    logger.info("SHUTDOWN_SIGNAL_RECEIVED", { signal });
    await pool.end();
    logger.info("PG_POOL_CLOSED");
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

/** 执行启动 / Execute startup */
startServer();
