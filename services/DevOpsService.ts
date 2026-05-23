/**
 * @file DevOps 智能运维服务层 - MCP 注册 + 工作流引擎 + 健康聚合 + 智能诊断
 * @description 封装本地 DevOps 工具链全部业务逻辑，协调 MCP 工具注册、工作流执行、服务健康监控和智能诊断
 * @module services/DevOpsService
 * @version 0.9.4
 * @since Personalize
 * @layer Service (Controller → Service → Repository → Model)
 *
 * DevOps Intelligent Operations Service Layer
 * Encapsulates all local DevOps toolchain business logic, coordinating MCP tool registry,
 * workflow execution, service health monitoring, and intelligent diagnostics
 */

import type {
  DevOpsMetrics,
  DiagnosticIssue,
  InfraService,
  MCPServer,
  MCPServerStatus,
  MCPTool,
  MCPToolResult,
  OpsLogEntry,
  ServiceHealthStatus,
  WSChannelConfig,
  WSConnectionStatus,
  WSMessage,
  Workflow,
  WorkflowCreateInput,
  WorkflowExecutionStatus,
  WorkflowStep,
  WorkflowUpdateInput
} from "../types/devops";

/* ══════════════════════════════════════════════════════════════════
 *  常量 / Constants
 * ══════════════════════════════════════════════════════════════════ */

const STORAGE_KEYS = {
  MCP_SERVERS: "yyc3_mcp_servers",
  WORKFLOWS: "yyc3_workflows",
  OPS_LOG: "yyc3_ops_log",
  INFRA_SERVICES: "yyc3_infra_services",
} as const;

const MAX_OPS_LOG_ENTRIES = 500;

/** 代理服务基础 URL / Proxy service base URL */
const PROXY_BASE_URL = "http://localhost:3721";
const API_V1 = `${PROXY_BASE_URL}/api/v1`;

/** WebSocket 默认配置 / WebSocket default config */
const DEFAULT_WS_CONFIG: WSChannelConfig = {
  url: "ws://localhost:3721/ws",
  autoReconnect: true,
  reconnectInterval: 3000,
  maxReconnectAttempts: 20,
  heartbeatInterval: 30000,
  connectTimeout: 5000,
};

/* ══════════════════════════════════════════════════════════════════
 *  内置 MCP 服务器 / Built-in MCP Servers
 * ══════════════════════════════════════════════════════════════════ */

/**
 * 创建内置 MCP 工具列表
 * Create built-in MCP tools list
 */
function createBuiltInTools(): Record<string, MCPTool[]> {
  return {
    proxy: [
      {
        id: "proxy_health",
        name: "HEALTH_CHECK",
        description: "检查 API 代理服务健康状态 / Check API proxy service health",
        category: "monitoring",
        params: [],
        isDangerous: false,
        requiresConfirmation: false,
        estimatedDuration: 500,
      },
      {
        id: "proxy_tables",
        name: "LIST_TABLES",
        description: "列出数据库全部表 / List all database tables",
        category: "database",
        params: [],
        isDangerous: false,
        requiresConfirmation: false,
        estimatedDuration: 1000,
      },
      {
        id: "proxy_e2e",
        name: "E2E_TEST",
        description: "执行全部 10 个端点 E2E 测试 / Run all 10 endpoint E2E tests",
        category: "testing",
        params: [],
        isDangerous: false,
        requiresConfirmation: true,
        estimatedDuration: 10000,
      },
    ],
    database: [
      {
        id: "db_query",
        name: "EXECUTE_QUERY",
        description: "执行结构化数据库查询 / Execute structured database query",
        category: "database",
        params: [
          { name: "table", type: "string", required: true, description: "目标表名 / Target table" },
          { name: "action", type: "string", required: true, description: "操作类型 / Action type (SELECT/INSERT/UPDATE/DELETE)" },
          { name: "limit", type: "number", required: false, description: "限制返回行数 / Limit rows", defaultValue: 20 },
        ],
        isDangerous: false,
        requiresConfirmation: false,
        estimatedDuration: 2000,
      },
      {
        id: "db_stats",
        name: "DB_STATISTICS",
        description: "获取数据库统计信息 / Get database statistics",
        category: "database",
        params: [],
        isDangerous: false,
        requiresConfirmation: false,
        estimatedDuration: 1500,
      },
      {
        id: "db_schema_verify",
        name: "SCHEMA_VERIFY",
        description: "验证 DDL 表结构完整性 / Verify DDL schema integrity",
        category: "database",
        params: [],
        isDangerous: false,
        requiresConfirmation: false,
        estimatedDuration: 3000,
      },
      {
        id: "db_reset",
        name: "DB_RESET",
        description: "重置数据库（删除并重建） / Reset database (drop and recreate)",
        category: "database",
        params: [],
        isDangerous: true,
        requiresConfirmation: true,
        estimatedDuration: 15000,
      },
    ],
    docker: [
      {
        id: "docker_ps",
        name: "CONTAINER_STATUS",
        description: "列出全部 Docker 容器状态 / List all Docker container status",
        category: "docker",
        params: [],
        isDangerous: false,
        requiresConfirmation: false,
        estimatedDuration: 2000,
      },
      {
        id: "docker_compose_up",
        name: "COMPOSE_UP",
        description: "启动 Docker Compose 编排 / Start Docker Compose orchestration",
        category: "docker",
        params: [
          { name: "build", type: "boolean", required: false, description: "是否重新构建 / Rebuild images", defaultValue: false },
        ],
        isDangerous: false,
        requiresConfirmation: true,
        estimatedDuration: 60000,
      },
      {
        id: "docker_compose_down",
        name: "COMPOSE_DOWN",
        description: "停止 Docker Compose 编排 / Stop Docker Compose orchestration",
        category: "docker",
        params: [
          { name: "volumes", type: "boolean", required: false, description: "同时删除数据卷 / Also remove volumes", defaultValue: false },
        ],
        isDangerous: true,
        requiresConfirmation: true,
        estimatedDuration: 10000,
      },
    ],
    git: [
      {
        id: "git_status",
        name: "GIT_STATUS",
        description: "查看 Git 仓库状态 / Check Git repository status",
        category: "git",
        params: [],
        isDangerous: false,
        requiresConfirmation: false,
        estimatedDuration: 1000,
      },
      {
        id: "git_log",
        name: "GIT_LOG",
        description: "查看最近提交历史 / View recent commit history",
        category: "git",
        params: [
          { name: "count", type: "number", required: false, description: "显示条数 / Display count", defaultValue: 10 },
        ],
        isDangerous: false,
        requiresConfirmation: false,
        estimatedDuration: 1000,
      },
    ],
    security: [
      {
        id: "sec_scan",
        name: "DEPENDENCY_SCAN",
        description: "扫描依赖安全漏洞 / Scan dependency vulnerabilities",
        category: "security",
        params: [],
        isDangerous: false,
        requiresConfirmation: false,
        estimatedDuration: 30000,
      },
      {
        id: "sec_env_audit",
        name: "ENV_AUDIT",
        description: "审计环境变量配置安全 / Audit environment variable security",
        category: "security",
        params: [],
        isDangerous: false,
        requiresConfirmation: false,
        estimatedDuration: 2000,
      },
    ],
  };
}

/**
 * 创建内置 MCP 服务器列表
 * Create built-in MCP servers list
 */
function createBuiltInServers(): MCPServer[] {
  const tools = createBuiltInTools();

  return [
    {
      id: "mcp_yyc3_proxy",
      name: "YYC3_API_PROXY",
      description: "本地 API 代理服务 (Express :3721) / Local API Proxy Service",
      status: "disconnected",
      transport: "http",
      endpoint: "http://localhost:3721",
      latency: 0,
      tools: tools.proxy,
      lastHeartbeat: null,
      isBuiltIn: true,
      autoConnect: true,
      version: "0.9.4",
    },
    {
      id: "mcp_postgresql",
      name: "POSTGRESQL_15",
      description: "本地 PostgreSQL 15 数据库 / Local PostgreSQL 15 Database",
      status: "disconnected",
      transport: "http",
      endpoint: "localhost:5432",
      latency: 0,
      tools: tools.database,
      lastHeartbeat: null,
      isBuiltIn: true,
      autoConnect: true,
      version: "15.x",
    },
    {
      id: "mcp_docker",
      name: "DOCKER_ENGINE",
      description: "Docker 容器编排引擎 / Docker Container Orchestration Engine",
      status: "disconnected",
      transport: "stdio",
      endpoint: "unix:///var/run/docker.sock",
      latency: 0,
      tools: tools.docker,
      lastHeartbeat: null,
      isBuiltIn: true,
      autoConnect: false,
      version: "24.x",
    },
    {
      id: "mcp_github",
      name: "GITHUB_MCP",
      description: "GitHub 仓库操作 (MCP 协议) / GitHub Repository Operations",
      status: "disconnected",
      transport: "stdio",
      endpoint: "mcp-github-yyc3",
      latency: 0,
      tools: tools.git,
      lastHeartbeat: null,
      isBuiltIn: true,
      autoConnect: true,
      version: "1.0.0",
    },
    {
      id: "mcp_security",
      name: "SECURE_SENTINEL",
      description: "安全扫描与审计工具 / Security Scanning & Audit Tools",
      status: "disconnected",
      transport: "stdio",
      endpoint: "yyc3-sec-scanner",
      latency: 0,
      tools: tools.security,
      lastHeartbeat: null,
      isBuiltIn: true,
      autoConnect: false,
      version: "5.0.1",
    },
  ];
}

/* ══════════════════════════════════════════════════════════════════
 *  内置工作流 / Built-in Workflows
 * ══════════════════════════════════════════════════════════════════ */

/**
 * 创建内置工作流列表
 * Create built-in workflow list
 */
function createBuiltInWorkflows(): Workflow[] {
  const now = new Date().toISOString();

  return [
    {
      id: "wf_full_health",
      name: "FULL_STACK_HEALTH_CHECK",
      description: "全栈健康检查：PG → Proxy → 前端 → MCP / Full-stack health: PG → Proxy → Frontend → MCP",
      category: "monitoring",
      trigger: { type: "schedule", config: { interval: 60000, cron: "*/1 * * * *" }, enabled: true },
      steps: [
        createStep("step_1", "PROBE_POSTGRESQL", "mcp_tool", "db_stats", 1),
        createStep("step_2", "PROBE_API_PROXY", "mcp_tool", "proxy_health", 2),
        createStep("step_3", "CHECK_MCP_SERVERS", "mcp_tool", null, 3),
        createStep("step_4", "AGGREGATE_REPORT", "notification", null, 4),
      ],
      enabled: true,
      executionStatus: "idle",
      lastExecutedAt: null,
      lastDuration: 0,
      executionCount: 0,
      successCount: 0,
      createdAt: now,
      updatedAt: now,
      isBuiltIn: true,
    },
    {
      id: "wf_e2e_verify",
      name: "E2E_ENDPOINT_VERIFY",
      description: "端到端验证全部 10 个 API 端点 / E2E verify all 10 API endpoints",
      category: "testing",
      trigger: { type: "manual", config: {}, enabled: true },
      steps: [
        createStep("step_1", "CHECK_PROXY_ALIVE", "mcp_tool", "proxy_health", 1),
        createStep("step_2", "RUN_E2E_SUITE", "mcp_tool", "proxy_e2e", 2),
        createStep("step_3", "PARSE_RESULTS", "script", null, 3),
        createStep("step_4", "REPORT_STATUS", "notification", null, 4),
      ],
      enabled: true,
      executionStatus: "idle",
      lastExecutedAt: null,
      lastDuration: 0,
      executionCount: 0,
      successCount: 0,
      createdAt: now,
      updatedAt: now,
      isBuiltIn: true,
    },
    {
      id: "wf_deploy_pipeline",
      name: "DEPLOY_TO_PROD",
      description: "生产部署流水线：Lint → Test → Build → Deploy / Production pipeline: Lint → Test → Build → Deploy",
      category: "deployment",
      trigger: { type: "git_push", config: { branch: "main" }, enabled: false },
      steps: [
        createStep("step_1", "TYPECHECK", "mcp_tool", null, 1),
        createStep("step_2", "LINT_CODE", "mcp_tool", null, 2),
        createStep("step_3", "RUN_TESTS", "mcp_tool", "proxy_e2e", 3),
        createStep("step_4", "BUILD_ARTIFACTS", "script", null, 4),
        createStep("step_5", "DOCKER_BUILD", "mcp_tool", "docker_compose_up", 5),
        createStep("step_6", "SMOKE_TEST", "mcp_tool", "proxy_health", 6),
        createStep("step_7", "NOTIFY_TEAM", "notification", null, 7),
      ],
      enabled: false,
      executionStatus: "idle",
      lastExecutedAt: null,
      lastDuration: 0,
      executionCount: 0,
      successCount: 0,
      createdAt: now,
      updatedAt: now,
      isBuiltIn: true,
    },
    {
      id: "wf_security_scan",
      name: "SECURITY_SCAN_DAILY",
      description: "每日安全扫描：依赖审计 + 环境变量审计 / Daily security: dependency + env audit",
      category: "security",
      trigger: { type: "schedule", config: { cron: "0 2 * * *" }, enabled: true },
      steps: [
        createStep("step_1", "SCAN_DEPENDENCIES", "mcp_tool", "sec_scan", 1),
        createStep("step_2", "AUDIT_ENV_VARS", "mcp_tool", "sec_env_audit", 2),
        createStep("step_3", "GENERATE_REPORT", "script", null, 3),
      ],
      enabled: true,
      executionStatus: "idle",
      lastExecutedAt: null,
      lastDuration: 0,
      executionCount: 0,
      successCount: 0,
      createdAt: now,
      updatedAt: now,
      isBuiltIn: true,
    },
    {
      id: "wf_docker_orchestrate",
      name: "DOCKER_ONE_CLICK",
      description: "Docker Compose 一键编排：Build → Up → Verify / Docker Compose one-click: Build → Up → Verify",
      category: "devops",
      trigger: { type: "manual", config: {}, enabled: true },
      steps: [
        createStep("step_1", "COMPOSE_BUILD", "mcp_tool", "docker_compose_up", 1, { build: true }),
        createStep("step_2", "WAIT_FOR_HEALTHY", "delay", null, 2, { delay: 15000 }),
        createStep("step_3", "VERIFY_ENDPOINTS", "mcp_tool", "proxy_health", 3),
        createStep("step_4", "VERIFY_SCHEMA", "mcp_tool", "db_schema_verify", 4),
      ],
      enabled: true,
      executionStatus: "idle",
      lastExecutedAt: null,
      lastDuration: 0,
      executionCount: 0,
      successCount: 0,
      createdAt: now,
      updatedAt: now,
      isBuiltIn: true,
    },
    {
      id: "wf_auto_reconnect",
      name: "AUTO_RECONNECT_RECOVERY",
      description: "断线自动恢复：探针检测 → 重连 → 验证 / Auto-recovery: probe → reconnect → verify",
      category: "monitoring",
      trigger: { type: "on_disconnect", config: { service: "proxy" }, enabled: true },
      steps: [
        createStep("step_1", "LOG_DISCONNECT", "notification", null, 1),
        createStep("step_2", "ACTIVATE_MOCK_MODE", "script", null, 2),
        createStep("step_3", "START_PROBE_TIMER", "loop", null, 3, { interval: 5000, maxRetries: 100 }),
        createStep("step_4", "VERIFY_RECOVERY", "mcp_tool", "proxy_health", 4),
        createStep("step_5", "DEACTIVATE_MOCK_MODE", "script", null, 5),
      ],
      enabled: true,
      executionStatus: "idle",
      lastExecutedAt: null,
      lastDuration: 0,
      executionCount: 0,
      successCount: 0,
      createdAt: now,
      updatedAt: now,
      isBuiltIn: true,
    },
  ];
}

/**
 * 创建工作流步骤辅助函数
 * Helper to create workflow step
 */
function createStep(
  id: string,
  name: string,
  type: WorkflowStep["type"],
  toolId: string | null,
  order: number,
  extraConfig?: Record<string, string | number | boolean>
): WorkflowStep {
  return {
    id,
    name,
    type,
    toolId,
    config: extraConfig ?? {},
    onFailure: "stop",
    retryCount: 1,
    timeout: 30000,
    condition: null,
    executionStatus: "pending",
    executionOutput: null,
    executionDuration: 0,
    order,
  };
}

/* ══════════════════════════════════════════════════════════════════
 *  内置基础服务 / Built-in Infrastructure Services
 * ══════════════════════════════════════════════════════════════════ */

/**
 * 创建基础服务列表（健康聚合目标）
 * Create infrastructure service list (health aggregation targets)
 */
function createInfraServices(): InfraService[] {
  const now = new Date().toISOString();
  return [
    {
      id: "svc_postgres",
      name: "POSTGRESQL_15",
      type: "database",
      endpoint: "localhost:5432",
      health: "unknown",
      latency: 0,
      lastCheckAt: now,
      consecutiveHealthy: 0,
      consecutiveFailures: 0,
      uptimePercent: 0,
    },
    {
      id: "svc_proxy",
      name: "API_PROXY",
      type: "proxy",
      endpoint: "http://localhost:3721",
      health: "unknown",
      latency: 0,
      lastCheckAt: now,
      consecutiveHealthy: 0,
      consecutiveFailures: 0,
      uptimePercent: 0,
    },
    {
      id: "svc_frontend",
      name: "VITE_DEV_SERVER",
      type: "frontend",
      endpoint: "http://localhost:5173",
      health: "healthy",
      latency: 0,
      lastCheckAt: now,
      consecutiveHealthy: 1,
      consecutiveFailures: 0,
      uptimePercent: 100,
    },
    {
      id: "svc_docker",
      name: "DOCKER_ENGINE",
      type: "docker",
      endpoint: "unix:///var/run/docker.sock",
      health: "unknown",
      latency: 0,
      lastCheckAt: now,
      consecutiveHealthy: 0,
      consecutiveFailures: 0,
      uptimePercent: 0,
    },
  ];
}

/* ══════════════════════════════════════════════════════════════════
 *  DevOps 服务实现 / DevOps Service Implementation
 * ══════════════════════════════════════════════════════════════════ */

/**
 * DevOps 智能运维服务
 * DevOps Intelligent Operations Service
 *
 * 职责：
 * - MCP 服务器注册与健康探测
 * - 工作流引擎（定义、执行、监控、日志）
 * - 全栈健康聚合与智能诊断
 * - 操作日志与指标统计
 *
 * Responsibilities:
 * - MCP server registration and health probing
 * - Workflow engine (define, execute, monitor, log)
 * - Full-stack health aggregation and smart diagnostics
 * - Operations log and metrics statistics
 */
class DevOpsServiceImpl {
  /** MCP 服务器注册表 / MCP server registry */
  private servers: MCPServer[];

  /** 工作流列表 / Workflow list */
  private workflows: Workflow[];

  /** 基础服务列表 / Infrastructure services */
  private infraServices: InfraService[];

  /** 操作日志 / Operations log */
  private opsLog: OpsLogEntry[];

  /** 健康检查定时器 / Health check timer */
  private healthTimer: ReturnType<typeof setInterval> | null = null;

  /** 状态变更监听器 / State change listeners */
  private listeners: Array<() => void> = [];

  constructor() {
    this.servers = this.loadServers();
    this.workflows = this.loadWorkflows();
    this.infraServices = this.loadInfraServices();
    this.opsLog = this.loadOpsLog();
    this.addLog("system", "info", "DEVOPS_SERVICE_INITIALIZED / DevOps 服务已初始化");
  }

  /* ──────────── 状态订阅 / State Subscription ──────────── */

  /**
   * 订阅状态变更
   * Subscribe to state changes
   *
   * @param {() => void} listener - 变更回调 / Change callback
   * @returns {() => void} 取消订阅 / Unsubscribe
   */
  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * 通知所有监听器
   * Notify all listeners
   */
  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // 静默处理 / Silently handle
      }
    }
  }

  /* ══════════════════════════════════════════════════════════════
   *  MCP 服务器管理 / MCP Server Management
   * ══════════════════════════════════════════════════════════════ */

  /**
   * 获取全部 MCP 服务器
   * Get all MCP servers
   *
   * @returns {MCPServer[]} 服务器列表 / Server list
   */
  getServers(): MCPServer[] {
    return [...this.servers];
  }

  /**
   * 获取指定服务器
   * Get server by ID
   *
   * @param {string} serverId - 服务器 ID / Server ID
   * @returns {MCPServer | undefined} 服务器或 undefined / Server or undefined
   */
  getServer(serverId: string): MCPServer | undefined {
    return this.servers.find(s => s.id === serverId);
  }

  /**
   * 探测 MCP 服务器连接状态
   * Probe MCP server connection status
   *
   * @param {string} serverId - 服务器 ID / Server ID
   * @returns {Promise<boolean>} 是否可达 / Is reachable
   */
  async probeServer(serverId: string): Promise<boolean> {
    const idx = this.servers.findIndex(s => s.id === serverId);
    if (idx === -1) return false;

    const server = this.servers[idx];
    this.servers[idx] = { ...server, status: "probing" };
    this.notify();

    const start = Date.now();

    // 仅对 HTTP 端点执行真实探测 / Only probe HTTP endpoints
    if (server.transport === "http" && server.endpoint.startsWith("http")) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const response = await fetch(
          `${server.endpoint}/api/v1/health`,
          { method: "GET", signal: controller.signal }
        );
        clearTimeout(timeoutId);

        const latency = Date.now() - start;
        const newStatus: MCPServerStatus = response.ok ? "connected" : "error";

        this.servers[idx] = {
          ...server,
          status: newStatus,
          latency,
          lastHeartbeat: new Date().toISOString(),
        };

        this.addLog("mcp", newStatus === "connected" ? "success" : "error",
          `MCP_PROBE: ${server.name} → ${newStatus.toUpperCase()} (${latency}ms)`);
        this.notify();
        return newStatus === "connected";
      } catch {
        this.servers[idx] = { ...server, status: "error", latency: Date.now() - start };
        this.addLog("mcp", "error", `MCP_PROBE_FAILED: ${server.name} → UNREACHABLE`);
        this.notify();
        return false;
      }
    }

    // 非 HTTP 协议模拟探测 / Simulate probe for non-HTTP protocols
    await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
    const simLatency = Math.round(5 + Math.random() * 40);

    // 模拟: stdio 工具默认视为已连接 / Simulate: stdio tools default to connected
    this.servers[idx] = {
      ...server,
      status: "connected",
      latency: simLatency,
      lastHeartbeat: new Date().toISOString(),
    };
    this.addLog("mcp", "success", `MCP_PROBE: ${server.name} → CONNECTED (${simLatency}ms, simulated)`);
    this.notify();
    return true;
  }

  /**
   * 探测全部自动连接的服务器
   * Probe all auto-connect servers
   *
   * @returns {Promise<number>} 成功连接数 / Successful connection count
   */
  async probeAllServers(): Promise<number> {
    let successCount = 0;
    for (const server of this.servers) {
      if (server.autoConnect) {
        const ok = await this.probeServer(server.id);
        if (ok) successCount++;
      }
    }
    return successCount;
  }

  /**
   * 断开 MCP 服务器
   * Disconnect MCP server
   *
   * @param {string} serverId - 服务器 ID / Server ID
   */
  disconnectServer(serverId: string): void {
    const idx = this.servers.findIndex(s => s.id === serverId);
    if (idx === -1) return;
    this.servers[idx] = { ...this.servers[idx], status: "disconnected", latency: 0 };
    this.addLog("mcp", "info", `MCP_DISCONNECT: ${this.servers[idx].name}`);
    this.notify();
  }

  /**
   * 切换服务器自动连接
   * Toggle server auto-connect
   *
   * @param {string} serverId - 服务器 ID / Server ID
   */
  toggleAutoConnect(serverId: string): void {
    const idx = this.servers.findIndex(s => s.id === serverId);
    if (idx === -1) return;
    this.servers[idx] = { ...this.servers[idx], autoConnect: !this.servers[idx].autoConnect };
    this.saveServers();
    this.notify();
  }

  /**
   * 模拟执行 MCP 工具
   * Simulate MCP tool execution
   *
   * @param {string} serverId - 服务器 ID / Server ID
   * @param {string} toolId - 工具 ID / Tool ID
   * @param {Record<string, string | number | boolean>} [params] - 参数 / Parameters
   * @returns {Promise<MCPToolResult>} 执行结果 / Execution result
   */
  async executeTool(
    serverId: string,
    toolId: string,
    params?: Record<string, string | number | boolean>
  ): Promise<MCPToolResult> {
    const server = this.getServer(serverId);
    const tool = server?.tools.find(t => t.id === toolId);

    if (!server || !tool) {
      return {
        toolId,
        success: false,
        output: "",
        error: "TOOL_NOT_FOUND / 工具未找到",
        duration: 0,
        timestamp: new Date().toISOString(),
      };
    }

    const start = Date.now();
    this.addLog("mcp", "info", `TOOL_EXEC_START: ${server.name}/${tool.name} ${JSON.stringify(params ?? {})}`);

    // 对 proxy_health 执行真实请求 / Real request for proxy_health
    if (toolId === "proxy_health" && server.endpoint.startsWith("http")) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${server.endpoint}/api/v1/health`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const data = await response.json();
        const duration = Date.now() - start;

        this.addLog("mcp", "success", `TOOL_EXEC_OK: ${tool.name} (${duration}ms)`);
        return {
          toolId,
          success: true,
          output: JSON.stringify(data, null, 2),
          error: null,
          duration,
          timestamp: new Date().toISOString(),
        };
      } catch (err) {
        const duration = Date.now() - start;
        const errMsg = err instanceof Error ? err.message : "FETCH_FAILED";
        this.addLog("mcp", "error", `TOOL_EXEC_FAIL: ${tool.name} → ${errMsg}`);
        return {
          toolId,
          success: false,
          output: "",
          error: errMsg,
          duration,
          timestamp: new Date().toISOString(),
        };
      }
    }

    // ── 真实 API 路由分发 / Real API route dispatch ──
    // 尝试通过 :3721 代理执行真实请求 / Attempt real requests via :3721 proxy
    const realResult = await this.executeRealAPI(toolId, params);
    if (realResult) {
      const duration = Date.now() - start;
      this.addLog("mcp", "success", `TOOL_EXEC_OK: ${tool.name} (${duration}ms, real API)`);
      return { ...realResult, duration, timestamp: new Date().toISOString() };
    }

    // 降级到模拟 / Fallback to simulation
    await new Promise(r => setTimeout(r, 300 + Math.random() * tool.estimatedDuration * 0.3));
    const duration = Date.now() - start;

    const simOutput = this.generateSimulatedOutput(toolId, params);
    this.addLog("mcp", "success", `TOOL_EXEC_OK: ${tool.name} (${duration}ms, simulated)`);

    return {
      toolId,
      success: true,
      output: simOutput,
      error: null,
      duration,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 生成模拟工具输出
   * Generate simulated tool output
   */
  private generateSimulatedOutput(toolId: string, params?: Record<string, string | number | boolean>): string {
    const outputs: Record<string, string> = {
      proxy_tables: JSON.stringify({
        tables: ["agents", "channels", "chats", "messages", "system_configs", "workflows", "audit_logs", "migrations"],
        count: 8,
      }, null, 2),
      proxy_e2e: "E2E RESULTS: 10/10 passed, 0 failed\nTotal Duration: 1847ms\nAll endpoints operational.",
      db_query: JSON.stringify({ rows: [{ id: 1, status: "active" }], rowCount: 1 }, null, 2),
      db_stats: JSON.stringify({
        tableCount: 8, totalRecords: 142, databaseSize: "28 MB",
        activeConnections: 3, maxConnections: 100, version: "PostgreSQL 15.8",
      }, null, 2),
      db_schema_verify: "SCHEMA VERIFICATION: 8/8 tables OK\n2 views OK\n4 triggers OK\n6 indexes OK\nChecksum: 0xA3F7B2C1",
      db_reset: "WARNING: Database yyc3_family dropped and recreated.\n8 tables initialized.",
      docker_ps: `CONTAINER ID   NAME             STATUS\na1b2c3d4e5f6   yyc3-postgres    Up 2 hours (healthy)\nf6e5d4c3b2a1   yyc3-proxy       Up 2 hours (healthy)\n1a2b3c4d5e6f   yyc3-frontend    Up 2 hours`,
      docker_compose_up: `Creating network "yyc3-network"\nCreating yyc3-postgres ... done\nCreating yyc3-proxy    ... done\nCreating yyc3-frontend ... done\n${params?.build ? "Building images..." : "Using existing images."}`,
      docker_compose_down: `Stopping yyc3-frontend ... done\nStopping yyc3-proxy    ... done\nStopping yyc3-postgres ... done\n${params?.volumes ? "Removing volumes..." : "Volumes preserved."}`,
      git_status: "On branch main\nYour branch is up to date with 'origin/main'.\nnothing to commit, working tree clean",
      git_log: "a1b2c3d feat: add DevOps MCP layer (2 minutes ago)\nf4e5d6c refactor: auto-reconnect mechanism (1 hour ago)\nc7b8a9d chore: docker-compose orchestration (3 hours ago)",
      sec_scan: "Scanning 47 dependencies...\n0 critical, 0 high, 1 moderate, 2 low\nAll production dependencies clean.",
      sec_env_audit: "ENV AUDIT REPORT:\n✓ YYC3_PG_PASSWORD: SET (masked)\n✓ YYC3_AUTH_TOKEN: EMPTY (local dev OK)\n✓ No hardcoded secrets detected\n✓ .env in .gitignore: YES",
    };
    return outputs[toolId] ?? `Tool ${toolId} executed successfully.`;
  }

  /**
   * 获取全部已注册工具（跨服务器）
   * Get all registered tools (across servers)
   *
   * @returns {Array<MCPTool & { serverId: string; serverName: string }>} 工具列表
   */
  getAllTools(): Array<MCPTool & { serverId: string; serverName: string }> {
    const result: Array<MCPTool & { serverId: string; serverName: string }> = [];
    for (const server of this.servers) {
      for (const tool of server.tools) {
        result.push({ ...tool, serverId: server.id, serverName: server.name });
      }
    }
    return result;
  }

  /**
   * 通过 :3721 代理执行真实 API 请求
   * Execute real API request via :3721 proxy
   */
  private async executeRealAPI(toolId: string, params?: Record<string, string | number | boolean>): Promise<MCPToolResult | null> {
    /** 路由映射：toolId → 真实代理端点 / Route map: toolId → real proxy endpoint */
    interface RouteConfig { method: string; path: string; body?: unknown }
    const routeMap: Record<string, RouteConfig> = {
      proxy_tables: { method: "GET", path: "/tables" },
      db_query: { method: "POST", path: "/query", body: { sql: String(params?.sql ?? "SELECT 1"), params: [] } },
      db_stats: { method: "POST", path: "/query", body: { sql: "SELECT count(*) AS table_count FROM information_schema.tables WHERE table_schema = 'public'", params: [] } },
      db_schema_verify: { method: "POST", path: "/query", body: { sql: "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename", params: [] } },
    };
    const route = routeMap[toolId];
    if (!route) return null;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const fetchOpts: RequestInit = { method: route.method, signal: controller.signal, headers: { "Content-Type": "application/json" } };
      if (route.body) fetchOpts.body = JSON.stringify(route.body);
      const response = await fetch(`${API_V1}${route.path}`, fetchOpts);
      clearTimeout(timeoutId);
      if (!response.ok) return null;
      const data = await response.json();
      return { toolId, success: true, output: JSON.stringify(data, null, 2), error: null, duration: 0, timestamp: new Date().toISOString() };
    } catch {
      return null;
    }
  }

  /* ══════════════════════════════════════════════════════════════
   *  工作流引擎 / Workflow Engine
   * ══════════════════════════════════════════════════════════════ */

  /**
   * 获取全部工作流
   * Get all workflows
   *
   * @returns {Workflow[]} 工作流列表 / Workflow list
   */
  getWorkflows(): Workflow[] {
    return [...this.workflows];
  }

  /**
   * 获取指定工作流
   * Get workflow by ID
   *
   * @param {string} workflowId - 工作流 ID / Workflow ID
   * @returns {Workflow | undefined} 工作流或 undefined / Workflow or undefined
   */
  getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.find(w => w.id === workflowId);
  }

  /**
   * 切换工作流启用状态
   * Toggle workflow enabled state
   *
   * @param {string} workflowId - 工作流 ID / Workflow ID
   */
  toggleWorkflow(workflowId: string): void {
    const idx = this.workflows.findIndex(w => w.id === workflowId);
    if (idx === -1) return;
    this.workflows[idx] = {
      ...this.workflows[idx],
      enabled: !this.workflows[idx].enabled,
      updatedAt: new Date().toISOString(),
    };
    this.saveWorkflows();
    this.addLog("workflow", "info",
      `WORKFLOW_${this.workflows[idx].enabled ? "ENABLED" : "DISABLED"}: ${this.workflows[idx].name}`);
    this.notify();
  }

  /**
   * 执行工作流（模拟）
   * Execute workflow (simulated)
   *
   * @param {string} workflowId - 工作流 ID / Workflow ID
   * @returns {Promise<boolean>} 是否执行成功 / Execution success
   */
  async executeWorkflow(workflowId: string): Promise<boolean> {
    const idx = this.workflows.findIndex(w => w.id === workflowId);
    if (idx === -1) return false;

    const workflow = this.workflows[idx];

    // 更新状态为运行中 / Set status to running
    this.workflows[idx] = { ...workflow, executionStatus: "running" as WorkflowExecutionStatus };
    this.addLog("workflow", "info", `WORKFLOW_START: ${workflow.name} (${workflow.steps.length} steps)`);
    this.notify();

    const startTime = Date.now();
    let allSuccess = true;

    // 逐步执行 / Execute step by step
    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];

      // 更新步骤状态 / Update step status
      this.workflows[idx] = {
        ...this.workflows[idx],
        steps: this.workflows[idx].steps.map((s, si) =>
          si === i ? { ...s, executionStatus: "running" as const } : s
        ),
      };
      this.addLog("workflow", "info", `  STEP_${i + 1}: ${step.name} → RUNNING`);
      this.notify();

      // 模拟步骤执行 / Simulate step execution
      const stepStart = Date.now();

      if (step.type === "delay") {
        const delayMs = (step.config.delay as number) ?? 3000;
        await new Promise(r => setTimeout(r, Math.min(delayMs, 2000)));
      } else if (step.type === "mcp_tool" && step.toolId) {
        // 查找对应服务器 / Find matching server
        const toolInfo = this.getAllTools().find(t => t.id === step.toolId);
        if (toolInfo) {
          const result = await this.executeTool(toolInfo.serverId, step.toolId);
          if (!result.success) {
            allSuccess = false;
            if (step.onFailure === "stop") {
              this.workflows[idx] = {
                ...this.workflows[idx],
                steps: this.workflows[idx].steps.map((s, si) =>
                  si === i ? { ...s, executionStatus: "failed" as const, executionOutput: result.error, executionDuration: Date.now() - stepStart } : s
                ),
              };
              this.addLog("workflow", "error", `  STEP_${i + 1}: ${step.name} → FAILED (${result.error})`);
              break;
            }
          }
        } else {
          await new Promise(r => setTimeout(r, 300 + Math.random() * 500));
        }
      } else {
        // 模拟其他步骤类型 / Simulate other step types
        await new Promise(r => setTimeout(r, 200 + Math.random() * 800));
      }

      const stepDuration = Date.now() - stepStart;

      // 更新步骤完成状态 / Update step completion status
      this.workflows[idx] = {
        ...this.workflows[idx],
        steps: this.workflows[idx].steps.map((s, si) =>
          si === i ? {
            ...s,
            executionStatus: allSuccess ? "success" as const : "failed" as const,
            executionDuration: stepDuration,
            executionOutput: allSuccess ? `OK (${stepDuration}ms)` : "STEP_FAILED",
          } : s
        ),
      };
      this.addLog("workflow", allSuccess ? "info" : "error",
        `  STEP_${i + 1}: ${step.name} → ${allSuccess ? "SUCCESS" : "FAILED"} (${stepDuration}ms)`);
      this.notify();
    }

    // 更新工作流完成状态 / Update workflow completion status
    const totalDuration = Date.now() - startTime;
    this.workflows[idx] = {
      ...this.workflows[idx],
      executionStatus: allSuccess ? "completed" : "failed",
      lastExecutedAt: new Date().toISOString(),
      lastDuration: totalDuration,
      executionCount: this.workflows[idx].executionCount + 1,
      successCount: this.workflows[idx].successCount + (allSuccess ? 1 : 0),
      updatedAt: new Date().toISOString(),
    };

    this.addLog("workflow", allSuccess ? "success" : "error",
      `WORKFLOW_${allSuccess ? "COMPLETED" : "FAILED"}: ${workflow.name} (${totalDuration}ms)`);
    this.saveWorkflows();
    this.notify();
    return allSuccess;
  }

  /**
   * 重置工作流执行状态
   * Reset workflow execution state
   *
   * @param {string} workflowId - 工作流 ID / Workflow ID
   */
  resetWorkflow(workflowId: string): void {
    const idx = this.workflows.findIndex(w => w.id === workflowId);
    if (idx === -1) return;
    this.workflows[idx] = {
      ...this.workflows[idx],
      executionStatus: "idle",
      steps: this.workflows[idx].steps.map(s => ({
        ...s,
        executionStatus: "pending" as const,
        executionOutput: null,
        executionDuration: 0,
      })),
      updatedAt: new Date().toISOString(),
    };
    this.saveWorkflows();
    this.notify();
  }

  /* ══════════════════════════════════════════════════════════════
   *  健康聚合 / Health Aggregation
   * ══════════════════════════════════════════════════════════════ */

  /**
   * 获取基础服务列表
   * Get infrastructure services list
   *
   * @returns {InfraService[]} 服务列表 / Service list
   */
  getInfraServices(): InfraService[] {
    return [...this.infraServices];
  }

  /**
   * 执行全栈健康扫描
   * Execute full-stack health scan
   *
   * @returns {Promise<InfraService[]>} 更新后的服务列表 / Updated service list
   */
  async scanHealth(): Promise<InfraService[]> {
    this.addLog("health", "info", "HEALTH_SCAN_START: Scanning all infrastructure services...");

    for (let i = 0; i < this.infraServices.length; i++) {
      const svc = this.infraServices[i];

      // 对 HTTP 端点执行真实探测 / Real probe for HTTP endpoints
      if (svc.endpoint.startsWith("http")) {
        const start = Date.now();
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);

          let url = svc.endpoint;
          if (svc.type === "proxy") url += "/api/v1/health";

          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);

          const latency = Date.now() - start;
          const newHealth: ServiceHealthStatus = response.ok ? "healthy" : "degraded";

          this.infraServices[i] = {
            ...svc,
            health: newHealth,
            latency,
            lastCheckAt: new Date().toISOString(),
            consecutiveHealthy: newHealth === "healthy" ? svc.consecutiveHealthy + 1 : 0,
            consecutiveFailures: newHealth !== "healthy" ? svc.consecutiveFailures + 1 : 0,
            uptimePercent: newHealth === "healthy"
              ? Math.min(100, svc.uptimePercent + 0.1)
              : Math.max(0, svc.uptimePercent - 5),
          };
        } catch {
          this.infraServices[i] = {
            ...svc,
            health: "down",
            latency: Date.now() - start,
            lastCheckAt: new Date().toISOString(),
            consecutiveHealthy: 0,
            consecutiveFailures: svc.consecutiveFailures + 1,
            uptimePercent: Math.max(0, svc.uptimePercent - 10),
          };
        }
      } else {
        // 非 HTTP 服务模拟 / Simulate non-HTTP services
        await new Promise(r => setTimeout(r, 100));
        this.infraServices[i] = {
          ...svc,
          health: "unknown",
          lastCheckAt: new Date().toISOString(),
        };
      }
    }

    this.addLog("health", "info",
      `HEALTH_SCAN_COMPLETE: ${this.infraServices.filter(s => s.health === "healthy").length}/${this.infraServices.length} healthy`);
    this.saveInfraServices();
    this.notify();
    return this.getInfraServices();
  }

  /**
   * 启动定时健康扫描
   * Start periodic health scanning
   *
   * @param {number} [intervalMs=60000] - 扫描间隔 / Scan interval
   */
  startHealthMonitor(intervalMs: number = 60000): void {
    this.stopHealthMonitor();
    this.healthTimer = setInterval(() => {
      this.scanHealth();
    }, intervalMs);
  }

  /**
   * 停止健康扫描
   * Stop health scanning
   */
  stopHealthMonitor(): void {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
  }

  /* ══════════════════════════════════════════════════════════════
   *  智能诊断 / Intelligent Diagnostics
   * ══════════════════════════════════════════════════════════════ */

  /**
   * 执行智能诊断
   * Execute intelligent diagnostics
   *
   * @returns {DiagnosticIssue[]} 检测到的问题列表 / Detected issues list
   */
  runDiagnostics(): DiagnosticIssue[] {
    const issues: DiagnosticIssue[] = [];
    const now = new Date().toISOString();

    // 检查基础服务健康 / Check infrastructure health
    for (const svc of this.infraServices) {
      if (svc.health === "down") {
        issues.push({
          id: `diag_${svc.id}_down`,
          title: `SERVICE_DOWN: ${svc.name}`,
          description: `${svc.name} 在 ${svc.endpoint} 无法访问 / is unreachable at ${svc.endpoint}`,
          severity: "critical",
          source: svc.name,
          suggestion: svc.type === "proxy"
            ? "执行 cd server && npm run dev 启动代理 / Run 'cd server && npm run dev'"
            : svc.type === "database"
              ? "执行 brew services start postgresql@15 / Run 'brew services start postgresql@15'"
              : `检查 ${svc.name} 服务状态 / Check ${svc.name} service status`,
          autoFixCommand: svc.type === "proxy" ? "cd server && npm run dev" : null,
          isAutoFixable: svc.type === "proxy",
          detectedAt: now,
          resolved: false,
        });
      } else if (svc.health === "degraded") {
        issues.push({
          id: `diag_${svc.id}_degraded`,
          title: `SERVICE_DEGRADED: ${svc.name}`,
          description: `${svc.name} 响应异常 (延迟: ${svc.latency}ms) / responding abnormally`,
          severity: "warning",
          source: svc.name,
          suggestion: "检查服务日志和资源使用率 / Check service logs and resource usage",
          autoFixCommand: null,
          isAutoFixable: false,
          detectedAt: now,
          resolved: false,
        });
      }

      if (svc.latency > 500 && svc.health === "healthy") {
        issues.push({
          id: `diag_${svc.id}_slow`,
          title: `HIGH_LATENCY: ${svc.name}`,
          description: `${svc.name} 延迟过高: ${svc.latency}ms / high latency detected`,
          severity: "warning",
          source: svc.name,
          suggestion: "检查网络连接和服务负载 / Check network connection and service load",
          autoFixCommand: null,
          isAutoFixable: false,
          detectedAt: now,
          resolved: false,
        });
      }
    }

    // 检查 MCP 服务器 / Check MCP servers
    const disconnectedAutoConnect = this.servers.filter(
      s => s.autoConnect && s.status === "disconnected"
    );
    if (disconnectedAutoConnect.length > 0) {
      issues.push({
        id: "diag_mcp_disconnected",
        title: "MCP_SERVERS_OFFLINE",
        description: `${disconnectedAutoConnect.length} 个自动连接的 MCP 服务器离线 / auto-connect MCP servers offline`,
        severity: "info",
        source: "MCP_REGISTRY",
        suggestion: "点击 PROBE ALL 重新探测 / Click PROBE ALL to re-probe",
        autoFixCommand: null,
        isAutoFixable: false,
        detectedAt: now,
        resolved: false,
      });
    }

    // 检查工作流 / Check workflows
    const failedWorkflows = this.workflows.filter(w => w.executionStatus === "failed");
    if (failedWorkflows.length > 0) {
      issues.push({
        id: "diag_workflow_failed",
        title: "WORKFLOWS_FAILED",
        description: `${failedWorkflows.length} 个工作流执行失败 / workflow(s) have failed`,
        severity: "warning",
        source: "WORKFLOW_ENGINE",
        suggestion: `检查失败工作流: ${failedWorkflows.map(w => w.name).join(", ")} / Check failed workflows`,
        autoFixCommand: null,
        isAutoFixable: false,
        detectedAt: now,
        resolved: false,
      });
    }

    this.addLog("system", "info",
      `DIAGNOSTICS_COMPLETE: ${issues.length} issue(s) found (${issues.filter(i => i.severity === "critical").length} critical)`);
    this.notify();
    return issues;
  }

  /* ══════════════════════════════════════════════════════════════
   *  指标统计 / Metrics Statistics
   * ══════════════════════════════════════════════════════════════ */

  /**
   * 获取 DevOps 仪表盘指标
   * Get DevOps dashboard metrics
   *
   * @returns {DevOpsMetrics} 指标数据 / Metrics data
   */
  getMetrics(): DevOpsMetrics {
    const totalServices = this.infraServices.length;
    const healthyServices = this.infraServices.filter(s => s.health === "healthy").length;
    const degradedServices = this.infraServices.filter(s => s.health === "degraded").length;
    const downServices = this.infraServices.filter(s => s.health === "down").length;

    const allTools = this.getAllTools();
    const activeWorkflows = this.workflows.filter(w => w.enabled).length;

    const totalExecs = this.workflows.reduce((sum, w) => sum + w.executionCount, 0);
    const totalSuccess = this.workflows.reduce((sum, w) => sum + w.successCount, 0);

    const healthyLatencies = this.infraServices
      .filter(s => s.health === "healthy" && s.latency > 0)
      .map(s => s.latency);
    const avgLatency = healthyLatencies.length > 0
      ? Math.round(healthyLatencies.reduce((a, b) => a + b, 0) / healthyLatencies.length)
      : 0;

    const issues = this.runDiagnostics();

    return {
      totalServices,
      healthyServices,
      degradedServices,
      downServices,
      registeredTools: allTools.length,
      activeWorkflows,
      todayExecutions: totalExecs,
      todaySuccessRate: totalExecs > 0 ? Math.round((totalSuccess / totalExecs) * 100) : 100,
      unresolvedIssues: issues.filter(i => !i.resolved).length,
      avgLatency,
    };
  }

  /* ══════════════════════════════════════════════════════════════
   *  操作日志 / Operations Log
   * ══════════════════════════════════════════════════════════════ */

  /**
   * 添加操作日志
   * Add operations log entry
   *
   * @param {OpsLogEntry["source"]} source - 来源 / Source
   * @param {OpsLogEntry["level"]} level - 级别 / Level
   * @param {string} message - 消息 / Message
   * @param {string} [detail] - 详细数据 / Detail
   */
  addLog(
    source: OpsLogEntry["source"],
    level: OpsLogEntry["level"],
    message: string,
    detail?: string
  ): void {
    const entry: OpsLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      source,
      level,
      message,
      detail: detail ?? null,
      timestamp: new Date().toISOString(),
    };

    this.opsLog = [entry, ...this.opsLog].slice(0, MAX_OPS_LOG_ENTRIES);
    this.saveOpsLog();
  }

  /**
   * 获取操作日志
   * Get operations log
   *
   * @param {number} [limit=50] - 返回条数 / Limit
   * @param {OpsLogEntry["level"]} [filterLevel] - 过滤级别 / Filter level
   * @returns {OpsLogEntry[]} 日志列表 / Log list
   */
  getOpsLog(limit: number = 50, filterLevel?: OpsLogEntry["level"]): OpsLogEntry[] {
    let logs = [...this.opsLog];
    if (filterLevel) {
      logs = logs.filter(l => l.level === filterLevel);
    }
    return logs.slice(0, limit);
  }

  /**
   * 清空操作日志
   * Clear operations log
   */
  clearOpsLog(): void {
    this.opsLog = [];
    this.saveOpsLog();
    this.addLog("system", "info", "OPS_LOG_CLEARED / 操作日志已清空");
    this.notify();
  }

  /* ══════════════════════════════════════════════════════════════
   *  持久化 / Persistence
   * ══════════════════════════════════════════════════════════════ */

  /** 加载 MCP 服务器 / Load MCP servers */
  private loadServers(): MCPServer[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MCP_SERVERS);
      if (stored) return JSON.parse(stored);
    } catch { /* fallback */ }
    return createBuiltInServers();
  }

  /** 保存 MCP 服务器 / Save MCP servers */
  private saveServers(): void {
    localStorage.setItem(STORAGE_KEYS.MCP_SERVERS, JSON.stringify(this.servers));
  }

  /** 加载工作流 / Load workflows */
  private loadWorkflows(): Workflow[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.WORKFLOWS);
      if (stored) return JSON.parse(stored);
    } catch { /* fallback */ }
    return createBuiltInWorkflows();
  }

  /** 保存工作流 / Save workflows */
  private saveWorkflows(): void {
    localStorage.setItem(STORAGE_KEYS.WORKFLOWS, JSON.stringify(this.workflows));
  }

  /** 加载基础服务 / Load infra services */
  private loadInfraServices(): InfraService[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.INFRA_SERVICES);
      if (stored) return JSON.parse(stored);
    } catch { /* fallback */ }
    return createInfraServices();
  }

  /** 保存基础服务 / Save infra services */
  private saveInfraServices(): void {
    localStorage.setItem(STORAGE_KEYS.INFRA_SERVICES, JSON.stringify(this.infraServices));
  }

  /** 加载操作日志 / Load ops log */
  private loadOpsLog(): OpsLogEntry[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.OPS_LOG);
      if (stored) return JSON.parse(stored);
    } catch { /* fallback */ }
    return [];
  }

  /** 保存操作日志 / Save ops log */
  private saveOpsLog(): void {
    localStorage.setItem(STORAGE_KEYS.OPS_LOG, JSON.stringify(this.opsLog));
  }

  /* ══════════════════════════════════════════════════════════════
   *  工作流 CRUD / Workflow CRUD
   * ══════════════════════════════════════════════════════════════ */

  /**
   * 创建自定义工作流 / Create custom workflow
   */
  createWorkflow(input: WorkflowCreateInput): Workflow {
    const now = new Date().toISOString();
    const id = `wf_custom_${Date.now()}`;
    const steps: WorkflowStep[] = input.steps.map((s, i) =>
      createStep(`step_${i + 1}`, s.name, s.type, s.toolId, i + 1, s.config)
    );
    const workflow: Workflow = {
      id, name: input.name.toUpperCase().replace(/\s+/g, "_"), description: input.description,
      category: input.category, trigger: input.trigger, steps, enabled: true,
      executionStatus: "idle", lastExecutedAt: null, lastDuration: 0,
      executionCount: 0, successCount: 0, createdAt: now, updatedAt: now, isBuiltIn: false,
    };
    this.workflows.push(workflow);
    this.saveWorkflows();
    this.addLog("workflow", "success", `WORKFLOW_CREATED: ${workflow.name} (${steps.length} steps)`);
    this.notify();
    return workflow;
  }

  /**
   * 更新工作流 / Update workflow
   */
  updateWorkflow(workflowId: string, input: WorkflowUpdateInput): Workflow | null {
    const idx = this.workflows.findIndex(w => w.id === workflowId);
    if (idx === -1) return null;
    const existing = this.workflows[idx];
    let steps = existing.steps;
    if (input.steps) {
      steps = input.steps.map((s, i) => createStep(`step_${i + 1}`, s.name, s.type, s.toolId, i + 1, s.config));
    }
    this.workflows[idx] = {
      ...existing,
      name: input.name !== undefined ? input.name.toUpperCase().replace(/\s+/g, "_") : existing.name,
      description: input.description ?? existing.description,
      category: input.category ?? existing.category,
      trigger: input.trigger ?? existing.trigger,
      steps, enabled: input.enabled ?? existing.enabled, updatedAt: new Date().toISOString(),
    };
    this.saveWorkflows();
    this.addLog("workflow", "info", `WORKFLOW_UPDATED: ${this.workflows[idx].name}`);
    this.notify();
    return this.workflows[idx];
  }

  /**
   * 删除工作流（仅限自定义） / Delete workflow (custom only)
   */
  deleteWorkflow(workflowId: string): boolean {
    const idx = this.workflows.findIndex(w => w.id === workflowId);
    if (idx === -1) return false;
    const wf = this.workflows[idx];
    if (wf.isBuiltIn) { this.addLog("workflow", "warn", `CANNOT_DELETE_BUILTIN: ${wf.name}`); return false; }
    this.workflows.splice(idx, 1);
    this.saveWorkflows();
    this.addLog("workflow", "info", `WORKFLOW_DELETED: ${wf.name}`);
    this.notify();
    return true;
  }

  /* ══════════════════════════════════════════════════════════════
   *  WebSocket 实时通道 / WebSocket Real-time Channel
   * ══════════════════════════════════════════════════════════════ */

  private ws: WebSocket | null = null;
  private wsStatus: WSConnectionStatus = "disconnected";
  private wsReconnectAttempts: number = 0;
  private wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private wsHeartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private wsConfig: WSChannelConfig = DEFAULT_WS_CONFIG;
  private wsMessageListeners: Array<(msg: WSMessage) => void> = [];

  /** 获取 WS 状态 / Get WS status */
  getWSStatus(): WSConnectionStatus { return this.wsStatus; }
  getWsStatus(): WSConnectionStatus { return this.wsStatus; }

  /**
   * 连接 WebSocket / Connect WebSocket
   */
  connectWS(config?: Partial<WSChannelConfig>): void {
    if (config) this.wsConfig = { ...this.wsConfig, ...config };
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    this.wsStatus = "connecting";
    this.addLog("system", "info", `WS_CONNECTING: ${this.wsConfig.url}`);
    this.notify();
    try {
      this.ws = new WebSocket(this.wsConfig.url);
      const connectTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
          this.ws.close(); this.wsStatus = "error"; this.notify(); this.attemptReconnect();
        }
      }, this.wsConfig.connectTimeout);
      this.ws.onopen = () => {
        clearTimeout(connectTimeout); this.wsStatus = "connected"; this.wsReconnectAttempts = 0;
        this.addLog("system", "success", "WS_CONNECTED"); this.notify(); this.startWSHeartbeat();
      };
      this.ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data as string);
          this.handleWSMessage(msg);
        } catch { /* parse error */ }
      };
      this.ws.onclose = () => {
        clearTimeout(connectTimeout); this.stopWSHeartbeat();
        const wasConnected = this.wsStatus === "connected";
        this.wsStatus = "disconnected"; this.notify();
        if (wasConnected && this.wsConfig.autoReconnect) this.attemptReconnect();
      };
      this.ws.onerror = () => { this.wsStatus = "error"; this.notify(); };
    } catch {
      this.wsStatus = "error"; this.notify();
      if (this.wsConfig.autoReconnect) this.attemptReconnect();
    }
  }

  /** 断开 WS / Disconnect WS */
  disconnectWS(): void {
    if (this.wsReconnectTimer) { clearTimeout(this.wsReconnectTimer); this.wsReconnectTimer = null; }
    this.stopWSHeartbeat();
    if (this.ws) { this.ws.close(); this.ws = null; }
    this.wsStatus = "disconnected"; this.wsReconnectAttempts = 0; this.notify();
  }

  /** 发送 WS 消息 / Send WS message */
  sendWSMessage(msg: WSMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  /** 订阅 WS 消息 / Subscribe to WS messages */
  onWSMessage(listener: (msg: WSMessage) => void): () => void {
    this.wsMessageListeners.push(listener);
    return () => { this.wsMessageListeners = this.wsMessageListeners.filter(l => l !== listener); };
  }

  private handleWSMessage(msg: WSMessage): void {
    if (msg.type === "log") {
      this.addLog("system", (msg.payload.level as OpsLogEntry["level"]) ?? "info", String(msg.payload.message ?? "WS_LOG"));
    }
    for (const listener of this.wsMessageListeners) { try { listener(msg); } catch { /* */ } }
    this.notify();
  }

  private attemptReconnect(): void {
    if (this.wsReconnectAttempts >= this.wsConfig.maxReconnectAttempts) {
      this.wsStatus = "error"; this.notify(); return;
    }
    this.wsReconnectAttempts++;
    this.wsStatus = "reconnecting";
    const delay = Math.min(this.wsConfig.reconnectInterval * Math.pow(1.5, this.wsReconnectAttempts - 1), 30000);
    this.addLog("system", "info", `WS_RECONNECT: attempt ${this.wsReconnectAttempts}/${this.wsConfig.maxReconnectAttempts} in ${Math.round(delay)}ms`);
    this.notify();
    this.wsReconnectTimer = setTimeout(() => this.connectWS(), delay);
  }

  private startWSHeartbeat(): void {
    this.stopWSHeartbeat();
    this.wsHeartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "heartbeat", payload: { t: Date.now() }, timestamp: new Date().toISOString(), id: `hb_${Date.now()}` }));
      }
    }, this.wsConfig.heartbeatInterval);
  }

  private stopWSHeartbeat(): void {
    if (this.wsHeartbeatTimer) { clearInterval(this.wsHeartbeatTimer); this.wsHeartbeatTimer = null; }
  }

  /**
   * 清理（卸载时调用） / Cleanup (called on unmount)
   */
  cleanup(): void {
    this.stopHealthMonitor();
    this.disconnectWS();
    this.listeners = [];
    this.wsMessageListeners = [];
  }
}

/**
 * DevOps 智能运维服务单例实例
 * DevOps Intelligent Operations Service singleton instance
 */
export const devOpsService = new DevOpsServiceImpl();
