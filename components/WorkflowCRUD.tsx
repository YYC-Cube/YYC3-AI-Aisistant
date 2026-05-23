/**
 * 工作流 CRUD 组件 - 创建 / 编辑 / 删除自定义工作流
 * Workflow CRUD Component - Create / Edit / Delete custom workflows
 *
 * @module components/WorkflowCRUD
 * @version 0.9.4
 */

import { useState } from "react";
import { X, Plus, Trash2, Save, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";
import type {
  WorkflowCreateInput,
  WorkflowStepInput,
  WorkflowStepType,
  WorkflowTrigger,
  Workflow,
  WorkflowUpdateInput,
} from "../types/devops";

/* ══════════════════════════════════════════════════════════════════
 *  常量 / Constants
 * ══════════════════════════════════════════════════════════════════ */

const STEP_TYPES: { value: WorkflowStepType; label: string }[] = [
  { value: "mcp_tool", label: "MCP TOOL" },
  { value: "script", label: "SCRIPT" },
  { value: "delay", label: "DELAY" },
  { value: "notification", label: "NOTIFICATION" },
  { value: "loop", label: "LOOP" },
  { value: "condition", label: "CONDITION" },
];

const TRIGGER_TYPES: { value: WorkflowTrigger["type"]; label: string }[] = [
  { value: "manual", label: "MANUAL" },
  { value: "schedule", label: "SCHEDULE" },
  { value: "git_push", label: "GIT PUSH" },
  { value: "webhook", label: "WEBHOOK" },
  { value: "on_disconnect", label: "ON DISCONNECT" },
  { value: "on_connect", label: "ON CONNECT" },
  { value: "health_alert", label: "HEALTH ALERT" },
  { value: "file_change", label: "FILE CHANGE" },
];

const CATEGORIES: { value: string; label: string }[] = [
  { value: "deployment", label: "DEPLOYMENT" },
  { value: "monitoring", label: "MONITORING" },
  { value: "data", label: "DATABASE" },
  { value: "security", label: "SECURITY" },
  { value: "devops", label: "DEVOPS" },
  { value: "testing", label: "TESTING" },
  { value: "custom", label: "CUSTOM" },
];

const FAILURE_ACTIONS: { value: "stop" | "continue" | "retry"; label: string }[] = [
  { value: "stop", label: "STOP" },
  { value: "continue", label: "CONTINUE" },
  { value: "retry", label: "RETRY" },
];

/**
 * 创建空步骤输入 / Create empty step input
 */
function createEmptyStep(): WorkflowStepInput {
  return {
    name: "",
    type: "mcp_tool",
    toolId: null,
    config: {},
    onFailure: "stop",
    timeout: 30000,
  };
}

/* ════════���═════════════════════════════════════════════════════════
 *  Props
 * ══════════════════════════════════════════════════════════════════ */

interface WorkflowEditorProps {
  /** 编辑模式下的工作流 / Workflow for edit mode */
  workflow?: Workflow;
  /** 可用 MCP 工具 ID / Available MCP tool IDs */
  availableTools: Array<{ id: string; name: string; serverName: string }>;
  /** 创建回调 / Create callback */
  onCreate?: (input: WorkflowCreateInput) => void;
  /** 更新回调 / Update callback */
  onUpdate?: (id: string, input: WorkflowUpdateInput) => void;
  /** 关闭回调 / Close callback */
  onClose: () => void;
}

/* ══════════════════════════════════════════════════════════════════
 *  组件 / Component
 * ══════════════════════════════════════════════════════════════════ */

/**
 * 工作流编辑器面板 / Workflow editor panel
 */
export function WorkflowEditor({ workflow, availableTools, onCreate, onUpdate, onClose }: WorkflowEditorProps) {
  const isEdit = !!workflow;

  const [name, setName] = useState(workflow?.name ?? "");
  const [description, setDescription] = useState(workflow?.description ?? "");
  const [category, setCategory] = useState(workflow?.category ?? "custom");
  const [triggerType, setTriggerType] = useState<WorkflowTrigger["type"]>(workflow?.trigger.type ?? "manual");
  const [steps, setSteps] = useState<WorkflowStepInput[]>(
    workflow
      ? workflow.steps.map(s => ({
          name: s.name,
          type: s.type,
          toolId: s.toolId,
          config: s.config,
          onFailure: s.onFailure,
          timeout: s.timeout,
        }))
      : [createEmptyStep()]
  );

  /**
   * 添加步骤 / Add step
   */
  const addStep = () => {
    setSteps(prev => [...prev, createEmptyStep()]);
  };

  /**
   * 删除步骤 / Remove step
   */
  const removeStep = (index: number) => {
    setSteps(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * 更新步骤字段 / Update step field
   */
  const updateStep = (index: number, field: keyof WorkflowStepInput, value: unknown) => {
    setSteps(prev =>
      prev.map((s, i) =>
        i === index ? { ...s, [field]: value } : s
      )
    );
  };

  /**
   * 提交 / Submit
   */
  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("NAME_REQUIRED / 工作流名称不能为空");
      return;
    }
    if (steps.length === 0) {
      toast.error("STEPS_REQUIRED / 至少需要一个步骤");
      return;
    }
    const emptySteps = steps.filter(s => !s.name.trim());
    if (emptySteps.length > 0) {
      toast.error("STEP_NAME_REQUIRED / 所有步骤需命名");
      return;
    }

    const trigger: WorkflowTrigger = {
      type: triggerType,
      config: {},
      enabled: true,
    };

    if (isEdit && onUpdate && workflow) {
      onUpdate(workflow.id, {
        name,
        description,
        category: category as Workflow["category"],
        trigger,
        steps,
        enabled: workflow.enabled,
      });
      toast.success(`WORKFLOW_UPDATED: ${name.toUpperCase()}`);
    } else if (onCreate) {
      onCreate({
        name,
        description,
        category: category as Workflow["category"],
        trigger,
        steps,
      });
      toast.success(`WORKFLOW_CREATED: ${name.toUpperCase()}`);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[85vh] border border-green-500/40 bg-black overflow-hidden flex flex-col">
        {/* 标题栏 / Title bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-green-500/30 bg-green-500/5">
          <h2 className="text-sm text-green-500 uppercase tracking-widest font-mono">
            {isEdit ? "EDIT_WORKFLOW" : "NEW_WORKFLOW"}
          </h2>
          <Button onClick={onClose} variant="ghost" size="icon" className="h-7 w-7 text-green-500/50 hover:text-green-500 rounded-none">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 基本信息 / Basic info */}
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-green-500/50 uppercase tracking-widest mb-1">NAME</label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="MY_CUSTOM_WORKFLOW"
                className="bg-black border-green-500/30 text-green-500 font-mono text-xs uppercase rounded-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-[10px] text-green-500/50 uppercase tracking-widest mb-1">DESCRIPTION</label>
              <Input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Workflow description / 工作流描述"
                className="bg-black border-green-500/30 text-green-500 font-mono text-xs rounded-none focus:border-green-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-green-500/50 uppercase tracking-widest mb-1">CATEGORY</label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as typeof category)}
                    className="w-full bg-black border border-green-500/30 text-green-500 font-mono text-xs uppercase py-2 px-3 appearance-none focus:border-green-500 focus:outline-none"
                  >
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-green-500/40 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-green-500/50 uppercase tracking-widest mb-1">TRIGGER</label>
                <div className="relative">
                  <select
                    value={triggerType}
                    onChange={e => setTriggerType(e.target.value as WorkflowTrigger["type"])}
                    className="w-full bg-black border border-green-500/30 text-green-500 font-mono text-xs uppercase py-2 px-3 appearance-none focus:border-green-500 focus:outline-none"
                  >
                    {TRIGGER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-green-500/40 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* 步骤编排 / Steps editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] text-green-500/50 uppercase tracking-widest">STEPS ({steps.length})</label>
              <Button onClick={addStep} variant="ghost" size="sm" className="h-6 text-green-500/50 hover:text-green-500 text-[10px] rounded-none border border-green-500/20">
                <Plus className="h-3 w-3 mr-1" /> ADD_STEP
              </Button>
            </div>
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="border border-green-500/20 bg-green-500/5 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] text-green-500/30 font-mono w-5">#{i + 1}</span>
                    <Input
                      value={step.name}
                      onChange={e => updateStep(i, "name", e.target.value)}
                      placeholder="STEP_NAME"
                      className="flex-1 bg-black border-green-500/20 text-green-500 font-mono text-xs uppercase rounded-none h-7 focus:border-green-500"
                    />
                    <Button onClick={() => removeStep(i)} variant="ghost" size="icon" className="h-7 w-7 text-green-500/30 hover:text-red-500 rounded-none" disabled={steps.length <= 1}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="relative">
                      <select
                        value={step.type}
                        onChange={e => updateStep(i, "type", e.target.value)}
                        className="w-full bg-black border border-green-500/20 text-green-500 font-mono text-[10px] uppercase py-1 px-2 appearance-none focus:border-green-500 focus:outline-none"
                      >
                        {STEP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    {step.type === "mcp_tool" && (
                      <div className="relative">
                        <select
                          value={step.toolId ?? ""}
                          onChange={e => updateStep(i, "toolId", e.target.value || null)}
                          className="w-full bg-black border border-green-500/20 text-green-500 font-mono text-[10px] uppercase py-1 px-2 appearance-none focus:border-green-500 focus:outline-none"
                        >
                          <option value="">-- TOOL --</option>
                          {availableTools.map(t => <option key={t.id} value={t.id}>[{t.serverName}] {t.name}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="relative">
                      <select
                        value={step.onFailure}
                        onChange={e => updateStep(i, "onFailure", e.target.value)}
                        className="w-full bg-black border border-green-500/20 text-green-500 font-mono text-[10px] uppercase py-1 px-2 appearance-none focus:border-green-500 focus:outline-none"
                      >
                        {FAILURE_ACTIONS.map(a => <option key={a.value} value={a.value}>ON_FAIL: {a.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 底部操作栏 / Bottom action bar */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-green-500/30 bg-green-500/5">
          <p className="text-[9px] text-green-500/30 uppercase tracking-widest font-mono">
            {steps.length} STEP{steps.length !== 1 ? "S" : ""} · {triggerType.toUpperCase()} · {category.toUpperCase()}
          </p>
          <div className="flex gap-2">
            <Button onClick={onClose} variant="ghost" className="text-green-500/50 hover:text-green-500 text-xs rounded-none border border-green-500/20 h-8">
              CANCEL
            </Button>
            <Button onClick={handleSubmit} className="bg-green-500 text-black hover:bg-green-400 text-xs uppercase tracking-widest rounded-none h-8">
              <Save className="h-3 w-3 mr-1" />
              {isEdit ? "UPDATE" : "CREATE"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}