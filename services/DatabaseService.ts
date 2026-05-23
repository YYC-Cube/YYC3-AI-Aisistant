/**
 * @file 数据库业务服务层 - PostgreSQL 15 本地通道管理
 * @description 封装数据库操作的业务逻辑，协调 DatabaseRepository 和前端状态管理
 * @module services/DatabaseService
 * @version 0.9.4
 * @since Personalize
 * @layer Service (Controller → Service → Repository → Model)
 *
 * Database Business Service Layer - PostgreSQL 15 Local Channel Management
 * Encapsulates database operation business logic, coordinates DatabaseRepository and frontend state
 *
 * 本地 PostgreSQL 15 通道架构 / Local PostgreSQL 15 Channel Architecture:
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                     YYC3 AI Assistant Frontend                        │
 * │  ┌──────────┐  ┌──────────────┐  ┌────────────────┐               │
 * │  │ Hooks    │→ │ Service 层   │→ │ Repository 层  │               │
 * │  │ (React)  │  │ (业务逻辑)   │  │ (数据访问)     │               │
 * │  └──────────┘  └──────────────┘  └───────┬────────┘               │
 * └──────────────────────────────────────────┼────────────────────────┘
 *                                            │ HTTP REST API
 *                                            ▼
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │              YYC3 Local API Proxy (localhost:3721)                  │
 * │  ┌────────────┐  ┌──────────────┐  ┌────────────────┐             │
 * │  │ Express/   │→ │ 查询构建器   │→ │ pg Pool        │             │
 * │  │ Fastify    │  │ (SQL Builder)│  │ (连接池)       │             │
 * │  └────────────┘  └──────────────┘  └───────┬────────┘             │
 * └──────────────────────────────────────────────┼────────────────────┘
 *                                                │ TCP/SSL
 *                                                ▼
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │              PostgreSQL 15 (localhost:5432)                         │
 * │  ┌────────────────────────────────────────────────────────┐        │
 * │  │  Database: yyc3_family                                 │        │
 * │  │  ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐ │        │
 * │  │  │ chats   │ │ agents   │ │ workflows │ │ configs  │ │        │
 * │  │  └─────────┘ └──────────┘ └───────────┘ └──────────┘ │        │
 * │  └────────────────────────────────────────────────────────┘        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

import { databaseRepository } from "../repositories/DatabaseRepository";
import type {
  DatabaseConfig,
  LocalAPIProxyConfig,
  DatabaseResult,
  ConnectionHealth,
  ConnectionStatus,
} from "../types/database";

/* ──────────────────── 数据同步策略 / Data Sync Strategy ──────────────────── */

/**
 * 同步策略配置
 * Sync Strategy Configuration
 */
export interface SyncStrategy {
  /** 同步方向 / Sync direction */
  direction: "local-to-pg" | "pg-to-local" | "bidirectional";
  /** 冲突解决策略 / Conflict resolution strategy */
  conflictResolution: "local-wins" | "remote-wins" | "latest-wins";
  /** 同步间隔 (毫秒) / Sync interval (ms) */
  interval: number;
  /** 是否启用自动同步 / Auto sync enabled */
  autoSync: boolean;
  /** 需要同步的表列表 / Tables to sync */
  tables: string[];
}

/**
 * 默认同步策略
 * Default sync strategy
 */
const DEFAULT_SYNC_STRATEGY: SyncStrategy = {
  direction: "bidirectional",
  conflictResolution: "latest-wins",
  interval: 60000,
  autoSync: false,
  tables: ["chats", "configs", "agents"],
};

/* ──────────────────── 数据库统计 / Database Statistics ──────────────────── */

/**
 * 数据库使用统计
 * Database usage statistics
 */
export interface DatabaseStats {
  /** 总表数 / Total table count */
  tableCount: number;
  /** 总记录数 / Total record count */
  totalRecords: number;
  /** 数据库大小 (格式化) / Database size (formatted) */
  databaseSize: string;
  /** 活跃连接数 / Active connections */
  activeConnections: number;
  /** 最大连接数 / Max connections */
  maxConnections: number;
  /** PostgreSQL 版本 / PostgreSQL version */
  version: string;
  /** 正常运行时间 (格式化) / Uptime (formatted) */
  uptime: string;
}

/* ──────────────────── 服务类 / Service Class ──────────────────── */

/**
 * 数据库业务服务
 * Database Business Service
 *
 * 职责：
 * - 管理数据库连接生命周期
 * - 执行 localStorage ↔ PostgreSQL 数据同步
 * - 提供数据库健康监控
 * - 管理迁移和 Schema 版本
 *
 * Responsibilities:
 * - Manages database connection lifecycle
 * - Executes localStorage ↔ PostgreSQL data sync
 * - Provides database health monitoring
 * - Manages migration and schema versioning
 */
class DatabaseServiceImpl {
  /** 同步策略 / Sync strategy */
  private syncStrategy: SyncStrategy = DEFAULT_SYNC_STRATEGY;

  /** 同步定时器 / Sync timer */
  private syncTimer: ReturnType<typeof setInterval> | null = null;

  /** 连接健康缓存 / Connection health cache */
  private healthCache: ConnectionHealth | null = null;

  /* ──────────── 连接管理 / Connection Management ──────────── */

  /**
   * 注册状态变更监听器（透传 Repository 层事件）
   * Register status change listener (proxying Repository layer events)
   *
   * @param {(event: { previousStatus: ConnectionStatus; currentStatus: ConnectionStatus; isMockMode: boolean; reconnectAttempts: number; timestamp: string }) => void} listener - 监听器
   * @returns {() => void} 取消注册函数 / Unregister function
   */
  onStatusChange(listener: (event: {
    previousStatus: ConnectionStatus;
    currentStatus: ConnectionStatus;
    isMockMode: boolean;
    reconnectAttempts: number;
    timestamp: string;
  }) => void): () => void {
    return databaseRepository.onStatusChange(listener);
  }

  /**
   * 获取重连统计信息
   * Get reconnect statistics
   *
   * @returns {{ attempts: number; probeInterval: number; consecutiveSuccess: number }} 重连统计
   */
  getReconnectStats(): { attempts: number; probeInterval: number; consecutiveSuccess: number } {
    return databaseRepository.getReconnectStats();
  }

  /**
   * 获取是否为模拟模式
   * Get whether in mock mode
   *
   * @returns {boolean} 是否模拟模式 / Is mock mode
   */
  isMockMode(): boolean {
    return databaseRepository.isMockMode();
  }

  /**
   * 初始化数据库连接
   * Initialize database connection
   *
   * 执行顺序 / Execution order:
   * 1. 加载配置 / Load configuration
   * 2. 健康检查 / Health check
   * 3. 执行挂起的迁移 / Run pending migrations
   * 4. 启动心跳监控 / Start heartbeat monitoring
   *
   * @param {DatabaseConfig} [config] - 可选的配置覆盖 / Optional config override
   * @returns {Promise<DatabaseResult<ConnectionHealth>>} 连接结果 / Connection result
   */
  async initializeConnection(
    config?: DatabaseConfig
  ): Promise<DatabaseResult<ConnectionHealth>> {
    // 保存配置 / Save config
    if (config) {
      databaseRepository.saveDatabaseConfig(config);
    }

    // 健康检查 / Health check
    const healthResult = await databaseRepository.checkHealth();

    if (healthResult.success && healthResult.data) {
      this.healthCache = healthResult.data;

      // 自动迁移（如果启用） / Auto migrate (if enabled)
      const savedConfig = databaseRepository.loadDatabaseConfig();
      if (savedConfig?.autoMigrate) {
        await databaseRepository.runMigrations();
      }

      // 启动心跳 / Start heartbeat
      databaseRepository.startHeartbeat();

      // 启动自动同步（如果启用） / Start auto sync (if enabled)
      if (this.syncStrategy.autoSync) {
        this.startAutoSync();
      }
    }

    return healthResult;
  }

  /**
   * 断开数据库连接
   * Disconnect database connection
   */
  disconnect(): void {
    databaseRepository.stopHeartbeat();
    this.stopAutoSync();
    this.healthCache = null;
  }

  /**
   * 获取当前连接状态
   * Get current connection status
   *
   * @returns {ConnectionStatus} 连接状态 / Connection status
   */
  getStatus(): ConnectionStatus {
    return databaseRepository.getConnectionStatus();
  }

  /**
   * 获取缓存的健康信息
   * Get cached health information
   *
   * @returns {ConnectionHealth | null} 健康信息或 null / Health info or null
   */
  getCachedHealth(): ConnectionHealth | null {
    return this.healthCache ? { ...this.healthCache } : null;
  }

  /* ──────────── 配置管理 / Config Management ──────────── */

  /**
   * 获取数据库配置
   * Get database configuration
   *
   * @returns {DatabaseConfig | null} 数据库配置 / Database config
   */
  getConfig(): DatabaseConfig | null {
    return databaseRepository.loadDatabaseConfig();
  }

  /**
   * 保存数据库配置
   * Save database configuration
   *
   * @param {DatabaseConfig} config - 数据库配置 / Database configuration
   */
  saveConfig(config: DatabaseConfig): void {
    databaseRepository.saveDatabaseConfig(config);
  }

  /**
   * 获取代理配置
   * Get proxy configuration
   *
   * @returns {LocalAPIProxyConfig} 代理配置 / Proxy config
   */
  getProxyConfig(): LocalAPIProxyConfig {
    return databaseRepository.getProxyConfig();
  }

  /**
   * 保存代理配置
   * Save proxy configuration
   *
   * @param {LocalAPIProxyConfig} config - 代理配置 / Proxy configuration
   */
  saveProxyConfig(config: LocalAPIProxyConfig): void {
    databaseRepository.saveProxyConfig(config);
  }

  /* ──────────── 数据同步 / Data Sync ──────────── */

  /**
   * 设置同步策略
   * Set sync strategy
   *
   * @param {Partial<SyncStrategy>} strategy - 部分同步策略 / Partial sync strategy
   */
  setSyncStrategy(strategy: Partial<SyncStrategy>): void {
    this.syncStrategy = { ...this.syncStrategy, ...strategy };

    // 重启自动同步 / Restart auto sync
    if (this.syncStrategy.autoSync) {
      this.startAutoSync();
    } else {
      this.stopAutoSync();
    }
  }

  /**
   * 获取同步策略
   * Get sync strategy
   *
   * @returns {SyncStrategy} 同步策略 / Sync strategy
   */
  getSyncStrategy(): SyncStrategy {
    return { ...this.syncStrategy };
  }

  /**
   * 手动执行一次同步
   * Execute manual sync once
   *
   * 从 localStorage 读取聊天数据并推送到 PostgreSQL
   * Reads chat data from localStorage and pushes to PostgreSQL
   *
   * @returns {Promise<DatabaseResult<{ syncedTables: string[]; totalRecords: number }>>} 同步结果
   */
  async syncNow(): Promise<
    DatabaseResult<{ syncedTables: string[]; totalRecords: number }>
  > {
    const startTime = Date.now();
    const syncedTables: string[] = [];
    let totalRecords = 0;

    try {
      for (const table of this.syncStrategy.tables) {
        const storageKey = this.getStorageKeyForTable(table);
        const localData = localStorage.getItem(storageKey);

        if (localData) {
          const parsed = JSON.parse(localData);
          const records = Array.isArray(parsed) ? parsed : [parsed];

          // 通过 API 代理批量插入/更新 / Batch upsert via API proxy
          const result = await databaseRepository.executeQuery({
            table,
            action: "UPSERT",
            data: records[0] ?? null,
          });

          if (result.success) {
            syncedTables.push(table);
            totalRecords += records.length;
          }
        }
      }

      return {
        success: true,
        data: { syncedTables, totalRecords },
        affectedRows: totalRecords,
        error: null,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        success: false,
        data: null,
        affectedRows: 0,
        error: err instanceof Error ? err.message : "SYNC_FAILED / 同步失败",
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 启动自动同步
   * Start auto sync
   */
  private startAutoSync(): void {
    this.stopAutoSync();
    this.syncTimer = setInterval(() => {
      this.syncNow();
    }, this.syncStrategy.interval);
  }

  /**
   * 停止自动同步
   * Stop auto sync
   */
  private stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * 获取表对应的 localStorage 键
   * Get localStorage key for table
   *
   * @param {string} table - 表名 / Table name
   * @returns {string} localStorage 键 / localStorage key
   */
  private getStorageKeyForTable(table: string): string {
    const mapping: Record<string, string> = {
      chats: "yyc3_chat_history",
      configs: "yyc3_ai_config",
      agents: "yyc3_agents",
      channels: "yyc3_channels_meta",
      ui_settings: "yyc3_ui_settings",
    };
    return mapping[table] ?? `yyc3_${table}`;
  }

  /* ──────────── 统计信息 / Statistics ──────────── */

  /**
   * 获取数据库统计信息（模拟）
   * Get database statistics (simulated)
   *
   * 生产环境通过本地 API 代理查询实际数据库获取
   * In production, fetched via local API proxy from actual database
   *
   * @returns {DatabaseStats} 数据库统计 / Database statistics
   */
  getStats(): DatabaseStats {
    const health = this.healthCache;

    return {
      tableCount: 6,
      totalRecords: 0,
      databaseSize: health ? this.formatBytes(health.databaseSize) : "N/A",
      activeConnections: health?.activeConnections ?? 0,
      maxConnections: health?.maxConnections ?? 0,
      version: health?.serverVersion ?? "PostgreSQL 15.x",
      uptime: health ? this.formatUptime(health.uptime) : "N/A",
    };
  }

  /* ──────────── 工具方法 / Utility Methods ─────────── */

  /**
   * 格式化字节数
   * Format bytes to human readable
   *
   * @param {number} bytes - 字节数 / Byte count
   * @returns {string} 格式化字符串 / Formatted string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * 格式化运行时间
   * Format uptime to human readable
   *
   * @param {number} seconds - 秒数 / Seconds
   * @returns {string} 格式化字符串 / Formatted string
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  /**
   * 生成连接字符串（用于显示，密码掩码处理）
   * Generate connection string (for display, password masked)
   *
   * @param {DatabaseConfig} config - 数据库配置 / Database config
   * @returns {string} 连接字符串 / Connection string
   */
  formatConnectionString(config: DatabaseConfig): string {
    const maskedPassword = config.password ? "****" : "";
    return `postgresql://${config.username}:${maskedPassword}@${config.host}:${config.port}/${config.database}?schema=${config.schema}&sslmode=${config.sslMode}`;
  }
}

/**
 * 数据库业务服务单例实例
 * Database Business Service singleton instance
 */
export const databaseService = new DatabaseServiceImpl();