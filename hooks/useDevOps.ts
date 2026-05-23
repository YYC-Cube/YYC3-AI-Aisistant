/**
 * @file DevOps 智能运维 Hook - MCP + 工作流 + 健康监控 React 状态桥
 * @description 提供 React 组件层面的 DevOps 状态管理，桥接 DevOpsService 层
 * @module hooks/useDevOps
 * @version 0.9.4
 * @since Personalize
 *
 * DevOps Intelligent Operations Hook
 * Provides React component-level DevOps state management, bridging DevOpsService layer
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { devOpsService } from "../services/DevOpsService";
import type {
  MCPServer,
  MCPToolResult,
  Workflow,
  InfraService,
  DiagnosticIssue,
  OpsLogEntry,
  DevOpsMetrics,
  WorkflowCreateInput,
  WorkflowUpdateInput,
  WSConnectionStatus,
} from "../types/devops";

/* ──────────────────── Hook 返回类型 / Hook Return Type ──────────────────── */

/**
 * useDevOps Hook 返回值
 * useDevOps Hook return value
 */
export interface UseDevOpsReturn {
  /* ── MCP 服务器 / MCP Servers ── */
  /** MCP 服务器列表 / MCP server list */
  servers: MCPServer[];
  /** 探测指定服务器 / Probe specific server */
  probeServer: (serverId: string) => Promise<boolean>;
  /** 探测全部自动连接服务器 / Probe all auto-connect servers */
  probeAllServers: () => Promise<number>;
  /** 断开服务器 / Disconnect server */
  disconnectServer: (serverId: string) => void;
  /** 切换自动连接 / Toggle auto-connect */
  toggleAutoConnect: (serverId: string) => void;
  /** 执行 MCP 工具 / Execute MCP tool */
  executeTool: (serverId: string, toolId: string, params?: Record<string, string | number | boolean>) => Promise<MCPToolResult>;
  /** 最后工具执行结果 / Last tool execution result */
  lastToolResult: MCPToolResult | null;
  /** 工具执行中 / Tool executing */
  isToolExecuting: boolean;

  /* ── 工作流 / Workflows ── */
  /** 工作流列表 / Workflow list */
  workflows: Workflow[];
  /** 执行工作流 / Execute workflow */
  executeWorkflow: (workflowId: string) => Promise<boolean>;
  /** 切换工作流启用 / Toggle workflow enabled */
  toggleWorkflow: (workflowId: string) => void;
  /** 重置工作流状态 / Reset workflow state */
  resetWorkflow: (workflowId: string) => void;
  /** 工作流执行中 / Workflow executing */
  isWorkflowExecuting: boolean;
  /** 当前执行的工作流 ID / Currently executing workflow ID */
  executingWorkflowId: string | null;

  /* ── 健康监控 / Health Monitoring ── */
  /** 基础服务列表 / Infrastructure services */
  infraServices: InfraService[];
  /** 执行全栈健康扫描 / Execute full-stack health scan */
  scanHealth: () => Promise<void>;
  /** 是否正在扫描 / Is scanning */
  isScanning: boolean;

  /* ── 智能诊断 / Diagnostics ── */
  /** 诊断问题列表 / Diagnostic issues */
  diagnosticIssues: DiagnosticIssue[];
  /** 执行诊断 / Run diagnostics */
  runDiagnostics: () => void;

  /* ── 指标与日志 / Metrics & Logs ── */
  /** 仪表盘指标 / Dashboard metrics */
  metrics: DevOpsMetrics;
  /** 操作日志 / Operations log */
  opsLog: OpsLogEntry[];
  /** 刷新日志 / Refresh log */
  refreshLog: () => void;
  /** 清空日志 / Clear log */
  clearLog: () => void;

  /* ── 工作流 CRUD / Workflow CRUD ── */
  /** 创建工作流 / Create workflow */
  createWorkflow: (input: WorkflowCreateInput) => Workflow;
  /** 更新工作流 / Update workflow */
  updateWorkflow: (id: string, input: WorkflowUpdateInput) => Workflow | null;
  /** 删除工作流 / Delete workflow */
  deleteWorkflow: (id: string) => boolean;

  /* ── WebSocket / WebSocket ── */
  /** WS 连接状态 / WS connection status */
  wsStatus: WSConnectionStatus;
  /** 连接 WS / Connect WS */
  connectWS: () => void;
  /** 断开 WS / Disconnect WS */
  disconnectWS: () => void;

  /* ── 全局 / Global ── */
  /** 刷新全部状态 / Refresh all state */
  refreshAll: () => void;
}

/* ──────────────────── Hook 实现 / Hook Implementation ──────────────────── */

/**
 * DevOps 智能运维 Hook
 * DevOps Intelligent Operations Hook
 *
 * 提供完整的 DevOps 生命周期管理：
 * - MCP 服务器注册、探测、工具执行
 * - 工作流定义、执行、监控
 * - 全栈健康聚合
 * - 智能诊断与问题检测
 * - 操作日志与仪表盘指标
 *
 * @returns {UseDevOpsReturn} Hook 返回值 / Hook return value
 */
export function useDevOps(): UseDevOpsReturn {
  /* ── 状态 / State ── */
  const [servers, setServers] = useState<MCPServer[]>(devOpsService.getServers());
  const [workflows, setWorkflows] = useState<Workflow[]>(devOpsService.getWorkflows());
  const [infraServices, setInfraServices] = useState<InfraService[]>(devOpsService.getInfraServices());
  const [diagnosticIssues, setDiagnosticIssues] = useState<DiagnosticIssue[]>([]);
  const [opsLog, setOpsLog] = useState<OpsLogEntry[]>(devOpsService.getOpsLog());
  const [metrics, setMetrics] = useState<DevOpsMetrics>(devOpsService.getMetrics());
  const [lastToolResult, setLastToolResult] = useState<MCPToolResult | null>(null);
  const [isToolExecuting, setIsToolExecuting] = useState(false);
  const [isWorkflowExecuting, setIsWorkflowExecuting] = useState(false);
  const [executingWorkflowId, setExecutingWorkflowId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [wsStatus, setWsStatus] = useState<WSConnectionStatus>(devOpsService.getWsStatus());

  /** 防止 stale closure / Prevent stale closure */
  const mountedRef = useRef(true);

  /* ── 状态刷新 / State Refresh ── */
  const refreshAll = useCallback(() => {
    if (!mountedRef.current) return;
    setServers(devOpsService.getServers());
    setWorkflows(devOpsService.getWorkflows());
    setInfraServices(devOpsService.getInfraServices());
    setOpsLog(devOpsService.getOpsLog());
    setMetrics(devOpsService.getMetrics());
    setWsStatus(devOpsService.getWsStatus());
  }, []);

  /** 订阅 Service 层状态变更 / Subscribe to Service layer changes */
  useEffect(() => {
    const unsubscribe = devOpsService.subscribe(refreshAll);
    return () => {
      unsubscribe();
      mountedRef.current = false;
    };
  }, [refreshAll]);

  /* ── MCP 服务器操作 / MCP Server Operations ── */

  const probeServer = useCallback(async (serverId: string): Promise<boolean> => {
    const result = await devOpsService.probeServer(serverId);
    refreshAll();
    return result;
  }, [refreshAll]);

  const probeAllServers = useCallback(async (): Promise<number> => {
    const count = await devOpsService.probeAllServers();
    refreshAll();
    return count;
  }, [refreshAll]);

  const disconnectServer = useCallback((serverId: string) => {
    devOpsService.disconnectServer(serverId);
    refreshAll();
  }, [refreshAll]);

  const toggleAutoConnect = useCallback((serverId: string) => {
    devOpsService.toggleAutoConnect(serverId);
    refreshAll();
  }, [refreshAll]);

  const executeTool = useCallback(async (
    serverId: string,
    toolId: string,
    params?: Record<string, string | number | boolean>
  ): Promise<MCPToolResult> => {
    setIsToolExecuting(true);
    try {
      const result = await devOpsService.executeTool(serverId, toolId, params);
      setLastToolResult(result);
      refreshAll();
      return result;
    } finally {
      setIsToolExecuting(false);
    }
  }, [refreshAll]);

  /* ── 工作流操作 / Workflow Operations ── */

  const executeWorkflow = useCallback(async (workflowId: string): Promise<boolean> => {
    setIsWorkflowExecuting(true);
    setExecutingWorkflowId(workflowId);
    try {
      const result = await devOpsService.executeWorkflow(workflowId);
      refreshAll();
      return result;
    } finally {
      setIsWorkflowExecuting(false);
      setExecutingWorkflowId(null);
    }
  }, [refreshAll]);

  const toggleWorkflow = useCallback((workflowId: string) => {
    devOpsService.toggleWorkflow(workflowId);
    refreshAll();
  }, [refreshAll]);

  const resetWorkflow = useCallback((workflowId: string) => {
    devOpsService.resetWorkflow(workflowId);
    refreshAll();
  }, [refreshAll]);

  /* ── 健康扫描 / Health Scanning ── */

  const scanHealth = useCallback(async () => {
    setIsScanning(true);
    try {
      await devOpsService.scanHealth();
      refreshAll();
    } finally {
      setIsScanning(false);
    }
  }, [refreshAll]);

  /* ── 诊断 / Diagnostics ── */

  const runDiagnostics = useCallback(() => {
    const issues = devOpsService.runDiagnostics();
    setDiagnosticIssues(issues);
  }, []);

  /* ── 日志 / Logs ── */

  const refreshLog = useCallback(() => {
    setOpsLog(devOpsService.getOpsLog());
  }, []);

  const clearLog = useCallback(() => {
    devOpsService.clearOpsLog();
    setOpsLog([]);
  }, []);

  /* ── 工作流 CRUD / Workflow CRUD ── */

  const createWorkflow = useCallback((input: WorkflowCreateInput) => {
    const workflow = devOpsService.createWorkflow(input);
    refreshAll();
    return workflow;
  }, [refreshAll]);

  const updateWorkflow = useCallback((id: string, input: WorkflowUpdateInput) => {
    const workflow = devOpsService.updateWorkflow(id, input);
    refreshAll();
    return workflow;
  }, [refreshAll]);

  const deleteWorkflow = useCallback((id: string) => {
    const result = devOpsService.deleteWorkflow(id);
    refreshAll();
    return result;
  }, [refreshAll]);

  /* ── WebSocket / WebSocket ── */

  const connectWS = useCallback(() => {
    devOpsService.connectWS();
    refreshAll();
  }, [refreshAll]);

  const disconnectWS = useCallback(() => {
    devOpsService.disconnectWS();
    refreshAll();
  }, [refreshAll]);

  return {
    servers,
    probeServer,
    probeAllServers,
    disconnectServer,
    toggleAutoConnect,
    executeTool,
    lastToolResult,
    isToolExecuting,

    workflows,
    executeWorkflow,
    toggleWorkflow,
    resetWorkflow,
    isWorkflowExecuting,
    executingWorkflowId,

    infraServices,
    scanHealth,
    isScanning,

    diagnosticIssues,
    runDiagnostics,

    metrics,
    opsLog,
    refreshLog,
    clearLog,

    createWorkflow,
    updateWorkflow,
    deleteWorkflow,

    wsStatus,
    connectWS,
    disconnectWS,

    refreshAll,
  };
}