/**
 * @file DevOps MCP + 工作流 + 智能运维类型定义
 * @description 定义本地 DevOps 工具链、MCP 服务器注册、工作流引擎、智能运维所需的全部数据结构
 * @module types/devops
 * @version 0.9.4
 * @since Personalize
 *
 * DevOps MCP + Workflow + Intelligent Operations Type Definitions
 * Defines all data structures for local DevOps toolchain, MCP server registry,
 * workflow engine, and intelligent operations
 *
 * 架构总览 / Architecture Overview:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                    DevOps Intelligence Layer                   │
 * │  ┌──────────────┐ ┌──────────────┐ ┌─────────────────────────┐│
 * │  │ MCP Registry │ │ Workflow Eng │ │ Smart Ops (健康/诊断)   ││
 * │  └──────┬───────┘ └──────┬───────┘ └────────────┬────────────┘│
 * │         │                │                      │             │
 * │  ┌──────▼────────────────▼──────────────────────▼────────────┐│
 * │  │              DevOpsService (业务逻辑层)                    ││
 * │  └──────┬────────────────────────────────────────────────────┘│
 * │         │                                                     │
 * │  ┌──────▼────────────────────────────────────────────────────┐│
 * │  │              useDevOps Hook (React 状态桥)                 ││
 * │  └───────────────────────────────────────────────────────────┘│
 * └─────────────────────────────────────────────────────────────────┘
 */

/* ══════════════════════════════════════════════════════════════════
 *  MCP 服务器注册 / MCP Server Registry
 * ══════════════════════════════════════════════════════════════════ */

/**
 * MCP 服务器连接状态
 * MCP Server connection status
 */
export type MCPServerStatus = "connected" | "disconnected" | "error" | "probing";

/**
 * MCP 服务器传输协议
 * MCP Server transport protocol
 */
export type MCPTransport = "stdio" | "http" | "sse" | "websocket";

/**
 * MCP 工具参数定义
 * MCP Tool parameter definition
 */
export interface MCPToolParam {
  /** 参数名 / Parameter name */
  name: string;
  /** 参数类型 / Parameter type */
  type: "string" | "number" | "boolean" | "object" | "array";
  /** 是否必填 / Is required */
  required: boolean;
  /** 参数描述 / Parameter description */
  description: string;
  /** 默认值 / Default value */
  defaultValue?: string | number | boolean;
}

/**
 * MCP 工具定义
 * MCP Tool definition
 */
export interface MCPTool {
  /** 工具唯一标识 / Tool unique identifier */
  id: string;
  /** 工具名称 / Tool name */
  name: string;
  /** 工具描述 / Tool description */
  description: string;
  /** 工具分类 / Tool category */
  category: "database" | "git" | "docker" | "testing" | "monitoring" | "filesystem" | "security" | "custom";
  /** 参数列表 / Parameter list */
  params: MCPToolParam[];
  /** 是否危险操作 / Is dangerous operation */
  isDangerous: boolean;
  /** 需要确认 / Requires confirmation */
  requiresConfirmation: boolean;
  /** 预计执行时间 (ms) / Estimated execution time */
  estimatedDuration: number;
}

/**
 * MCP 工具执行结果
 * MCP Tool execution result
 */
export interface MCPToolResult {
  /** 工具 ID / Tool ID */
  toolId: string;
  /** 执行是否成功 / Execution success */
  success: boolean;
  /** 返回数据 / Return data */
  output: string;
  /** 错误信息 / Error message */
  error: string | null;
  /** 执行耗时 (ms) / Execution duration */
  duration: number;
  /** 执行时间戳 / Execution timestamp */
  timestamp: string;
}

/**
 * MCP 服务器定义
 * MCP Server definition
 */
export interface MCPServer {
  /** 服务器唯一标识 / Server unique identifier */
  id: string;
  /** 服务器显示名称 / Server display name */
  name: string;
  /** 服务器描述 / Server description */
  description: string;
  /** 连接状态 / Connection status */
  status: MCPServerStatus;
  /** 传输协议 / Transport protocol */
  transport: MCPTransport;
  /** 端点 URL / Endpoint URL */
  endpoint: string;
  /** 延迟 (ms) / Latency (ms) */
  latency: number;
  /** 提供的工具列表 / Provided tools */
  tools: MCPTool[];
  /** 最后心跳时间 / Last heartbeat timestamp */
  lastHeartbeat: string | null;
  /** 是否为内置服务器 / Is built-in server */
  isBuiltIn: boolean;
  /** 自动连接 / Auto-connect on startup */
  autoConnect: boolean;
  /** 服务器版本 / Server version */
  version: string;
}

/* ══════════════════════════════════════════════════════════════════
 *  工作流引擎 / Workflow Engine
 * ══════════════════════════════════════════════════════════════════ */

/**
 * 工作流触发器类型
 * Workflow trigger type
 */
export type WorkflowTriggerType =
  | "manual"          // 手动触发 / Manual trigger
  | "schedule"        // 定时调度 / Scheduled
  | "webhook"         // Webhook 回调 / Webhook callback
  | "file_change"     // 文件变更 / File change
  | "git_push"        // Git 推送 / Git push
  | "health_alert"    // 健康告警 / Health alert
  | "on_connect"      // 连接时 / On connect
  | "on_disconnect";  // 断开时 / On disconnect

/**
 * 工作流步骤类型
 * Workflow step type
 */
export type WorkflowStepType =
  | "mcp_tool"        // 执行 MCP 工具 / Execute MCP tool
  | "condition"       // 条件判断 / Conditional branch
  | "parallel"        // 并行执行 / Parallel execution
  | "delay"           // 延时等待 / Delay wait
  | "notification"    // 发送通知 / Send notification
  | "script"          // 自定义脚本 / Custom script
  | "approval"        // 人工审批 / Manual approval
  | "loop";           // 循环执行 / Loop execution

/**
 * 工作流步骤执行状态
 * Workflow step execution status
 */
export type StepExecutionStatus = "pending" | "running" | "success" | "failed" | "skipped" | "waiting";

/**
 * 工作流触发器配置
 * Workflow trigger configuration
 */
export interface WorkflowTrigger {
  /** 触发器类型 / Trigger type */
  type: WorkflowTriggerType;
  /** 触发器配置 / Trigger configuration */
  config: Record<string, string | number | boolean>;
  /** 是否启用 / Is enabled */
  enabled: boolean;
}

/**
 * 工作流步骤定义
 * Workflow step definition
 */
export interface WorkflowStep {
  /** 步骤唯一标识 / Step unique identifier */
  id: string;
  /** 步骤名称 / Step name */
  name: string;
  /** 步骤类型 / Step type */
  type: WorkflowStepType;
  /** 引用的 MCP 工具 ID / Referenced MCP tool ID */
  toolId: string | null;
  /** 步骤配置参数 / Step configuration parameters */
  config: Record<string, string | number | boolean>;
  /** 失败时操作 / On failure action */
  onFailure: "stop" | "continue" | "retry";
  /** 重试次数 / Retry count */
  retryCount: number;
  /** 超时 (ms) / Timeout (ms) */
  timeout: number;
  /** 条件表达式 / Condition expression (for condition type) */
  condition: string | null;
  /** 执行状态 / Execution status */
  executionStatus: StepExecutionStatus;
  /** 执行输出 / Execution output */
  executionOutput: string | null;
  /** 执行耗时 / Execution duration */
  executionDuration: number;
  /** 步骤排序 / Step order */
  order: number;
}

/**
 * 工作流执行状态
 * Workflow execution status
 */
export type WorkflowExecutionStatus = "idle" | "running" | "completed" | "failed" | "cancelled";

/**
 * 工作流定义
 * Workflow definition
 */
export interface Workflow {
  /** 工作流唯一标识 / Workflow unique identifier */
  id: string;
  /** 工作流名称 / Workflow name */
  name: string;
  /** 工作流描述 / Workflow description */
  description: string;
  /** 工作流分类 / Workflow category */
  category: "devops" | "testing" | "deployment" | "monitoring" | "security" | "data" | "custom";
  /** 触发器 / Trigger */
  trigger: WorkflowTrigger;
  /** 步骤列表 / Steps list */
  steps: WorkflowStep[];
  /** 是否启用 / Is enabled */
  enabled: boolean;
  /** 执行状态 / Execution status */
  executionStatus: WorkflowExecutionStatus;
  /** 上次执行时间 / Last execution timestamp */
  lastExecutedAt: string | null;
  /** 上次执行耗时 (ms) / Last execution duration */
  lastDuration: number;
  /** 总执行次数 / Total execution count */
  executionCount: number;
  /** 成功次数 / Success count */
  successCount: number;
  /** 创建时间 / Created timestamp */
  createdAt: string;
  /** 更新时间 / Updated timestamp */
  updatedAt: string;
  /** 是否为内置工作流 / Is built-in workflow */
  isBuiltIn: boolean;
}

/**
 * 工作流执行日志条目
 * Workflow execution log entry
 */
export interface WorkflowLogEntry {
  /** 日志 ID / Log ID */
  id: string;
  /** 工作流 ID / Workflow ID */
  workflowId: string;
  /** 步骤 ID / Step ID */
  stepId: string | null;
  /** 日志级别 / Log level */
  level: "info" | "warn" | "error" | "debug";
  /** 日志消息 / Log message */
  message: string;
  /** 时间戳 / Timestamp */
  timestamp: string;
}

/* ══════════════════════════════════════════════════════════════════
 *  智能运维 / Intelligent Operations
 * ══════════════════════════════════════════════════════════════════ */

/**
 * 服务健康状态
 * Service health status
 */
export type ServiceHealthStatus = "healthy" | "degraded" | "down" | "unknown";

/**
 * 基础服务定义（全栈健康聚合）
 * Infrastructure service definition (full-stack health aggregation)
 */
export interface InfraService {
  /** 服务 ID / Service ID */
  id: string;
  /** 服务名称 / Service name */
  name: string;
  /** 服务类型 / Service type */
  type: "database" | "proxy" | "frontend" | "docker" | "mcp" | "external";
  /** 端点 URL / Endpoint URL */
  endpoint: string;
  /** 健康状态 / Health status */
  health: ServiceHealthStatus;
  /** 延迟 (ms) / Latency (ms) */
  latency: number;
  /** 最后检查时间 / Last check timestamp */
  lastCheckAt: string;
  /** 连续健康次数 / Consecutive healthy count */
  consecutiveHealthy: number;
  /** 连续失败次数 / Consecutive failure count */
  consecutiveFailures: number;
  /** 正常运行时间百分比 / Uptime percentage */
  uptimePercent: number;
}

/**
 * 诊断问题严重级别
 * Diagnostic issue severity level
 */
export type IssueSeverity = "critical" | "warning" | "info" | "suggestion";

/**
 * 智能诊断问题
 * Smart diagnostic issue
 */
export interface DiagnosticIssue {
  /** 问题 ID / Issue ID */
  id: string;
  /** 问题标题 / Issue title */
  title: string;
  /** 问题描述 / Issue description */
  description: string;
  /** 严重级别 / Severity level */
  severity: IssueSeverity;
  /** 来源服务 / Source service */
  source: string;
  /** 修复建议 / Fix suggestion */
  suggestion: string;
  /** 自动修复命令 / Auto-fix command (if available) */
  autoFixCommand: string | null;
  /** 是否可自动修复 / Is auto-fixable */
  isAutoFixable: boolean;
  /** 检测时间 / Detection timestamp */
  detectedAt: string;
  /** 是否已解决 / Is resolved */
  resolved: boolean;
}

/**
 * 操作日志条目
 * Operations log entry
 */
export interface OpsLogEntry {
  /** 日志 ID / Log ID */
  id: string;
  /** 操作来源 / Operation source */
  source: "mcp" | "workflow" | "health" | "user" | "system";
  /** 日志级别 / Log level */
  level: "info" | "warn" | "error" | "success" | "debug";
  /** 消息 / Message */
  message: string;
  /** 详细数据 / Detail data */
  detail: string | null;
  /** 时间戳 / Timestamp */
  timestamp: string;
}

/**
 * DevOps 仪表盘指标
 * DevOps dashboard metrics
 */
export interface DevOpsMetrics {
  /** 服务健康总数 / Total services */
  totalServices: number;
  /** 健康服务数 / Healthy services count */
  healthyServices: number;
  /** 降级服务数 / Degraded services count */
  degradedServices: number;
  /** 宕机服务数 / Down services count */
  downServices: number;
  /** 已注册 MCP 工具数 / Registered MCP tools count */
  registeredTools: number;
  /** 活跃工作流数 / Active workflows count */
  activeWorkflows: number;
  /** 今日执行次数 / Today's execution count */
  todayExecutions: number;
  /** 今日成功率 / Today's success rate (0-100) */
  todaySuccessRate: number;
  /** 未解决问题数 / Unresolved issues count */
  unresolvedIssues: number;
  /** 平均延迟 (ms) / Average latency (ms) */
  avgLatency: number;
}

/* ══════════════════════════════════════════════════════════════════
 *  工作流 CRUD 输入 / Workflow CRUD Input
 * ══════════════════════════════════════════════════════════════════ */

/**
 * 工作流创建输入
 * Workflow create input
 */
export interface WorkflowCreateInput {
  /** 工作流名称 / Workflow name */
  name: string;
  /** 工作流描述 / Workflow description */
  description: string;
  /** 工作流分类 / Workflow category */
  category: Workflow["category"];
  /** 触发器 / Trigger */
  trigger: WorkflowTrigger;
  /** 步骤定义列表 / Step definitions */
  steps: WorkflowStepInput[];
}

/**
 * 工作流步骤创建输入
 * Workflow step create input
 */
export interface WorkflowStepInput {
  /** 步骤名称 / Step name */
  name: string;
  /** 步骤类型 / Step type */
  type: WorkflowStepType;
  /** 引用的 MCP 工具 ID / Referenced MCP tool ID */
  toolId: string | null;
  /** 步骤配置参数 / Step configuration */
  config: Record<string, string | number | boolean>;
  /** 失败时操作 / On failure action */
  onFailure: "stop" | "continue" | "retry";
  /** 超时 (ms) / Timeout (ms) */
  timeout: number;
}

/**
 * 工作流更新输入（部分更新）
 * Workflow update input (partial update)
 */
export interface WorkflowUpdateInput {
  /** 工作流名称 / Workflow name */
  name?: string;
  /** 工作流描述 / Workflow description */
  description?: string;
  /** 工作流分类 / Workflow category */
  category?: Workflow["category"];
  /** 触发器 / Trigger */
  trigger?: WorkflowTrigger;
  /** 步骤定义列表 / Step definitions (full replace) */
  steps?: WorkflowStepInput[];
  /** 是否启用 / Is enabled */
  enabled?: boolean;
}

/* ══════════════════════════════════════════════════════════════════
 *  WebSocket 实时通道 / WebSocket Real-time Channel
 * ══════════════════════════════════════════════════════════════════ */

/**
 * WebSocket 连接状态
 * WebSocket connection status
 */
export type WSConnectionStatus = "disconnected" | "connecting" | "connected" | "error" | "reconnecting";

/**
 * WebSocket 消息类型
 * WebSocket message type
 */
export type WSMessageType =
  | "log"             // 日志推送 / Log push
  | "health_update"   // 健康变更 / Health update
  | "workflow_event"  // 工作流事件 / Workflow event
  | "tool_output"     // 工具输出流 / Tool output stream
  | "heartbeat"       // 心跳 / Heartbeat
  | "command"         // 指令下发 / Command dispatch
  | "ack";            // 确认 / Acknowledgement

/**
 * WebSocket 消息结构
 * WebSocket message structure
 */
export interface WSMessage {
  /** 消息类型 / Message type */
  type: WSMessageType;
  /** 消息载荷 / Message payload */
  payload: Record<string, unknown>;
  /** 时间戳 / Timestamp */
  timestamp: string;
  /** 消息 ID / Message ID */
  id: string;
}

/**
 * WebSocket 通道配置
 * WebSocket channel configuration
 */
export interface WSChannelConfig {
  /** WebSocket 端点 URL / WebSocket endpoint URL */
  url: string;
  /** 自动重连 / Auto-reconnect */
  autoReconnect: boolean;
  /** 重连间隔 (ms) / Reconnect interval (ms) */
  reconnectInterval: number;
  /** 最大重连次数 / Max reconnect attempts */
  maxReconnectAttempts: number;
  /** 心跳间隔 (ms) / Heartbeat interval (ms) */
  heartbeatInterval: number;
  /** 连接超时 (ms) / Connection timeout (ms) */
  connectTimeout: number;
}