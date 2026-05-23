/**
 * @file 数据库配置管理 Hook
 * @description 提供 React 组件层面的数据库配置状态管理，连接 DatabaseService 层
 * @module hooks/useDatabaseConfig
 * @version 0.9.4
 * @since Personalize
 *
 * Database Configuration Management Hook
 * Provides React component-level database config state management, connecting to DatabaseService layer
 */

import { useState, useEffect, useCallback } from "react";
import { databaseService, type SyncStrategy, type DatabaseStats } from "../services/DatabaseService";
import type {
  DatabaseConfig,
  LocalAPIProxyConfig,
  ConnectionStatus,
  ConnectionHealth,
} from "../types/database";

/* ──────────────────── Hook 返回类型 / Hook Return Type ──────────────────── */

/**
 * useDatabaseConfig Hook 返回值
 * useDatabaseConfig Hook return value
 */
export interface UseDatabaseConfigReturn {
  /** 数据库配置 / Database config */
  config: DatabaseConfig;
  /** 代理配置 / Proxy config */
  proxyConfig: LocalAPIProxyConfig;
  /** 连接状态 / Connection status */
  connectionStatus: ConnectionStatus;
  /** 健康信息 / Health info */
  health: ConnectionHealth | null;
  /** 数据库统计 / Database stats */
  stats: DatabaseStats;
  /** 同步策略 / Sync strategy */
  syncStrategy: SyncStrategy;
  /** 是否连接中 / Is connecting */
  isConnecting: boolean;
  /** 是否模拟模式 / Is mock mode */
  isMockMode: boolean;
  /** 重连统计 / Reconnect stats */
  reconnectStats: { attempts: number; probeInterval: number; consecutiveSuccess: number };
  /** 最后错误 / Last error */
  lastError: string | null;
  /** 保存数据库配置 / Save database config */
  saveConfig: (config: Partial<DatabaseConfig>) => void;
  /** 保存代理配置 / Save proxy config */
  saveProxyConfig: (config: Partial<LocalAPIProxyConfig>) => void;
  /** 连接到数据库 / Connect to database */
  connect: () => Promise<boolean>;
  /** 断开连接 / Disconnect */
  disconnect: () => void;
  /** 测试连接 / Test connection */
  testConnection: () => Promise<boolean>;
  /** 手动同步 / Manual sync */
  syncNow: () => Promise<boolean>;
  /** 更新同步策略 / Update sync strategy */
  updateSyncStrategy: (strategy: Partial<SyncStrategy>) => void;
}

/* ──────────────────── 默认配置 / Default Config ──────────────────── */

/**
 * 默认数据库配置
 * Default database configuration
 */
const DEFAULT_CONFIG: DatabaseConfig = {
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

/**
 * 默认代理配置
 * Default proxy configuration
 */
const DEFAULT_PROXY: LocalAPIProxyConfig = {
  baseUrl: "http://localhost:3721",
  apiVersion: "v1",
  authToken: "",
  timeout: 10000,
  enableRetry: true,
  maxRetries: 3,
  heartbeatInterval: 30000,
};

/* ──────────────────── Hook 实现 / Hook Implementation ──────────────────── */

/**
 * 数据库配置管理 Hook
 * Database Configuration Management Hook
 *
 * 提供完整的数据库连接生命周期管理：
 * - 配置持久化（localStorage）
 * - 连接/断开/测试
 * - 数据同步
 * - 健康监控
 *
 * Provides complete database connection lifecycle management:
 * - Config persistence (localStorage)
 * - Connect/Disconnect/Test
 * - Data synchronization
 * - Health monitoring
 *
 * @returns {UseDatabaseConfigReturn} Hook 返回值 / Hook return value
 */
export function useDatabaseConfig(): UseDatabaseConfigReturn {
  const [config, setConfig] = useState<DatabaseConfig>(DEFAULT_CONFIG);
  const [proxyConfig, setProxyConfig] = useState<LocalAPIProxyConfig>(DEFAULT_PROXY);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [health, setHealth] = useState<ConnectionHealth | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [syncStrategy, setSyncStrategy] = useState<SyncStrategy>(
    databaseService.getSyncStrategy()
  );

  /** 加载保存的配置 / Load saved config */
  useEffect(() => {
    const savedConfig = databaseService.getConfig();
    if (savedConfig) {
      setConfig(savedConfig);
    }

    const savedProxy = databaseService.getProxyConfig();
    if (savedProxy) {
      setProxyConfig(savedProxy);
    }
  }, []);

  /**
   * 监听 Repository 层连接状态变更（自动重连事件）
   * Listen to Repository layer connection status changes (auto-reconnect events)
   */
  useEffect(() => {
    const unsubscribe = databaseService.onStatusChange((event) => {
      setConnectionStatus(event.currentStatus);

      // 从 Mock 恢复到真实连接时，更新状态 / When recovering from mock to real, update state
      if (event.previousStatus === "error" && event.currentStatus === "connected") {
        setLastError(null);
      }

      // 进入 Mock 模式时，记录错误 / When entering mock mode, record error
      if (event.isMockMode && event.currentStatus === "error") {
        setLastError(`MOCK_MODE_ACTIVE / 模拟模式激活 (重连尝试: ${event.reconnectAttempts})`);
      }
    });

    return unsubscribe;
  }, []);

  /**
   * 保存数据库配置
   * Save database configuration
   */
  const saveConfig = useCallback(
    (partial: Partial<DatabaseConfig>) => {
      const updated: DatabaseConfig = {
        ...config,
        ...partial,
        updatedAt: new Date().toISOString(),
      };
      setConfig(updated);
      databaseService.saveConfig(updated);
    },
    [config]
  );

  /**
   * 保存代理配置
   * Save proxy configuration
   */
  const saveProxyConfig = useCallback(
    (partial: Partial<LocalAPIProxyConfig>) => {
      const updated: LocalAPIProxyConfig = {
        ...proxyConfig,
        ...partial,
      };
      setProxyConfig(updated);
      databaseService.saveProxyConfig(updated);
    },
    [proxyConfig]
  );

  /**
   * 连接数据库
   * Connect to database
   *
   * @returns {Promise<boolean>} 是否连接成功 / Connection success
   */
  const connect = useCallback(async (): Promise<boolean> => {
    setIsConnecting(true);
    setLastError(null);

    try {
      const result = await databaseService.initializeConnection(config);

      if (result.success && result.data) {
        setConnectionStatus("connected");
        setHealth(result.data);
        return true;
      } else {
        setConnectionStatus("error");
        setLastError(result.error ?? "CONNECTION_FAILED / 连接失败");
        return false;
      }
    } catch (err) {
      setConnectionStatus("error");
      setLastError(err instanceof Error ? err.message : "UNKNOWN_ERROR / 未知错误");
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [config]);

  /**
   * 断开数据库连接
   * Disconnect from database
   */
  const disconnect = useCallback(() => {
    databaseService.disconnect();
    setConnectionStatus("disconnected");
    setHealth(null);
  }, []);

  /**
   * 测试数据库连接（不持久化）
   * Test database connection (non-persistent)
   *
   * @returns {Promise<boolean>} 测试是否通过 / Test passed
   */
  const testConnection = useCallback(async (): Promise<boolean> => {
    setIsConnecting(true);
    setLastError(null);

    try {
      const result = await databaseService.initializeConnection(config);
      const success = result.success;

      if (!success) {
        setLastError(result.error ?? "TEST_FAILED / 测试失败");
      }

      // 测试后断开 / Disconnect after test
      databaseService.disconnect();
      setConnectionStatus("disconnected");

      return success;
    } catch (err) {
      setLastError(err instanceof Error ? err.message : "TEST_ERROR / 测试错误");
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [config]);

  /**
   * 手动同步数据
   * Manual data sync
   *
   * @returns {Promise<boolean>} 同步是否成功 / Sync success
   */
  const syncNow = useCallback(async (): Promise<boolean> => {
    try {
      const result = await databaseService.syncNow();
      return result.success;
    } catch {
      return false;
    }
  }, []);

  /**
   * 更新同步策略
   * Update sync strategy
   */
  const updateSyncStrategy = useCallback(
    (partial: Partial<SyncStrategy>) => {
      const updated = { ...syncStrategy, ...partial };
      setSyncStrategy(updated);
      databaseService.setSyncStrategy(updated);
    },
    [syncStrategy]
  );

  /** 组件卸载时清理 / Cleanup on unmount */
  useEffect(() => {
    return () => {
      databaseService.disconnect();
    };
  }, []);

  return {
    config,
    proxyConfig,
    connectionStatus,
    health,
    stats: databaseService.getStats(),
    syncStrategy,
    isConnecting,
    isMockMode: databaseService.isMockMode(),
    reconnectStats: databaseService.getReconnectStats(),
    lastError,
    saveConfig,
    saveProxyConfig,
    connect,
    disconnect,
    testConnection,
    syncNow,
    updateSyncStrategy,
  };
}