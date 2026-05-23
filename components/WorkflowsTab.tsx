/**
 * 工作流 Tab 面板 - 从 SettingsModal 中提取的完整工作流管理界面
 * Workflows Tab Panel - Full workflow management UI extracted from SettingsModal
 *
 * @module components/WorkflowsTab
 * @version 0.9.4
 */

import { useState } from "react";
import { Workflow as WorkflowIcon, AlertCircle, Terminal, Command } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { WorkflowEditor } from "./WorkflowCRUD";
import { WorkflowActions } from "./WorkflowActions";
import type { UseDevOpsReturn } from "../hooks/useDevOps";

/* ══════════════════════════════════════════════════════════════════
 *  Props
 * ══════════════════════════════════════════════════════════════════ */

interface WorkflowsTabProps {
  /** DevOps hook 返回值 / DevOps hook return value */
  devOps: UseDevOpsReturn;
}

/* ══════════════════════════════════════════════════════════════════
 *  组件 / Component
 * ══════════════════════════════════════════════════════════════════ */

/**
 * 工作流管理面板 / Workflow management panel
 */
export function WorkflowsTab({ devOps }: WorkflowsTabProps) {
  const [showWorkflowEditor, setShowWorkflowEditor] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<(typeof devOps.workflows)[number] | undefined>(undefined);

  /** 获取可用 MCP 工具列表 / Get available MCP tools list */
  const availableTools = devOps.servers.flatMap(s =>
    s.tools.map(t => ({ id: t.id, name: t.name, serverName: s.name }))
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 工作流引擎状态横幅 / Workflow Engine Status Banner */}
      <div className="p-4 bg-green-500/5 border border-green-500/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <WorkflowIcon className="h-5 w-5 text-green-500" />
          <div>
            <h3 className="text-sm font-bold text-green-500 uppercase tracking-wide">WORKFLOW ENGINE</h3>
            <p className="text-[10px] text-green-500/40 uppercase tracking-widest mt-0.5">
              {devOps.workflows.filter(w => w.enabled).length} ACTIVE · {devOps.workflows.reduce((s, w) => s + w.executionCount, 0)} TOTAL RUNS · {devOps.metrics.todaySuccessRate}% SUCCESS
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setEditingWorkflow(undefined);
              setShowWorkflowEditor(true);
            }}
            className="bg-green-500 text-black hover:bg-green-400 font-bold text-xs uppercase tracking-widest rounded-none h-7"
          >
            + NEW_FLOW
          </Button>
          <Button
            onClick={() => {
              devOps.runDiagnostics();
              toast.info(`DIAGNOSTICS: ${devOps.diagnosticIssues.length} issue(s) found`);
            }}
            variant="ghost"
            size="sm"
            className="text-green-500/50 hover:text-green-500 text-xs rounded-none border border-green-500/20 h-7"
          >
            <AlertCircle className="h-3 w-3 mr-1" />
            DIAGNOSE
          </Button>
        </div>
      </div>

      {/* 工作流列表 / Workflow List */}
      <div className="space-y-3">
        {devOps.workflows.map((flow) => {
          const isExecuting = devOps.executingWorkflowId === flow.id;
          const statusColors: Record<string, string> = {
            idle: "border-green-500/20",
            running: "border-yellow-500/50 bg-yellow-500/5",
            completed: "border-green-500/40",
            failed: "border-red-500/40 bg-red-500/5",
            cancelled: "border-green-500/15",
          };

          return (
            <div key={flow.id} className={`border bg-black transition-all ${statusColors[flow.executionStatus] ?? "border-green-500/20"}`}>
              {/* 工作流头部 / Workflow Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => devOps.toggleWorkflow(flow.id)}
                    className={`p-2 border transition-all ${flow.enabled ? "border-green-500 bg-green-500/10" : "border-green-500/30 bg-transparent hover:border-green-500"}`}
                  >
                    <Command className={`h-4 w-4 ${flow.enabled ? "text-green-500" : "text-green-500/50"}`} />
                  </button>
                  <div>
                    <h4 className="text-sm font-bold text-green-500 font-mono">{flow.name}</h4>
                    <p className="text-[10px] text-green-500/40 uppercase tracking-widest">
                      {flow.steps.length} STEPS · {flow.trigger.type.toUpperCase().replace("_", " ")} · {flow.category.toUpperCase()}
                      {flow.executionCount > 0 && ` · ${flow.successCount}/${flow.executionCount} OK`}
                    </p>
                    {flow.description && (
                      <p className="text-[10px] text-green-500/25 mt-1 max-w-md truncate">{flow.description}</p>
                    )}
                  </div>
                </div>
                {/* WorkflowActions 组件替代内联按钮 / WorkflowActions replaces inline buttons */}
                <WorkflowActions
                  flow={flow}
                  isExecuting={isExecuting}
                  onExecute={async () => {
                    toast.info(`RUNNING: ${flow.name}...`);
                    const ok = await devOps.executeWorkflow(flow.id);
                    if (ok) toast.success(`WORKFLOW_COMPLETED: ${flow.name}`);
                    else toast.error(`WORKFLOW_FAILED: ${flow.name}`);
                  }}
                  onReset={() => devOps.resetWorkflow(flow.id)}
                  onDelete={() => devOps.deleteWorkflow(flow.id)}
                  onEdit={() => {
                    setEditingWorkflow(flow);
                    setShowWorkflowEditor(true);
                  }}
                />
              </div>

              {/* 步骤进度条 / Step Progress Bar */}
              {(flow.executionStatus === "running" || flow.executionStatus === "completed" || flow.executionStatus === "failed") && (
                <div className="px-4 pb-3">
                  <div className="flex gap-1">
                    {flow.steps.map((step) => {
                      const stepColors: Record<string, string> = {
                        pending: "bg-green-500/10",
                        running: "bg-yellow-500 animate-pulse",
                        success: "bg-green-500",
                        failed: "bg-red-500",
                        skipped: "bg-green-500/5",
                        waiting: "bg-yellow-500/30",
                      };
                      return (
                        <div
                          key={step.id}
                          className={`flex-1 h-1.5 ${stepColors[step.executionStatus] ?? "bg-green-500/10"} transition-all`}
                          title={`${step.name}: ${step.executionStatus.toUpperCase()} ${step.executionDuration > 0 ? `(${step.executionDuration}ms)` : ""}`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <p className="text-[9px] text-green-500/30 font-mono">
                      {flow.steps.filter(s => s.executionStatus === "success").length}/{flow.steps.length} STEPS
                    </p>
                    {flow.lastDuration > 0 && (
                      <p className="text-[9px] text-green-500/30 font-mono">{flow.lastDuration}ms</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 诊断问题 / Diagnostic Issues */}
      {devOps.diagnosticIssues.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-yellow-500/70 uppercase tracking-widest flex items-center gap-2">
            <AlertCircle className="h-3 w-3" />
            DIAGNOSTIC_ISSUES ({devOps.diagnosticIssues.length})
          </h3>
          {devOps.diagnosticIssues.slice(0, 5).map(issue => (
            <div key={issue.id} className={`p-3 border flex items-start gap-3 ${
              issue.severity === "critical" ? "border-red-500/40 bg-red-500/5" :
              issue.severity === "warning" ? "border-yellow-500/30 bg-yellow-500/5" :
              "border-green-500/15 bg-green-500/5"
            }`}>
              <AlertCircle className={`h-3 w-3 shrink-0 mt-0.5 ${
                issue.severity === "critical" ? "text-red-500" :
                issue.severity === "warning" ? "text-yellow-500" :
                "text-green-500/50"
              }`} />
              <div className="min-w-0">
                <p className="text-xs font-bold text-green-500 font-mono truncate">{issue.title}</p>
                <p className="text-[10px] text-green-500/40 mt-0.5">{issue.suggestion}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 操作日志 / Operations Log */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-green-500/50 uppercase tracking-widest flex items-center gap-2">
            <Terminal className="h-3 w-3" />
            OPS_LOG
          </h3>
          <div className="flex gap-1">
            <Button onClick={devOps.refreshLog} variant="ghost" size="sm" className="text-green-500/30 hover:text-green-500 text-[10px] h-5 rounded-none px-1.5">
              REFRESH
            </Button>
            <Button onClick={devOps.clearLog} variant="ghost" size="sm" className="text-green-500/30 hover:text-red-500 text-[10px] h-5 rounded-none px-1.5">
              CLEAR
            </Button>
          </div>
        </div>
        <div className="border border-green-500/10 bg-black max-h-[180px] overflow-y-auto">
          {devOps.opsLog.slice(0, 30).map(entry => {
            const levelColors: Record<string, string> = {
              info: "text-green-500/50",
              warn: "text-yellow-500/70",
              error: "text-red-500/70",
              success: "text-green-500",
              debug: "text-green-500/25",
            };
            return (
              <div key={entry.id} className="px-3 py-1 border-b border-green-500/5 flex items-start gap-2">
                <span className="text-[9px] text-green-500/20 font-mono shrink-0 w-16 mt-px">
                  {new Date(entry.timestamp).toLocaleTimeString("en-US", { hour12: false })}
                </span>
                <span className={`text-[10px] font-mono ${levelColors[entry.level] ?? "text-green-500/30"}`}>
                  {entry.message}
                </span>
              </div>
            );
          })}
          {devOps.opsLog.length === 0 && (
            <p className="p-4 text-center text-[10px] text-green-500/20 uppercase tracking-widest">NO_LOG_ENTRIES</p>
          )}
        </div>
      </div>

      {/* WorkflowEditor Modal */}
      {showWorkflowEditor && (
        <WorkflowEditor
          workflow={editingWorkflow}
          availableTools={availableTools}
          onCreate={(input) => devOps.createWorkflow(input)}
          onUpdate={(id, input) => devOps.updateWorkflow(id, input)}
          onClose={() => {
            setShowWorkflowEditor(false);
            setEditingWorkflow(undefined);
          }}
        />
      )}
    </div>
  );
}
