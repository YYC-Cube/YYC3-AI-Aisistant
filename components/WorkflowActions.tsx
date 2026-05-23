/**
 * 工作流操作按钮栏 - 独立组件避免嵌套编辑
 * Workflow action buttons - isolated component
 *
 * @module components/WorkflowActions
 * @version 0.9.4
 */

import { Play, RotateCw, RotateCcw, Trash2, Edit } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import type { Workflow } from "../types/devops";

interface WorkflowActionsProps {
  /** 工作流 / Workflow */
  flow: Workflow;
  /** 是否执行中 / Is executing */
  isExecuting: boolean;
  /** 执行回调 / Execute callback */
  onExecute: () => void;
  /** 重置回调 / Reset callback */
  onReset: () => void;
  /** 删除回调 / Delete callback */
  onDelete: () => void;
  /** 编辑回调 / Edit callback */
  onEdit: () => void;
}

/**
 * 工作流操作按钮栏 / Workflow action button bar
 */
export function WorkflowActions({ flow, isExecuting, onExecute, onReset, onDelete, onEdit }: WorkflowActionsProps) {
  return (
    <div className="flex items-center gap-1.5">
      {/* 执行 / Execute */}
      <Button
        onClick={onExecute}
        disabled={isExecuting}
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-green-500/50 hover:text-green-500 rounded-none border border-transparent hover:border-green-500/30"
      >
        {isExecuting ? <RotateCw className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
      </Button>
      {/* 重置 / Reset */}
      {flow.executionStatus !== "idle" && (
        <Button
          onClick={onReset}
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-green-500/50 hover:text-yellow-500 rounded-none border border-transparent hover:border-yellow-500/30"
          title="RESET"
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      )}
      {/* 编辑（仅自定义） / Edit (custom only) */}
      {!flow.isBuiltIn && (
        <Button
          onClick={onEdit}
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-green-500/30 hover:text-cyan-400 rounded-none border border-transparent hover:border-cyan-400/30"
          title="EDIT"
        >
          <Edit className="h-3 w-3" />
        </Button>
      )}
      {/* 删除（仅自定义） / Delete (custom only) */}
      {!flow.isBuiltIn && (
        <Button
          onClick={() => {
            if (confirm(`DELETE ${flow.name}?`)) {
              onDelete();
              toast.info(`DELETED: ${flow.name}`);
            }
          }}
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-green-500/30 hover:text-red-500 rounded-none border border-transparent hover:border-red-500/30"
          title="DELETE"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
