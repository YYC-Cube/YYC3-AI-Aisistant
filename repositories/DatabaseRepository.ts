/**
 * @file 数据库仓库层 - 本地 PostgreSQL 15 适配器（含自动重连）
 * @description 封装前端与本地 PostgreSQL 15 之间的数据通道，通过本地 API 代理实现 RESTful 通信
 * @module repositories/DatabaseRepository
 * @version 0.9.4
 * @since Personalize
 * @layer Repository (Controller → Service → Repository → Model)
 *
 * Database Repository Layer - Local PostgreSQL 15 Adapter (with auto-reconnect)
 * Encapsulates the data channel between frontend and local PostgreSQL 15 via local API proxy
 *
 * 自动重连流程 / Auto-Reconnect Flow:
 * ┌──────────┐  connect ok  ┌───────────┐  heartbeat fail  ┌────────────┐
 * │DISCONNECT│ ──────────→  │ CONNECTED │ ──────────────→  │ MOCK MODE  │
 * └──────────┘              └───────────┘                  └──────┬─────┘
 *       ↑                         ↑                               │
 *       │                         │  probe ok                     │ probe timer
 *       │                         └───────────────────────────────┘ (every N sec)
 */

import type {
  ConnectionHealth,
  ConnectionStatus,
  DatabaseConfig,
  DatabaseQuery,
  DatabaseResult,
  LocalAPIProxyConfig,
} from "../types/database";

/* ──────────────────── 自动重连配置 / Auto-Reconnect Config ──────────────────── */

/**
 * 重连策略常量
 * Reconnect strategy constants
 */
const RECONNECT_CONFIG = {
  /** 初始重探间隔 (ms) / Initial probe interval */
  INITIAL_PROBE_INTERVAL: 5000,
  /** 最大重探间隔 (ms) / Max probe interval */
  MAX_PROBE_INTERVAL: 60000,
  /** 退避乘数 / Backoff multiplier */
  BACKOFF_MULTIPLIER: 1.5,
  /** 探针超时 (ms) / Probe timeout */
  PROBE_TIMEOUT: 3000,
  /** 连续成功探针次数确认恢复 / Consecutive successful probes to confirm recovery */
  RECOVERY_THRESHOLD: 2,
} as const;

/* ──────────────────── 开发模拟数据 / Development Mock Data ──────────────────── */

/**
 * 模拟健康检查响应（当代理服务未运行时使用）
 * Mock health check response (used when proxy service is not running)
 */
const MOCK_HEALTH: ConnectionHealth = {
  status: "connected",
  latency: 8,
  serverVersion: "PostgreSQL 15.8 (Mock Mode / 模拟模式)",
  activeConnections: 3,
  maxConnections: 100,
  databaseSize: 28672000,
  lastCheckedAt: new Date().toISOString(),
  uptime: 86400,
};

/**
 * 模拟表数据（展示用）
 * Mock table data (for demonstration)
 */
const MOCK_TABLE_DATA: Record<string, Array<Record<string, string | number | boolean | null>>> = {
  agents: [
    { id: 1, agent_id: "ARCHITECT_PRIME", name: "ARCHITECT_PRIME", version: "v4.2.0", role: "System Architecture & Patterns", status: "active" },
    { id: 2, agent_id: "CODE_WEAVER", name: "CODE_WEAVER", version: "v3.1.5", role: "Frontend Implementation Specialist", status: "active" },
    { id: 3, agent_id: "DATA_NEXUS", name: "DATA_NEXUS", version: "v2.8.0", role: "Database Optimization & Schema", status: "standby" },
    { id: 4, agent_id: "SECURE_SENTINEL", name: "SECURE_SENTINEL", version: "v5.0.1", role: "Vulnerability Scanning & Auth", status: "active" },
  ],
  channels: [
    { id: "main", name: "Main Console", preset: "General", is_encrypted: false },
  ],
  system_configs: [
    { key: "ui_settings", value: "{}", description: "UI/UX 偏好设置" },
    { key: "system_version", value: '"0.9.4"', description: "当前系统版本" },
    { key: "codename", value: '"Personalize"', description: "版本代号" },
  ],
};

/* ──────────────────── 配置存储键 / Config Storage Keys ──────────────────── */

const STORAGE_KEYS = {
  DB_CONFIG: "yyc3_db_config",
  PROXY_CONFIG: "yyc3_db_proxy_config",
  CONNECTION_HISTORY: "yyc3_db_conn_history",
} as const;

/* ──────────────────── 连接历史记录 / Connection History ──────────────────── */

/**
 * 连接历史条目
 * Connection history entry
 */
interface ConnectionHistoryEntry {
  /** 时间戳 / Timestamp */
  timestamp: string;
  /** 连接状态 / Connection status */
  status: ConnectionStatus;
  /** 延迟 (ms) / Latency (ms) */
  latency: number;
  /** 错误信息 / Error message */
  error: string | null;
}

/* ──────────────────── 状态变更回调 / Status Change Callback ──────────────────── */

/**
 * 连接状态变更事件
 * Connection status change event
 */
interface ConnectionStatusEvent {
  /** 前一个状态 / Previous status */
  previousStatus: ConnectionStatus;
  /** 当前状态 / Current status */
  currentStatus: ConnectionStatus;
  /** 是否为模拟模式 / Is mock mode */
  isMockMode: boolean;
  /** 重连尝试次数 / Reconnect attempt count */
  reconnectAttempts: number;
  /** 时间戳 / Timestamp */
  timestamp: string;
}

/**
 * 状态变更监听器类型
 * Status change listener type
 */
type StatusChangeListener = (event: ConnectionStatusEvent) => void;

/* ──────────────────── 仓库实现 / Repository Implementation ──────────────────── */

/**
 * 数据库仓库（含自动重连）
 * Database Repository (with auto-reconnect)
 *
 * 职责：
 * - 管理数据库连接配置的持久化
 * - 通过本地 API 代理执行数据库查询
 * - 管理连接健康状态监控
 * - 代理断线时自动降级到 Mock 模式
 * - 定时探针自动恢复真实连接
 * - 提供连接历史记录
 *
 * Responsibilities:
 * - Manages database connection config persistence
 * - Executes database queries via local API proxy
 * - Manages connection health monitoring
 * - Auto-degrades to Mock mode when proxy is down
 * - Periodic probing to auto-restore real connection
 * - Provides connection history records
 */
class DatabaseRepositoryImpl {
  /** 代理配置 / Proxy configuration */
  private proxyConfig: LocalAPIProxyConfig;

  /** 当前连接状态 / Current connection status */
  private currentStatus: ConnectionStatus = "disconnected";

  /** 心跳定时器 / Heartbeat timer */
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  /** 模拟模式标志 / Mock mode flag */
  private mockMode: boolean = false;

  /** 重连探针定时器 / Reconnect probe timer */
  private probeTimer: ReturnType<typeof setTimeout> | null = null;

  /** 当前探针间隔 (ms) / Current probe interval */
  private currentProbeInterval: number = RECONNECT_CONFIG.INITIAL_PROBE_INTERVAL;

  /** 重连尝试计数 / Reconnect attempt counter */
  private reconnectAttempts: number = 0;

  /** 连续成功探针计数 / Consecutive successful probe count */
  private consecutiveSuccessProbes: number = 0;

  /** 状态变更监听器列表 / Status change listeners */
  private statusListeners: StatusChangeListener[] = [];

  /** 连接曾经建立过 / Connection was ever established */
  private wasEverConnected: boolean = false;

  constructor() {
    this.proxyConfig = this.loadProxyConfig();
  }

  /* ──────────── 状态监听 / Status Listeners ──────────── */

  /**
   * 注册状态变更监听器
   * Register status change listener
   *
   * @param {StatusChangeListener} listener - 监听器 / Listener
   * @returns {() => void} 取消注册函数 / Unregister function
   */
  onStatusChange(listener: StatusChangeListener): () => void {
    this.statusListeners.push(listener);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  /**
   * 触发状态变更事件
   * Emit status change event
   *
   * @param {ConnectionStatus} previousStatus - 前一个状态 / Previous status
   * @param {ConnectionStatus} newStatus - 新状态 / New status
   */
  private emitStatusChange(previousStatus: ConnectionStatus, newStatus: ConnectionStatus): void {
    if (previousStatus === newStatus) return;

    const event: ConnectionStatusEvent = {
      previousStatus,
      currentStatus: newStatus,
      isMockMode: this.mockMode,
      reconnectAttempts: this.reconnectAttempts,
      timestamp: new Date().toISOString(),
    };

    for (const listener of this.statusListeners) {
      try {
        listener(event);
      } catch {
        // 静默处理监听器异常 / Silently handle listener errors
      }
    }
  }

  /**
   * 更新连接状态并触发事件
   * Update connection status and emit event
   *
   * @param {ConnectionStatus} newStatus - 新状态 / New status
   */
  private setStatus(newStatus: ConnectionStatus): void {
    const prev = this.currentStatus;
    this.currentStatus = newStatus;
    this.emitStatusChange(prev, newStatus);
  }

  /* ──────────── 模拟模式 / Mock Mode ──────────── */

  /**
  /**
   * 获取当前是否为模拟模式
   * Get whether currently in mock mode
   *
   * @returns {boolean} 模拟模式状态 / Mock mode status
   */
  isMockMode(): boolean {
    return this.mockMode;
  }

  /**
   * 进入模拟模式并启动重连探针
   * Enter mock mode and start reconnect probing
   */
  private enterMockMode(): void {
    if (this.mockMode) return;

    this.mockMode = true;
    this.setStatus("error");
    this.recordConnectionHistory("error", 0, "PROXY_DISCONNECTED / 代理断线，进入模拟模式");

    // 仅在曾经成功连接过时才启动自动重连 / Only auto-reconnect if was ever connected
    if (this.wasEverConnected) {
      this.startReconnectProbe();
    }
  }

  /**
   * 退出模拟模式
   * Exit mock mode
   */
  private exitMockMode(): void {
    this.mockMode = false;
    this.consecutiveSuccessProbes = 0;
    this.reconnectAttempts = 0;
    this.currentProbeInterval = RECONNECT_CONFIG.INITIAL_PROBE_INTERVAL;
    this.stopReconnectProbe();
    this.setStatus("connected");
    this.recordConnectionHistory("connected", 0, null);
  }

  /**
   * 重置模拟模式检测（用于重新连接）
   * Reset mock mode detection (for reconnection)
   */
  resetMockDetection(): void {
    this.mockMode = false;
    this.consecutiveSuccessProbes = 0;
    this.reconnectAttempts = 0;
    this.currentProbeInterval = RECONNECT_CONFIG.INITIAL_PROBE_INTERVAL;
  }

  /* ──────────── 重连探针 / Reconnect Probe ──────────── */

  /**
   * 启动重连探针定时器
   * Start reconnect probe timer
   *
   * 使用指数退避策略：5s → 7.5s → 11.25s → ... → 60s (封顶)
   * Uses exponential backoff: 5s → 7.5s → 11.25s → ... → 60s (capped)
   */
  private startReconnectProbe(): void {
    this.stopReconnectProbe();

    const probe = async () => {
      this.reconnectAttempts++;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          RECONNECT_CONFIG.PROBE_TIMEOUT
        );

        const response = await fetch(this.buildUrl("/health"), {
          method: "GET",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          this.consecutiveSuccessProbes++;

          if (this.consecutiveSuccessProbes >= RECONNECT_CONFIG.RECOVERY_THRESHOLD) {
            // 连续成功次数达标，确认恢复 / Threshold reached, confirm recovery
            this.exitMockMode();
            this.startHeartbeat();
            return; // 不再继续探针 / Stop probing
          }
        } else {
          this.consecutiveSuccessProbes = 0;
        }
      } catch {
        this.consecutiveSuccessProbes = 0;
      }

      // 指数退避计算下次间隔 / Calculate next interval with exponential backoff
      this.currentProbeInterval = Math.min(
        this.currentProbeInterval * RECONNECT_CONFIG.BACKOFF_MULTIPLIER,
        RECONNECT_CONFIG.MAX_PROBE_INTERVAL
      );

      // 调度下一次探针 / Schedule next probe
      this.probeTimer = setTimeout(probe, this.currentProbeInterval);
    };

    // 首次探针 / First probe
    this.probeTimer = setTimeout(probe, this.currentProbeInterval);
  }

  /**
   * 停止重连探针
   * Stop reconnect probe
   */
  private stopReconnectProbe(): void {
    if (this.probeTimer) {
      clearTimeout(this.probeTimer);
      this.probeTimer = null;
    }
  }

  /**
   * 获取重连统计
   * Get reconnect statistics
   *
   * @returns {{ attempts: number; probeInterval: number; consecutiveSuccess: number }} 重连统计
   */
  getReconnectStats(): { attempts: number; probeInterval: number; consecutiveSuccess: number } {
    return {
      attempts: this.reconnectAttempts,
      probeInterval: Math.round(this.currentProbeInterval / 1000),
      consecutiveSuccess: this.consecutiveSuccessProbes,
    };
  }

  /* ──────────── 配置管理 / Config Management ──────────── */

  /**
   * 加载代理配置
   * Load proxy configuration
   *
   * @returns {LocalAPIProxyConfig} 代理配置 / Proxy configuration
   */
  private loadProxyConfig(): LocalAPIProxyConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROXY_CONFIG);
      if (stored) return JSON.parse(stored);
    } catch {
      // 使用默认配置 / Use default config
    }
    return {
      baseUrl: "http://localhost:3721",
      apiVersion: "v1",
      authToken: "",
      timeout: 10000,
      enableRetry: true,
      maxRetries: 3,
      heartbeatInterval: 30000,
    };
  }

  /**
   * 保存数据库连接配置
   * Save database connection configuration
   *
   * @param {DatabaseConfig} config - 数据库配置 / Database configuration
   */
  saveDatabaseConfig(config: DatabaseConfig): void {
    const updated: DatabaseConfig = {
      ...config,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.DB_CONFIG, JSON.stringify(updated));
  }

  /**
   * 读取数据库连接配置
   * Load database connection configuration
   *
   * @returns {DatabaseConfig | null} 数据库配置或 null / Database config or null
   */
  loadDatabaseConfig(): DatabaseConfig | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.DB_CONFIG);
      if (stored) return JSON.parse(stored);
    } catch {
      // 返回 null / Return null
    }
    return null;
  }

  /**
   * 保存代理配置
   * Save proxy configuration
   *
   * @param {LocalAPIProxyConfig} config - 代理配置 / Proxy configuration
   */
  saveProxyConfig(config: LocalAPIProxyConfig): void {
    this.proxyConfig = config;
    localStorage.setItem(STORAGE_KEYS.PROXY_CONFIG, JSON.stringify(config));
  }

  /**
   * 获取代理配置
   * Get proxy configuration
   *
   * @returns {LocalAPIProxyConfig} 代理配置 / Proxy configuration
   */
  getProxyConfig(): LocalAPIProxyConfig {
    return { ...this.proxyConfig };
  }

  /* ──────────── API 请求核心 / API Request Core ──────────── */

  /**
   * 构建 API URL
   * Build API URL
   *
   * @param {string} path - API 路径 / API path
   * @returns {string} 完整 URL / Full URL
   */
  private buildUrl(path: string): string {
    return `${this.proxyConfig.baseUrl}/api/${this.proxyConfig.apiVersion}${path}`;
  }

  /**
   * 发送 API 请求（带重试 + 断线降级）
   * Send API request (with retry + disconnect fallback)
   *
   * @template T - 响应数据类型 / Response data type
   * @param {string} path - API 路径 / API path
   * @param {RequestInit} [options] - Fetch 选项 / Fetch options
   * @returns {Promise<DatabaseResult<T>>} 数据库操作结果 / Database operation result
   */
  private async apiRequest<T>(path: string, options?: RequestInit): Promise<DatabaseResult<T>> {
    // 模拟模式下返回 Mock 数据 / Return mock data in mock mode
    if (this.mockMode && path !== "/health") {
      return this.mockResponse<T>(path);
    }

    const startTime = Date.now();
    let lastError: string | null = null;
    const maxAttempts = this.proxyConfig.enableRetry ? this.proxyConfig.maxRetries : 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.proxyConfig.timeout);

        const response = await fetch(this.buildUrl(path), {
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...(this.proxyConfig.authToken
              ? { Authorization: `Bearer ${this.proxyConfig.authToken}` }
              : {}),
            ...options?.headers,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`HTTP ${response.status}: ${errBody.slice(0, 200)}`);
        }

        const data = await response.json();

        // 成功请求：如果之前断线过，确认恢复 / Successful: confirm recovery if was disconnected
        if (this.currentStatus === "error") {
          this.exitMockMode();
        }

        return {
          success: true,
          data: data as T,
          affectedRows: data.affectedRows ?? 0,
          error: null,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        };
      } catch (err) {
        lastError = err instanceof Error ? err.message : "UNKNOWN_ERROR / 未知错误";

        if (lastError.includes("abort")) {
          lastError = "REQUEST_TIMEOUT / 请求超时";
        }

        // 等待后重试 / Wait before retry
        if (attempt < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    // 全部重试失败：进入模拟模式 / All retries failed: enter mock mode
    if (this.wasEverConnected && !this.mockMode) {
      this.enterMockMode();
    }

    return {
      success: false,
      data: null,
      affectedRows: 0,
      error: lastError,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 生成 Mock 响应
   * Generate mock response
   *
   * @template T - 响应类型 / Response type
   * @param {string} path - API 路径 / API path
   * @returns {DatabaseResult<T>} Mock 结果 / Mock result
   */
  private mockResponse<T>(path: string): DatabaseResult<T> {
    // 从 path 提取表名 / Extract table name from path
    const tableMatch = path.match(/\/data\/(\w+)/);
    const table = tableMatch?.[1] ?? "";

    const mockData = MOCK_TABLE_DATA[table] ?? [];

    return {
      success: true,
      data: mockData as unknown as T,
      affectedRows: mockData.length,
      error: null,
      executionTime: 1,
      timestamp: new Date().toISOString(),
    };
  }

  /* ──────────── 数据库操作 / Database Operations ──────────── */

  /**
   * 执行数据库查询
   * Execute database query
   *
   * @template T - 返回数据类型 / Return data type
   * @param {DatabaseQuery} query - 查询参数 / Query parameters
   * @returns {Promise<DatabaseResult<T[]>>} 查询结果 / Query result
   */
  async executeQuery<T>(query: DatabaseQuery): Promise<DatabaseResult<T[]>> {
    return this.apiRequest<T[]>("/query", {
      method: "POST",
      body: JSON.stringify(query),
    });
  }

  /**
   * 插入数据
   * Insert data
   *
   * @param {string} table - 表名 / Table name
   * @param {Record<string, string | number | boolean | null>} data - 插入数据 / Insert data
   * @returns {Promise<DatabaseResult<Record<string, string | number | boolean | null>>>} 插入结果 / Insert result
   */
  async insert(
    table: string,
    data: Record<string, string | number | boolean | null>
  ): Promise<DatabaseResult<Record<string, string | number | boolean | null>>> {
    return this.apiRequest(`/data/${table}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * 更新数据
   * Update data
   *
   * @param {string} table - 表名 / Table name
   * @param {string} id - 记录 ID / Record ID
   * @param {Record<string, string | number | boolean | null>} data - 更新数据 / Update data
   * @returns {Promise<DatabaseResult<Record<string, string | number | boolean | null>>>} 更新结果 / Update result
   */
  async update(
    table: string,
    id: string,
    data: Record<string, string | number | boolean | null>
  ): Promise<DatabaseResult<Record<string, string | number | boolean | null>>> {
    return this.apiRequest(`/data/${table}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  /**
   * 删除数据
   * Delete data
   *
   * @param {string} table - 表名 / Table name
   * @param {string} id - 记录 ID / Record ID
   * @returns {Promise<DatabaseResult<null>>} 删除结果 / Delete result
   */
  async deleteRecord(table: string, id: string): Promise<DatabaseResult<null>> {
    return this.apiRequest(`/data/${table}/${id}`, {
      method: "DELETE",
    });
  }

  /* ──────────── 健康检测 / Health Check ──────────── */

  /**
   * 检测数据库连接健康状态（含断线降级）
   * Check database connection health (with disconnect fallback)
   *
   * @returns {Promise<DatabaseResult<ConnectionHealth>>} 健康状态 / Health status
   */
  async checkHealth(): Promise<DatabaseResult<ConnectionHealth>> {
    this.setStatus("connecting");

    // 模拟模式下返回 Mock 健康信息 / Return mock health in mock mode
    if (this.mockMode) {
      const mockResult: DatabaseResult<ConnectionHealth> = {
        success: true,
        data: { ...MOCK_HEALTH, lastCheckedAt: new Date().toISOString() },
        affectedRows: 0,
        error: null,
        executionTime: 1,
        timestamp: new Date().toISOString(),
      };
      this.setStatus("error"); // 仍然标记为 error / Still mark as error
      return mockResult;
    }

    const result = await this.apiRequest<ConnectionHealth>("/health", {
      method: "GET",
    });

    if (result.success) {
      this.wasEverConnected = true;
      this.setStatus("connected");
      this.recordConnectionHistory("connected", result.executionTime, null);
    } else {
      // 心跳失败：进入模拟模式 / Heartbeat failed: enter mock mode
      this.enterMockMode();
      this.recordConnectionHistory("error", result.executionTime, result.error);
    }

    return result;
  }

  /**
   * 获取当前连接状态
   * Get current connection status
   *
   * @returns {ConnectionStatus} 连接状态 / Connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.currentStatus;
  }

  /**
   * 启动心跳检测（含断线自动降级）
   * Start heartbeat monitoring (with disconnect auto-fallback)
   */
  startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(async () => {
      if (this.mockMode) {
        // 模拟模式下不执行心跳，由探针接管 / No heartbeat in mock mode, probe takes over
        return;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), RECONNECT_CONFIG.PROBE_TIMEOUT);

        const response = await fetch(this.buildUrl("/health"), {
          method: "GET",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          this.enterMockMode();
        }
      } catch {
        this.enterMockMode();
      }
    }, this.proxyConfig.heartbeatInterval);
  }

  /**
   * 停止心跳检测
   * Stop heartbeat monitoring
   */
  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 完全停止所有定时器
   * Stop all timers completely
   */
  stopAll(): void {
    this.stopHeartbeat();
    this.stopReconnectProbe();
  }

  /* ──────────── 连接历史 / Connection History ──────────── */

  /**
   * 记录连接历史
   * Record connection history
   *
   * @param {ConnectionStatus} status - 连接状态 / Connection status
   * @param {number} latency - 延迟 / Latency
   * @param {string | null} error - 错误信息 / Error message
   */
  private recordConnectionHistory(
    status: ConnectionStatus,
    latency: number,
    error: string | null
  ): void {
    try {
      const history = this.getConnectionHistory();
      const entry: ConnectionHistoryEntry = {
        timestamp: new Date().toISOString(),
        status,
        latency,
        error,
      };

      // 保留最近 50 条记录 / Keep last 50 records
      const updated = [entry, ...history].slice(0, 50);
      localStorage.setItem(STORAGE_KEYS.CONNECTION_HISTORY, JSON.stringify(updated));
    } catch {
      // 静默处理 / Silently handle
    }
  }

  /**
   * 获取连接历史记录
   * Get connection history records
   *
   * @returns {ConnectionHistoryEntry[]} 历史记录列表 / History records
   */
  getConnectionHistory(): ConnectionHistoryEntry[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CONNECTION_HISTORY);
      if (stored) return JSON.parse(stored);
    } catch {
      // 返回空列表 / Return empty array
    }
    return [];
  }

  /* ──────────── 迁移操作 / Migration Operations ──────────── */

  /**
   * 执行数据库迁移
   * Execute database migration
   *
   * @returns {Promise<DatabaseResult<{ migrationsRun: number; currentVersion: string }>>} 迁移结果
   */
  async runMigrations(): Promise<
    DatabaseResult<{ migrationsRun: number; currentVersion: string }>
  > {
    this.setStatus("migrating");
    const result = await this.apiRequest<{ migrationsRun: number; currentVersion: string }>(
      "/migrations/run",
      { method: "POST" }
    );

    this.setStatus(result.success ? "connected" : "error");
    return result;
  }

  /**
   * 获取迁移状态
   * Get migration status
   *
   * @returns {Promise<DatabaseResult<{ pending: number; completed: number; currentVersion: string }>>} 迁移状态
   */
  async getMigrationStatus(): Promise<
    DatabaseResult<{ pending: number; completed: number; currentVersion: string }>
  > {
    return this.apiRequest("/migrations/status", { method: "GET" });
  }
}

/**
 * 数据库仓库单例实例
 * Database Repository singleton instance
 */
export const databaseRepository = new DatabaseRepositoryImpl();
