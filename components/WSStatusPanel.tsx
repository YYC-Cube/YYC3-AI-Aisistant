/**
 * WebSocket 实时通道状态面板 / WebSocket Real-time Channel Status Panel
 *
 * @module components/WSStatusPanel
 * @version 0.9.4
 */

import { Wifi, WifiOff, RefreshCw, Activity } from "lucide-react";
import { Button } from "./ui/button";
import type { WSConnectionStatus } from "../types/devops";

/* ══════════════════════════════════════════════════════════════════
 *  Props
 * ══════════════════════════════════════════════════════════════════ */

interface WSStatusPanelProps {
  /** WS 连接状态 / WS connection status */
  status: WSConnectionStatus;
  /** 连接 WS / Connect WS */
  onConnect: () => void;
  /** 断开 WS / Disconnect WS */
  onDisconnect: () => void;
}

/* ══════════════════════════════════════════════════════════════════
 *  状态映射 / Status Mapping
 * ══════════════════════════════════════════════════════════════════ */

const STATUS_MAP: Record<WSConnectionStatus, { label: string; color: string; icon: "on" | "off" | "spin" }> = {
  disconnected: { label: "DISCONNECTED", color: "text-green-500/40 border-green-500/20", icon: "off" },
  connecting: { label: "CONNECTING...", color: "text-yellow-500 border-yellow-500/30", icon: "spin" },
  connected: { label: "CONNECTED", color: "text-green-500 border-green-500/40", icon: "on" },
  error: { label: "ERROR", color: "text-red-500 border-red-500/30", icon: "off" },
  reconnecting: { label: "RECONNECTING...", color: "text-yellow-500 border-yellow-500/30", icon: "spin" },
};

/* ══════════════════════════════════════════════════════════════════
 *  组件 / Component
 * ══════════════════════════════════════════════════════════════════ */

/**
 * WS 状态面板 / WS status panel
 */
export function WSStatusPanel({ status, onConnect, onDisconnect }: WSStatusPanelProps) {
  const info = STATUS_MAP[status];

  return (
    <div className={`border bg-black p-3 ${info.color}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-1.5 border ${info.color}`}>
            {info.icon === "on" && <Wifi className="h-4 w-4" />}
            {info.icon === "off" && <WifiOff className="h-4 w-4" />}
            {info.icon === "spin" && <RefreshCw className="h-4 w-4 animate-spin" />}
          </div>
          <div>
            <p className="text-xs font-mono uppercase tracking-widest">WEBSOCKET CHANNEL</p>
            <p className="text-[9px] mt-0.5 uppercase tracking-widest opacity-60">
              {info.label} · ws://localhost:3721/ws
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {(status === "disconnected" || status === "error") && (
            <Button
              onClick={onConnect}
              variant="ghost"
              size="sm"
              className="text-green-500/50 hover:text-green-500 text-[10px] rounded-none border border-green-500/20 h-7 uppercase tracking-widest"
            >
              <Activity className="h-3 w-3 mr-1" />
              CONNECT
            </Button>
          )}
          {(status === "connected" || status === "connecting" || status === "reconnecting") && (
            <Button
              onClick={onDisconnect}
              variant="ghost"
              size="sm"
              className="text-red-500/50 hover:text-red-500 text-[10px] rounded-none border border-red-500/20 h-7 uppercase tracking-widest"
            >
              <WifiOff className="h-3 w-3 mr-1" />
              DISCONNECT
            </Button>
          )}
        </div>
      </div>
      {status === "connected" && (
        <div className="mt-2 pt-2 border-t border-green-500/10">
          <p className="text-[9px] text-green-500/30 uppercase tracking-widest font-mono">
            REAL-TIME LOG PUSH ACTIVE · HEARTBEAT 30S · AUTO-RECONNECT ON
          </p>
        </div>
      )}
    </div>
  );
}
