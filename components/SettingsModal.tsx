import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  CheckCircle,
  ChevronRight,
  Cpu,
  Database,
  Download,
  Folder,
  GitBranch,
  HardDrive,
  Link2,
  Lock,
  Monitor,
  Network, Package,
  Plus,
  RefreshCw,
  RotateCw,
  Search,
  Server,
  Settings,
  Terminal,
  Trash2,
  Unlink2,
  Unlock,
  Upload,
  User,
  Users,
  Workflow,
  X,
  Zap
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PRESETS, useChannelConfig } from "../hooks/useChannelConfig";
import { useDatabaseConfig } from "../hooks/useDatabaseConfig";
import { useDevOps } from "../hooks/useDevOps";
import { useUISettings } from "../hooks/useUISettings";
import { databaseRepository } from "../repositories/DatabaseRepository";
import { gitHubService } from "../services/GitHubService";
import type { GitHubRepository as GitHubRepo } from "../types/github";
import { WSStatusPanel } from "./WSStatusPanel";
import { WorkflowsTab } from "./WorkflowsTab";
import { ModelsTab } from "./settings/ModelsTab";
import { UiUxTab } from "./settings/UiUxTab";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface Channel {
  id: string;
  name: string;
  createdAt: Date;
  isEncrypted?: boolean;
  preset?: string;
}

interface ChannelManager {
  channels: Channel[];
  activeChannelId: string;
  setActiveChannelId: (id: string) => void;
  createChannel: (name: string, options?: { isEncrypted?: boolean, preset?: string }) => string;
  deleteChannel: (id: string) => void;
  updateChannelName: (id: string, name: string) => void;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: TabId;
  channelManager?: ChannelManager;
  onExportChannel?: () => void;
  onImportChannel?: (json: string) => void;
  /** 外部 UI 设置 hook 引用 / External UI settings hook reference */
  uiSettingsHook?: ReturnType<typeof useUISettings>;
}

type TabId = 'profile' | 'models' | 'connectivity' | 'extensions' | 'gitops' | 'workflows' | 'ai_family' | 'ui_ux' | 'channels' | 'database';

// Mock Data for Hints
const MODEL_HINTS: Record<string, string[]> = {
  "gpt": ["gpt-4-turbo", "gpt-3.5-turbo", "gpt-4o"],
  "claude": ["claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"],
  "glm": ["glm-4", "glm-4-air", "glm-3-turbo"],
  "zhipu": ["glm-4", "glm-4-flash"],
  "llama": ["llama-3-70b", "llama-3-8b", "llama3.2:3b-instruct-q4_K_M", "llama3.2:1b"],
  "deepseek": ["deepseek-chat", "deepseek-coder:33b", "deepseek-v3.1:671b-cloud"],
  "qwen": ["qwen3-coder:30b", "qwen2.5-coder:1.5b"]
};

/**
 * System Configuration Modal Component
 *
 * Manages global application settings including:
 * - AI Model Selection (Provider/Model/Params)
 * - Storage Channels (Local/Encrypted)
 * - AI Assistant/Agents Status
 * - MCP Connectivity
 * - Extensions & GitOps
 *
 * @component
 * @param {SettingsModalProps} props - Component props
 * @returns {JSX.Element | null} Rendered modal or null
 */
export function SettingsModal({ isOpen, onClose, defaultTab = 'models', channelManager, onExportChannel, onImportChannel, uiSettingsHook }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);

  useEffect(() => {
    if (isOpen && defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  // Model Settings State
  const { config, saveConfig } = useChannelConfig(channelManager?.activeChannelId || "main");

  const [modelProvider, setModelProvider] = useState(config.provider);
  const [modelName, setModelName] = useState(config.model);
  const [modelHints, setModelHints] = useState<string[]>([]);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [temperature, setTemperature] = useState(config.temperature);
  const [baseUrl, setBaseUrl] = useState(config.baseUrl);

  // Sync state with loaded config when channel changes or config loads
  useEffect(() => {
    setModelProvider(config.provider);
    setModelName(config.model);
    setApiKey(config.apiKey);
    setTemperature(config.temperature);
    setBaseUrl(config.baseUrl);
  }, [config]);

  const handleSave = () => {
    // Save to Channel Config
    saveConfig({
      provider: modelProvider,
      model: modelName,
      apiKey: apiKey,
      baseUrl: baseUrl,
      temperature: temperature
    });

    toast.success("SYSTEM_CONFIG_UPDATED", {
      description: "Neural pathways re-routed to new endpoints."
    });
    // onClose(); // Optional: keep open to adjust more
  };

  // ... (rest of the code)

  // Channel State
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelPreset, setNewChannelPreset] = useState("General");
  const [newChannelEncrypted, setNewChannelEncrypted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extension State
  const [installedExtensions, setInstalledExtensions] = useState<Record<string, boolean>>({
    "Python_Interpreter": true,
    "Web_Browser": false,
    "Image_Gen_DALL-E": true,
    "Vector_DB_Chroma": false,
  });

  // Git State
  const [gitRepo, setGitRepo] = useState("");
  const [gitStatus, setGitStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");

  // DevOps Hook (MCP + Workflows + Health)
  const devOps = useDevOps();

  // MCP Tool Output Modal
  const [toolOutputVisible, setToolOutputVisible] = useState(false);
  const [toolOutputContent, setToolOutputContent] = useState("");



  // AI Assistant State
  const [aiFamily, setAiFamily] = useState([
    { id: 1, name: "ARCHITECT_PRIME", version: "v4.2.0", role: "System Architecture & Patterns", status: "active" },
    { id: 2, name: "CODE_WEAVER", version: "v3.1.5", role: "Frontend Implementation Specialist", status: "active" },
    { id: 3, name: "DATA_NEXUS", version: "v2.8.0", role: "Database Optimization & Schema", status: "standby" },
    { id: 4, name: "SECURE_SENTINEL", version: "v5.0.1", role: "Vulnerability Scanning & Auth", status: "active" },
  ]);

  // UI Settings - 使用外部 hook 或内部 fallback / Use external hook or internal fallback
  const internalUIHook = useUISettings();
  const uiHook = uiSettingsHook || internalUIHook;

  // Database Config Hook
  const dbConfig = useDatabaseConfig();

  // GitHub Repos State
  const [ghRepos, setGhRepos] = useState<GitHubRepo[]>([]);
  const [ghLoading, setGhLoading] = useState(false);
  const [ghConnectionState, setGhConnectionState] = useState(gitHubService.getConnectionState());

  /** 加载 GitHub 仓库列表 / Load GitHub repository list */
  const loadGitHubRepos = async () => {
    setGhLoading(true);
    const result = await gitHubService.listRepositories();
    if (result.success && result.data) {
      setGhRepos(result.data);
    }
    setGhConnectionState(gitHubService.getConnectionState());
    setGhLoading(false);
  };

  const handleCreateChannel = () => {
    if (!newChannelName.trim()) return;
    if (channelManager) {
      const id = channelManager.createChannel(newChannelName, {
        preset: newChannelPreset,
        isEncrypted: newChannelEncrypted
      });
      // Also apply the preset to the config storage immediately
      const presetConfig = PRESETS[newChannelPreset];
      if (presetConfig) {
        localStorage.setItem(`yyc3_config_${id}`, JSON.stringify(presetConfig));
      }

      channelManager.setActiveChannelId(id);
      setNewChannelName("");
      toast.success("CHANNEL_CREATED_INIT", {
        description: `Partition allocated: ${newChannelName} [${newChannelPreset.toUpperCase()}]`
      });
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportChannel) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        onImportChannel(text);
        toast.success("DATA_INGESTION_COMPLETE");
      };
      reader.readAsText(file);
    }
  };

  const handleModelInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setModelName(val);

    // Simple fuzzy search for hints
    if (val.length > 1) {
      const allModels = Object.values(MODEL_HINTS).flat();
      const matches = allModels.filter(m => m.includes(val.toLowerCase()));
      setModelHints(matches);
    } else {
      setModelHints([]);
    }
  };

  const handleToggleExtension = (name: string) => {
    setInstalledExtensions(prev => {
      const newState = !prev[name];
      toast.success(newState ? `PACKAGE_INSTALLED: ${name}` : `PACKAGE_REMOVED: ${name}`);
      return { ...prev, [name]: newState };
    });
  };

  const handleGitOperation = (operation: string) => {
    setGitStatus("syncing");
    toast.info(`EXECUTING_GIT_OP: ${operation}...`);

    setTimeout(() => {
      setGitStatus("success");
      toast.success(`GIT_OP_SUCCESS: ${operation} completed.`);
      setTimeout(() => setGitStatus("idle"), 3000);
    }, 2000);
  };

  /** 获取服务器状态指示颜色 / Get server status indicator color */
  const getStatusColor = (status: string): string => {
    switch (status) {
      case "connected": return "bg-green-500 shadow-[0_0_8px_#22c55e]";
      case "probing": return "bg-yellow-500 animate-pulse";
      case "error": return "bg-red-500";
      default: return "bg-green-500/20";
    }
  };

  /** 获取健康状态颜色 / Get health status color */
  const getHealthColor = (health: string): string => {
    switch (health) {
      case "healthy": return "text-green-500";
      case "degraded": return "text-yellow-500";
      case "down": return "text-red-500";
      default: return "text-green-500/30";
    }
  };

  const handleAiToggle = (id: number) => {
    setAiFamily(prev => prev.map(member => {
      if (member.id === id) {
        const newStatus = member.status === 'active' ? 'standby' : 'active';
        toast.info(`AGENT_STATUS_UPDATE: ${member.name} is now ${newStatus.toUpperCase()}`);
        return { ...member, status: newStatus };
      }
      return member;
    }));
  };

  const handleUiChange = (key: string, value: string | number | boolean) => {
    uiHook.updateSettings({ [key]: value });
    toast.info(`UI_CONFIG_UPDATED: ${key.toUpperCase()}`);
  };

  const navItems = [
    { id: 'models', icon: Cpu, label: "AI_MODELS" },
    { id: 'channels', icon: HardDrive, label: "HOST_CHANNELS" },
    { id: 'ai_family', icon: Users, label: "AI_FAMILY" },
    { id: 'connectivity', icon: Network, label: "MCP_DEVOPS" },
    { id: 'extensions', icon: Package, label: "EXTENSIONS" },
    { id: 'gitops', icon: GitBranch, label: "GIT_OPS" },
    { id: 'workflows', icon: Workflow, label: "WORKFLOWS" },
    { id: 'database', icon: Server, label: "PG_DATABASE" },
    { id: 'ui_ux', icon: Monitor, label: "UI/UX" },
    { id: 'profile', icon: User, label: "USER_PROFILE" },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'models':
        return (
          <ModelsTab
            modelProvider={modelProvider}
            modelName={modelName}
            modelHints={modelHints}
            apiKey={apiKey}
            temperature={temperature}
            baseUrl={baseUrl}
            setModelProvider={setModelProvider}
            setModelName={setModelName}
            setModelHints={setModelHints}
            setApiKey={setApiKey}
            setTemperature={setTemperature}
            setBaseUrl={setBaseUrl}
            handleModelInput={handleModelInput}
          />
        );

      case 'ai_family':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-4 bg-green-500/10 border border-green-500 flex items-start gap-3">
              <Users className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-green-500 uppercase tracking-wide">OPERATIVE_NET</h4>
                <p className="text-xs text-green-500/70 mt-1 leading-relaxed">
                  Manage your deployed specialized agents. Active agents consume system resources but provide specialized capabilities.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiFamily.map((agent) => (
                <div key={agent.id} className="p-4 border border-green-500/20 bg-black hover:border-green-500/50 transition-all group relative overflow-hidden transform hover:-translate-y-1 duration-300">
                  <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-green-500/10 to-transparent transition-opacity ${agent.status === 'active' ? 'opacity-100' : 'opacity-0'}`} />

                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-none border flex items-center justify-center font-bold text-lg ${agent.status === 'active'
                        ? 'bg-green-500 text-black border-green-500'
                        : 'bg-transparent text-green-500/30 border-green-500/30'
                        }`}>
                        {agent.name[0]}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-green-500 font-mono">{agent.name.toUpperCase()}</h4>
                        <span className="text-[10px] text-green-500/40 uppercase tracking-widest">{agent.version}</span>
                      </div>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${agent.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500/50'}`} />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] font-bold text-green-500/40 uppercase tracking-widest">Primary Function</label>
                      <p className="text-xs text-green-500/80 font-mono mt-0.5">{agent.role}</p>
                    </div>

                    <Button
                      onClick={() => handleAiToggle(agent.id)}
                      className={`w-full rounded-none text-xs font-bold uppercase tracking-widest border h-8 ${agent.status === 'active'
                        ? "bg-transparent text-green-500/50 border-green-500/20 hover:text-red-500 hover:border-red-500/50"
                        : "bg-green-500/10 text-green-500 border-green-500/50 hover:bg-green-500 hover:text-black"
                        }`}
                    >
                      {agent.status === 'active' ? "DEACTIVATE" : "ACTIVATE_MODULE"}
                    </Button>
                  </div>
                </div>
              ))}

              <button className="p-4 border border-dashed border-green-500/30 flex flex-col items-center justify-center gap-2 text-green-500/40 hover:text-green-500 hover:border-green-500 hover:bg-green-500/5 transition-all min-h-[180px]">
                <Plus className="h-8 w-8 opacity-50" />
                <span className="text-xs font-bold uppercase tracking-widest">DEPLOY_NEW_AGENT</span>
              </button>
            </div>
          </div>
        );

      case 'ui_ux':
        return <UiUxTab uiHook={uiHook} onUiChange={handleUiChange} />;

      case 'connectivity':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* MCP 协议状态横幅 / MCP Protocol Status Banner */}
            <div className="p-4 bg-green-500/10 border border-green-500 flex items-start gap-3">
              <Network className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-green-500 uppercase tracking-wide">MCP PROTOCOL · LOCAL DEVOPS</h4>
                <p className="text-xs text-green-500/70 mt-1 leading-relaxed">
                  Model Context Protocol (MCP) 本地 DevOps 工具链注册表。{devOps.servers.filter(s => s.status === "connected").length}/{devOps.servers.length} SERVERS ONLINE · {devOps.metrics.registeredTools} TOOLS REGISTERED
                </p>
              </div>
              <Button
                onClick={async () => {
                  toast.info("PROBING_ALL_SERVERS...");
                  const count = await devOps.probeAllServers();
                  toast.success(`PROBE_COMPLETE: ${count} server(s) connected`);
                }}
                className="bg-green-500 text-black hover:bg-green-400 font-bold text-xs uppercase tracking-widest rounded-none h-7 shrink-0"
              >
                PROBE ALL
              </Button>
            </div>

            {/* 健康概览指标卡 / Health Overview Metrics */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "SERVICES", value: `${devOps.metrics.healthyServices}/${devOps.metrics.totalServices}`, color: devOps.metrics.downServices > 0 ? "text-red-500" : "text-green-500" },
                { label: "MCP_TOOLS", value: String(devOps.metrics.registeredTools), color: "text-green-500" },
                { label: "WORKFLOWS", value: String(devOps.metrics.activeWorkflows), color: "text-green-500" },
                { label: "AVG_LATENCY", value: `${devOps.metrics.avgLatency}ms`, color: devOps.metrics.avgLatency > 200 ? "text-yellow-500" : "text-green-500" },
              ].map((metric, i) => (
                <div key={i} className="p-3 border border-green-500/15 bg-black text-center">
                  <p className={`text-lg font-bold font-mono ${metric.color}`}>{metric.value}</p>
                  <p className="text-[9px] text-green-500/40 uppercase tracking-widest mt-1">{metric.label}</p>
                </div>
              ))}
            </div>

            {/* MCP 服务器列表 / MCP Server List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-green-500/50 uppercase tracking-widest flex items-center gap-2">
                <Server className="h-3 w-3" />
                REGISTERED_SERVERS ({devOps.servers.length})
              </h3>

              {devOps.servers.map((server) => (
                <div key={server.id} className="p-4 border border-green-500/20 bg-black hover:border-green-500/40 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(server.status)}`} />
                      <div>
                        <p className="text-sm font-bold text-green-500 font-mono">{server.name}</p>
                        <p className="text-[10px] text-green-500/40 uppercase tracking-widest">
                          {server.transport.toUpperCase()} · {server.status.toUpperCase()} {server.latency > 0 ? `· ${server.latency}ms` : ""} · v{server.version}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {server.status === "connected" ? (
                        <Button onClick={() => devOps.disconnectServer(server.id)} variant="ghost" size="icon" className="h-7 w-7 text-green-500/50 hover:text-red-500 rounded-none border border-transparent hover:border-red-500/30">
                          <Unlink2 className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Button onClick={async () => {
                          toast.info(`PROBING: ${server.name}...`);
                          const ok = await devOps.probeServer(server.id);
                          if (ok) toast.success(`CONNECTED: ${server.name}`);
                          else toast.error(`PROBE_FAILED: ${server.name}`);
                        }} variant="ghost" size="icon" className="h-7 w-7 text-green-500/50 hover:text-green-500 rounded-none border border-transparent hover:border-green-500/30">
                          <Link2 className="h-3 w-3" />
                        </Button>
                      )}
                      <Button onClick={() => devOps.toggleAutoConnect(server.id)} variant="ghost" size="icon" className={`h-7 w-7 rounded-none border border-transparent ${server.autoConnect ? "text-green-500 hover:text-yellow-500" : "text-green-500/30 hover:text-green-500"}`} title={server.autoConnect ? "AUTO-CONNECT: ON" : "AUTO-CONNECT: OFF"}>
                        <Zap className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* 服务器工具列表 / Server Tools List */}
                  {server.tools.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {server.tools.map(tool => (
                        <button
                          key={tool.id}
                          onClick={async () => {
                            if (tool.requiresConfirmation && !confirm(`确认执行 ${tool.name}? / Confirm execute ${tool.name}?`)) return;
                            toast.info(`EXEC: ${tool.name}...`);
                            const result = await devOps.executeTool(server.id, tool.id);
                            if (result.success) {
                              setToolOutputContent(result.output);
                              setToolOutputVisible(true);
                              toast.success(`${tool.name}: OK (${result.duration}ms)`);
                            } else {
                              toast.error(`${tool.name}: ${result.error}`);
                            }
                          }}
                          className={`px-2 py-1 text-[9px] font-bold uppercase tracking-widest border transition-all ${tool.isDangerous
                            ? "border-red-500/30 text-red-500/60 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500"
                            : "border-green-500/20 text-green-500/60 hover:bg-green-500/10 hover:text-green-500 hover:border-green-500"
                            }`}
                          title={tool.description}
                        >
                          {tool.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 基础设施健康 / Infrastructure Health */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-green-500/50 uppercase tracking-widest flex items-center gap-2">
                  <Activity className="h-3 w-3" />
                  INFRASTRUCTURE_HEALTH
                </h3>
                <Button
                  onClick={async () => {
                    toast.info("SCANNING_HEALTH...");
                    await devOps.scanHealth();
                    toast.success("HEALTH_SCAN_COMPLETE");
                  }}
                  disabled={devOps.isScanning}
                  variant="ghost"
                  size="sm"
                  className="text-green-500/50 hover:text-green-500 text-xs h-6 rounded-none"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${devOps.isScanning ? "animate-spin" : ""}`} />
                  SCAN
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {devOps.infraServices.map(svc => (
                  <div key={svc.id} className="p-3 border border-green-500/15 bg-black flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(svc.health === "healthy" ? "connected" : svc.health === "down" ? "error" : "disconnected")}`} />
                    <div className="min-w-0">
                      <p className={`text-xs font-bold font-mono truncate ${getHealthColor(svc.health)}`}>{svc.name}</p>
                      <p className="text-[9px] text-green-500/30 uppercase tracking-widest">
                        {svc.health.toUpperCase()} {svc.latency > 0 ? `· ${svc.latency}ms` : ""} · {Math.round(svc.uptimePercent)}% UP
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* WebSocket 实时通道 / WebSocket Real-time Channel */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-green-500/50 uppercase tracking-widest flex items-center gap-2">
                <Activity className="h-3 w-3" />
                WEBSOCKET_CHANNEL
              </h3>
              <WSStatusPanel
                status={devOps.wsStatus}
                onConnect={devOps.connectWS}
                onDisconnect={devOps.disconnectWS}
              />
            </div>

            {/* 工具输出面板 / Tool Output Panel */}
            {toolOutputVisible && toolOutputContent && (
              <div className="border border-green-500/30 bg-black">
                <div className="flex items-center justify-between px-3 py-2 border-b border-green-500/20 bg-green-500/5">
                  <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">TOOL_OUTPUT</span>
                  <button onClick={() => setToolOutputVisible(false)} className="text-green-500/50 hover:text-green-500">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <pre className="p-3 text-xs text-green-500/80 font-mono whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                  {toolOutputContent}
                </pre>
              </div>
            )}
          </div>
        );

      case 'extensions':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {[
              { name: "Python_Interpreter", desc: "Execute Python code in a sandboxed environment." },
              { name: "Web_Browser", desc: "Access live internet data via headless browser." },
              { name: "Image_Gen_DALL-E", desc: "Generate images using DALL-E 3 API." },
              { name: "Vector_DB_Chroma", desc: "Local vector embedding storage." },
            ].map((plugin, i) => {
              const isInstalled = installedExtensions[plugin.name] || false;
              return (
                <div key={i} className="p-4 border border-green-500/20 bg-green-500/5 hover:bg-green-500/10 transition-all flex flex-col justify-between h-[160px]">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Package className="h-5 w-5 text-green-500" />
                      {isInstalled ? (
                        <span className="text-[10px] bg-green-500 text-black px-1.5 py-0.5 font-bold uppercase tracking-widest">INSTALLED</span>
                      ) : (
                        <span className="text-[10px] border border-green-500/30 text-green-500/50 px-1.5 py-0.5 font-bold uppercase tracking-widest">AVAILABLE</span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-green-500 font-mono mb-1">{plugin.name}</h4>
                    <p className="text-xs text-green-500/60 leading-relaxed">{plugin.desc}</p>
                  </div>
                  <Button
                    onClick={() => handleToggleExtension(plugin.name)}
                    className={`w-full rounded-none text-xs font-bold uppercase tracking-widest border ${isInstalled
                      ? "bg-transparent text-green-500/50 border-green-500/20 hover:text-red-500 hover:border-red-500/50"
                      : "bg-green-500 text-black border-green-500 hover:bg-green-400"
                      }`}
                  >
                    {isInstalled ? "DISABLE / UNINSTALL" : "INSTALL_PACKAGE"}
                  </Button>
                </div>
              );
            })}
          </div>
        );

      case 'gitops':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 p-6 bg-green-500/5 border border-green-500/20 transform hover:scale-[1.01] transition-all">
              <div className="w-12 h-12 bg-black border border-green-500 flex items-center justify-center">
                <GitBranch className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-green-500">GITHUB_INTELLIGENCE_LAYER</h4>
                <p className="text-xs text-green-500/50 mt-1">
                  Status: MCP Linked via mcp-github-yyc3 · Org: {ghConnectionState.organization}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`w-2 h-2 rounded-full ${ghConnectionState.isConnected ? "bg-green-500 animate-pulse" : "bg-red-500/50"}`}></span>
                  <span className="text-[10px] text-green-500/70 uppercase tracking-widest">
                    {ghConnectionState.isConnected ? "READ/WRITE ACCESS" : "DISCONNECTED"} · {ghConnectionState.repoCount} REPOS · {ghConnectionState.latency}ms
                  </span>
                </div>
              </div>
              <div className="ml-auto flex gap-2">
                <Button onClick={loadGitHubRepos} disabled={ghLoading} className="bg-green-500/10 text-green-500 border border-green-500/30 font-bold uppercase text-xs tracking-widest rounded-none hover:bg-green-500/20">
                  <RefreshCw className={`h-3 w-3 mr-2 ${ghLoading ? "animate-spin" : ""}`} />
                  SYNC
                </Button>
                <Button onClick={async () => {
                  const r = await gitHubService.verifyConnection();
                  if (r.success) {
                    setGhConnectionState(gitHubService.getConnectionState());
                    toast.success("CONNECTION_VERIFIED");
                  }
                }} className="bg-green-500/10 text-green-500 border border-green-500/50 font-bold uppercase text-xs tracking-widest rounded-none hover:bg-green-500 hover:text-black">
                  VERIFY
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={gitRepo}
                  onChange={(e) => setGitRepo(e.target.value)}
                  placeholder="username/repository-name"
                  className="flex-1 bg-black border-green-500/30 text-green-500 font-mono focus-visible:ring-0 focus-visible:border-green-500"
                />
                <Button onClick={async () => {
                  const r = await gitHubService.searchRepositories({ query: gitRepo, org: "YY-Nexus" });
                  if (r.success && r.data) {
                    setGhRepos(r.data.items);
                    toast.success(`FOUND: ${r.data.totalCount} repositories`);
                  }
                }} className="bg-green-500/10 text-green-500 border border-green-500/30 hover:bg-green-500 hover:text-black rounded-none">
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              {/* Repository List from Service Layer */}
              {ghRepos.length > 0 && (
                <div className="space-y-2 max-h-[240px] overflow-y-auto">
                  <label className="text-[10px] font-bold text-green-500/50 uppercase tracking-widest">DISCOVERED_REPOSITORIES ({ghRepos.length})</label>
                  {ghRepos.map((repo) => (
                    <div key={repo.id} className="p-3 border border-green-500/15 bg-green-500/5 hover:border-green-500/40 transition-all flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${repo.isPrivate ? "bg-yellow-500/70" : "bg-green-500"}`} />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-green-500 font-mono truncate">{repo.name}</p>
                          <p className="text-[10px] text-green-500/40 truncate">{repo.description || "No description"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        {repo.language && <span className="text-[9px] px-1.5 py-0.5 border border-green-500/20 text-green-500/60">{repo.language}</span>}
                        <span className="text-[10px] text-green-500/40 font-mono">{repo.stargazersCount}★</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => handleGitOperation("CREATE_REPO")}
                  className="p-4 border border-green-500/20 hover:bg-green-500/10 hover:border-green-500 transition-all flex flex-col items-center gap-2 group hover:-translate-y-1 duration-300"
                >
                  <Plus className="h-6 w-6 text-green-500/50 group-hover:text-green-500" />
                  <span className="text-xs font-bold text-green-500 uppercase tracking-widest">CREATE_REPO</span>
                </button>
                <button
                  onClick={() => handleGitOperation("PUSH_CHANGES")}
                  className="p-4 border border-green-500/20 hover:bg-green-500/10 hover:border-green-500 transition-all flex flex-col items-center gap-2 group hover:-translate-y-1 duration-300"
                >
                  <RotateCw className={`h-6 w-6 text-green-500/50 group-hover:text-green-500 ${gitStatus === "syncing" ? "animate-spin text-green-500" : ""}`} />
                  <span className="text-xs font-bold text-green-500 uppercase tracking-widest">
                    {gitStatus === "syncing" ? "PUSHING..." : "PUSH_CHANGES"}
                  </span>
                </button>
                <button
                  onClick={() => handleGitOperation("PULL_LATEST")}
                  className="p-4 border border-green-500/20 hover:bg-green-500/10 hover:border-green-500 transition-all flex flex-col items-center gap-2 group hover:-translate-y-1 duration-300"
                >
                  <CheckCircle className="h-6 w-6 text-green-500/50 group-hover:text-green-500" />
                  <span className="text-xs font-bold text-green-500 uppercase tracking-widest">PULL_LATEST</span>
                </button>
              </div>

              {gitStatus === "success" && (
                <div className="p-3 bg-green-500/20 border border-green-500 text-green-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                  <CheckCircle className="h-4 w-4" />
                  OPERATION_SUCCESSFUL: Remote repository updated.
                </div>
              )}
            </div>
          </div>
        );

      case 'workflows':
        return <WorkflowsTab devOps={devOps} />;

      case 'channels':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section>
              <h3 className="text-xs font-bold text-green-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                STORAGE_PARTITIONS
              </h3>

              <div className="grid gap-6">
                {/* Active Channel Actions */}
                <div className="p-4 border border-green-500/20 bg-green-500/5 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-green-500 uppercase tracking-wide">
                      ACTIVE_MOUNT: {channelManager?.channels.find(c => c.id === channelManager.activeChannelId)?.name || 'UNKNOWN'}
                    </h4>
                    <p className="text-xs text-green-500/50 mt-1 font-mono">
                      ID: {channelManager?.activeChannelId}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".json"
                    />
                    <Button
                      onClick={handleImportClick}
                      variant="outline"
                      size="sm"
                      className="h-8 border-green-500/30 text-green-500 hover:bg-green-500/10 rounded-none text-xs font-bold uppercase tracking-widest gap-2"
                    >
                      <Upload className="h-3 w-3" /> IMPORT_DATA
                    </Button>
                    <Button
                      onClick={onExportChannel}
                      variant="outline"
                      size="sm"
                      className="h-8 border-green-500/30 text-green-500 hover:bg-green-500/10 rounded-none text-xs font-bold uppercase tracking-widest gap-2"
                    >
                      <Download className="h-3 w-3" /> EXPORT_SNAPSHOT
                    </Button>
                  </div>
                </div>

                {/* Channel List */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-green-500 uppercase tracking-widest">MOUNTED_VOLUMES</label>
                  {channelManager?.channels.map(channel => (
                    <div
                      key={channel.id}
                      className={`p-4 border transition-all flex items-center justify-between group ${channel.id === channelManager.activeChannelId
                        ? "border-green-500 bg-green-500/10"
                        : "border-green-500/20 bg-black hover:border-green-500/50"
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        <Folder className={`h-5 w-5 ${channel.id === channelManager.activeChannelId ? "text-green-500" : "text-green-500/30"}`} />
                        <div>
                          <h4 className={`text-sm font-bold font-mono ${channel.id === channelManager.activeChannelId ? "text-green-500" : "text-green-500/70"}`}>
                            {channel.name}
                            {channel.isEncrypted && <Lock className="inline-block w-3 h-3 ml-2 text-green-500/50" />}
                          </h4>
                          <span className="text-[10px] text-green-500/30 uppercase tracking-widest">
                            {channel.preset?.toUpperCase() || "GENERAL"} · {new Date(channel.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {channel.id === channelManager.activeChannelId ? (
                          <span className="px-3 py-1 bg-green-500 text-black text-[10px] font-bold uppercase tracking-widest">
                            MOUNTED
                          </span>
                        ) : (
                          <Button
                            onClick={() => {
                              channelManager.setActiveChannelId(channel.id);
                              toast.success("VOLUME_MOUNTED", { description: `Switched to ${channel.name}` });
                            }}
                            variant="ghost"
                            size="sm"
                            className="text-green-500/50 hover:text-green-500 hover:bg-green-500/10 rounded-none border border-transparent hover:border-green-500/30 text-xs font-bold uppercase tracking-widest"
                          >
                            MOUNT
                          </Button>
                        )}

                        {channel.id !== 'main' && channel.id !== channelManager.activeChannelId && (
                          <Button
                            onClick={() => {
                              if (confirm("CONFIRM_DELETION: This will permanently wipe this data partition.")) {
                                channelManager.deleteChannel(channel.id);
                                toast.success("VOLUME_FORMATTED", { description: "Partition deleted." });
                              }
                            }}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-500/30 hover:text-red-500 hover:bg-red-500/10 rounded-none"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Create New */}
                <div className="p-4 border border-dashed border-green-500/20 bg-black/50">
                  <label className="text-[10px] font-bold text-green-500/50 uppercase tracking-widest mb-2 block">ALLOCATE_NEW_PARTITION</label>
                  <div className="flex flex-col gap-3">
                    <Input
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      placeholder="PARTITION_LABEL..."
                      className="bg-black border-green-500/30 text-green-500 font-mono focus-visible:ring-0 focus-visible:border-green-500 h-10 rounded-none"
                    />

                    <div className="flex gap-2">
                      <select
                        value={newChannelPreset}
                        onChange={(e) => setNewChannelPreset(e.target.value)}
                        className="bg-black border border-green-500/30 text-green-500 text-xs font-bold uppercase tracking-widest h-10 px-3 outline-none"
                      >
                        {Object.keys(PRESETS).map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                      </select>

                      <button
                        onClick={() => setNewChannelEncrypted(!newChannelEncrypted)}
                        className={`px-3 border h-10 flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all ${newChannelEncrypted
                          ? "bg-green-500 text-black border-green-500"
                          : "bg-transparent text-green-500/30 border-green-500/30 hover:border-green-500"
                          }`}
                        title="Enable Encryption"
                      >
                        {newChannelEncrypted ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                        {newChannelEncrypted ? "SECURE" : "OPEN"}
                      </button>

                      <Button
                        onClick={handleCreateChannel}
                        disabled={!newChannelName.trim()}
                        className="flex-1 bg-green-500/10 text-green-500 border border-green-500/30 hover:bg-green-500 hover:text-black rounded-none font-bold uppercase tracking-widest text-xs h-10"
                      >
                        <Plus className="h-4 w-4 mr-2" /> CREATE
                      </Button>
                    </div>
                  </div>
                </div>

              </div>
            </section>
          </div>
        );

      case 'database':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Connection Status Banner */}
            <div className={`p-4 border flex items-start gap-3 ${dbConfig.connectionStatus === "connected"
              ? "bg-green-500/10 border-green-500"
              : dbConfig.connectionStatus === "error"
                ? "bg-red-500/10 border-red-500/50"
                : "bg-green-500/5 border-green-500/20"
              }`}>
              <Server className={`h-5 w-5 shrink-0 mt-0.5 ${dbConfig.connectionStatus === "connected" ? "text-green-500" :
                dbConfig.connectionStatus === "error" ? "text-red-500" : "text-green-500/50"
                }`} />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-green-500 uppercase tracking-wide flex items-center gap-2">
                  POSTGRESQL_15_LOCAL_CHANNEL
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] border ${dbConfig.connectionStatus === "connected"
                    ? "bg-green-500 text-black border-green-500"
                    : dbConfig.connectionStatus === "error"
                      ? "bg-red-500/20 text-red-500 border-red-500/50"
                      : "bg-transparent text-green-500/50 border-green-500/30"
                    }`}>
                    {dbConfig.connectionStatus === "connected" && <><span className="w-1.5 h-1.5 bg-black rounded-full animate-pulse" /> ONLINE</>}
                    {dbConfig.connectionStatus === "error" && <><Unlink2 className="h-2.5 w-2.5" /> ERROR</>}
                    {dbConfig.connectionStatus === "disconnected" && <><span className="w-1.5 h-1.5 bg-green-500/30 rounded-full" /> OFFLINE</>}
                    {dbConfig.connectionStatus === "connecting" && <><RefreshCw className="h-2.5 w-2.5 animate-spin" /> CONNECTING</>}
                    {dbConfig.connectionStatus === "migrating" && <><Activity className="h-2.5 w-2.5 animate-pulse" /> MIGRATING</>}
                  </span>
                </h4>
                <p className="text-xs text-green-500/70 mt-1 leading-relaxed">
                  Browser → REST API (localhost:3721) → PostgreSQL 15 (localhost:5432) — 本地数据持久化通道
                </p>
                {dbConfig.lastError && (
                  <p className="text-xs text-red-500/80 mt-1 font-mono">[ERROR] {dbConfig.lastError}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    const ok = await dbConfig.testConnection();
                    toast[ok ? "success" : "error"](ok ? "PG_CONNECTION_TEST_PASSED" : "PG_CONNECTION_TEST_FAILED");
                  }}
                  disabled={dbConfig.isConnecting}
                  className="bg-green-500/10 text-green-500 border border-green-500/30 font-bold uppercase text-xs tracking-widest rounded-none hover:bg-green-500/20 h-8"
                >
                  TEST
                </Button>
                {dbConfig.connectionStatus === "connected" ? (
                  <Button
                    onClick={() => { dbConfig.disconnect(); toast.info("PG_DISCONNECTED"); }}
                    className="bg-transparent text-red-500/70 border border-red-500/30 font-bold uppercase text-xs tracking-widest rounded-none hover:bg-red-500/10 h-8"
                  >
                    <Unlink2 className="h-3 w-3 mr-1" /> DISCONNECT
                  </Button>
                ) : (
                  <Button
                    onClick={async () => {
                      const ok = await dbConfig.connect();
                      toast[ok ? "success" : "error"](ok ? "PG_CONNECTED" : "PG_CONNECTION_FAILED");
                    }}
                    disabled={dbConfig.isConnecting}
                    className="bg-green-500 text-black font-bold uppercase text-xs tracking-widest rounded-none hover:bg-green-400 h-8"
                  >
                    {dbConfig.isConnecting ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <Link2 className="h-3 w-3 mr-1" />}
                    CONNECT
                  </Button>
                )}
              </div>
            </div>

            {/* Architecture Diagram */}
            <div className="p-4 border border-dashed border-green-500/15 bg-green-500/5 font-mono text-[10px] text-green-500/60 leading-relaxed">
              <pre>{`┌─────────────┐   REST API    ┌──────────────┐   TCP/SSL    ┌──────────────┐
│  YYC3 Front │ ────────────→ │  API Proxy   │ ──────────→ │ PostgreSQL   │
│  (Browser)  │ ←──────────── │  :3721       │ ←────────── │ 15 (:5432)   │
└─────────────┘               └──────────────┘             └──────────────┘`}</pre>
            </div>

            {/* Quick Setup Guide */}
            {dbConfig.connectionStatus === "disconnected" && (
              <div className="p-4 border border-amber-500/30 bg-amber-500/5">
                <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Terminal className="h-4 w-4" /> QUICK_SETUP_GUIDE
                </h4>
                <div className="space-y-2 text-[11px] text-green-500/70 font-mono">
                  <p className="text-amber-500/80">▸ 本地终端执行以下命令启动代理服务 / Run in local terminal:</p>
                  <div className="p-3 bg-black border border-green-500/15 space-y-1.5">
                    <p className="text-green-500/50"># 1. 安装依赖 / Install dependencies</p>
                    <p className="text-green-500 select-all">cd server && npm install</p>
                    <p className="text-green-500/50 mt-2"># 2. 初始化数据库 / Initialize database</p>
                    <p className="text-green-500 select-all">psql -U yyc3_admin -d yyc3_family -f docs/postgresql-15-schema.sql</p>
                    <p className="text-green-500/50 mt-2"># 3. 启动代理 / Start proxy</p>
                    <p className="text-green-500 select-all">npm run dev</p>
                  </div>
                  <p className="text-[10px] text-green-500/40 mt-2">
                    * 服务运行于 http://localhost:3721 · 详见 docs/DATABASE_SETUP_GUIDE.md
                  </p>
                </div>
              </div>
            )}

            {/* Mock Mode Indicator */}
            {databaseRepository.isMockMode() && dbConfig.connectionStatus !== "connected" && (
              <div className="p-3 border border-cyan-500/30 bg-cyan-500/5 flex items-center gap-3">
                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-cyan-500 uppercase tracking-widest font-bold">
                  MOCK_MODE_ACTIVE — 模拟数据展示中，代理服务未检测到 / Simulated data, proxy not detected
                </span>
              </div>
            )}

            {/* Connection Config */}
            <section>
              <h3 className="text-xs font-bold text-green-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Database className="h-4 w-4" />
                CONNECTION_PARAMETERS
              </h3>

              <div className="grid gap-6">
                {/* Host & Port */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-green-500/60 uppercase tracking-widest">HOST</label>
                    <Input
                      value={dbConfig.config.host}
                      onChange={(e) => dbConfig.saveConfig({ host: e.target.value })}
                      placeholder="localhost"
                      className="bg-green-500/5 border-green-500/20 text-green-500 font-mono h-10 rounded-none focus-visible:ring-0 focus-visible:border-green-500/50 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-green-500/60 uppercase tracking-widest">PORT</label>
                    <Input
                      type="number"
                      value={dbConfig.config.port}
                      onChange={(e) => dbConfig.saveConfig({ port: parseInt(e.target.value) || 5432 })}
                      className="bg-green-500/5 border-green-500/20 text-green-500 font-mono h-10 rounded-none focus-visible:ring-0 focus-visible:border-green-500/50 text-sm"
                    />
                  </div>
                </div>

                {/* Database & Schema */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-green-500/60 uppercase tracking-widest">DATABASE</label>
                    <Input
                      value={dbConfig.config.database}
                      onChange={(e) => dbConfig.saveConfig({ database: e.target.value })}
                      placeholder="yyc3_family"
                      className="bg-green-500/5 border-green-500/20 text-green-500 font-mono h-10 rounded-none focus-visible:ring-0 focus-visible:border-green-500/50 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-green-500/60 uppercase tracking-widest">SCHEMA</label>
                    <Input
                      value={dbConfig.config.schema}
                      onChange={(e) => dbConfig.saveConfig({ schema: e.target.value })}
                      placeholder="public"
                      className="bg-green-500/5 border-green-500/20 text-green-500 font-mono h-10 rounded-none focus-visible:ring-0 focus-visible:border-green-500/50 text-sm"
                    />
                  </div>
                </div>

                {/* Username & Password */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-green-500/60 uppercase tracking-widest">USERNAME</label>
                    <Input
                      value={dbConfig.config.username}
                      onChange={(e) => dbConfig.saveConfig({ username: e.target.value })}
                      placeholder="yyc3_admin"
                      className="bg-green-500/5 border-green-500/20 text-green-500 font-mono h-10 rounded-none focus-visible:ring-0 focus-visible:border-green-500/50 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-green-500/60 uppercase tracking-widest">PASSWORD</label>
                    <Input
                      type="password"
                      value={dbConfig.config.password}
                      onChange={(e) => dbConfig.saveConfig({ password: e.target.value })}
                      placeholder="••••••••"
                      className="bg-green-500/5 border-green-500/20 text-green-500 font-mono h-10 rounded-none focus-visible:ring-0 focus-visible:border-green-500/50 text-sm"
                    />
                  </div>
                </div>

                {/* SSL & Pool */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-green-500/60 uppercase tracking-widest">SSL_MODE</label>
                    <select
                      value={dbConfig.config.sslMode}
                      onChange={(e) => dbConfig.saveConfig({ sslMode: e.target.value as "disable" | "require" | "verify-ca" | "verify-full" | "prefer" })}
                      className="w-full bg-black border border-green-500/20 text-green-500 text-xs font-bold h-10 px-3 outline-none"
                    >
                      {["disable", "prefer", "require", "verify-ca", "verify-full"].map(m => (
                        <option key={m} value={m}>{m.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-green-500/60 uppercase tracking-widest">POOL_SIZE</label>
                    <Input
                      type="number"
                      value={dbConfig.config.poolSize}
                      onChange={(e) => dbConfig.saveConfig({ poolSize: parseInt(e.target.value) || 10 })}
                      className="bg-green-500/5 border-green-500/20 text-green-500 font-mono h-10 rounded-none focus-visible:ring-0 focus-visible:border-green-500/50 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-green-500/60 uppercase tracking-widest">TIMEOUT (ms)</label>
                    <Input
                      type="number"
                      value={dbConfig.config.connectionTimeout}
                      onChange={(e) => dbConfig.saveConfig({ connectionTimeout: parseInt(e.target.value) || 5000 })}
                      className="bg-green-500/5 border-green-500/20 text-green-500 font-mono h-10 rounded-none focus-visible:ring-0 focus-visible:border-green-500/50 text-sm"
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex items-center gap-6 p-4 border border-green-500/10 bg-green-500/5">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => dbConfig.saveConfig({ autoMigrate: !dbConfig.config.autoMigrate })}
                      className={`w-10 h-5 rounded-full border transition-all relative ${dbConfig.config.autoMigrate ? "bg-green-500/20 border-green-500" : "bg-black border-green-500/20"
                        }`}
                    >
                      <div className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-green-500 rounded-full transition-all ${dbConfig.config.autoMigrate ? "right-1" : "left-1 opacity-50"
                        }`} />
                    </button>
                    <span className="text-[10px] font-bold text-green-500/60 uppercase tracking-widest">AUTO_MIGRATE</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => dbConfig.saveConfig({ enableLogging: !dbConfig.config.enableLogging })}
                      className={`w-10 h-5 rounded-full border transition-all relative ${dbConfig.config.enableLogging ? "bg-green-500/20 border-green-500" : "bg-black border-green-500/20"
                        }`}
                    >
                      <div className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-green-500 rounded-full transition-all ${dbConfig.config.enableLogging ? "right-1" : "left-1 opacity-50"
                        }`} />
                    </button>
                    <span className="text-[10px] font-bold text-green-500/60 uppercase tracking-widest">QUERY_LOGGING</span>
                  </div>
                </div>
              </div>
            </section>

            {/* API Proxy Config */}
            <section>
              <h3 className="text-xs font-bold text-green-500/50 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Network className="h-4 w-4" />
                LOCAL_API_PROXY
              </h3>
              <div className="grid grid-cols-2 gap-4 p-4 border border-dashed border-green-500/15 bg-green-500/5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-green-500/60 uppercase tracking-widest">PROXY_BASE_URL</label>
                  <Input
                    value={dbConfig.proxyConfig.baseUrl}
                    onChange={(e) => dbConfig.saveProxyConfig({ baseUrl: e.target.value })}
                    placeholder="http://localhost:3721"
                    className="bg-black border-green-500/20 text-green-500 font-mono h-10 rounded-none focus-visible:ring-0 focus-visible:border-green-500/50 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-green-500/60 uppercase tracking-widest">API_VERSION</label>
                  <Input
                    value={dbConfig.proxyConfig.apiVersion}
                    onChange={(e) => dbConfig.saveProxyConfig({ apiVersion: e.target.value })}
                    placeholder="v1"
                    className="bg-black border-green-500/20 text-green-500 font-mono h-10 rounded-none focus-visible:ring-0 focus-visible:border-green-500/50 text-sm"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-bold text-green-500/60 uppercase tracking-widest">AUTH_TOKEN (Optional)</label>
                  <Input
                    type="password"
                    value={dbConfig.proxyConfig.authToken}
                    onChange={(e) => dbConfig.saveProxyConfig({ authToken: e.target.value })}
                    placeholder="Bearer token for proxy auth..."
                    className="bg-black border-green-500/20 text-green-500 font-mono h-10 rounded-none focus-visible:ring-0 focus-visible:border-green-500/50 text-sm"
                  />
                </div>
              </div>
            </section>

            {/* Sync Strategy */}
            <section>
              <h3 className="text-xs font-bold text-green-500/50 uppercase tracking-widest mb-6 flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                SYNC_STRATEGY (localStorage ↔ PostgreSQL)
              </h3>
              <div className="grid grid-cols-3 gap-4 p-4 border border-green-500/15 bg-green-500/5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-green-500/60 uppercase tracking-widest">DIRECTION</label>
                  <select
                    value={dbConfig.syncStrategy.direction}
                    onChange={(e) => dbConfig.updateSyncStrategy({ direction: e.target.value as "local-to-pg" | "pg-to-local" | "bidirectional" })}
                    className="w-full bg-black border border-green-500/20 text-green-500 text-xs font-bold h-10 px-3 outline-none"
                  >
                    <option value="bidirectional">BIDIRECTIONAL</option>
                    <option value="local-to-pg">LOCAL → PG</option>
                    <option value="pg-to-local">PG → LOCAL</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-green-500/60 uppercase tracking-widest">CONFLICT_RESOLVE</label>
                  <select
                    value={dbConfig.syncStrategy.conflictResolution}
                    onChange={(e) => dbConfig.updateSyncStrategy({ conflictResolution: e.target.value as "local-wins" | "remote-wins" | "latest-wins" })}
                    className="w-full bg-black border border-green-500/20 text-green-500 text-xs font-bold h-10 px-3 outline-none"
                  >
                    <option value="latest-wins">LATEST_WINS</option>
                    <option value="local-wins">LOCAL_WINS</option>
                    <option value="remote-wins">REMOTE_WINS</option>
                  </select>
                </div>
                <div className="flex flex-col justify-end gap-2">
                  <Button
                    onClick={async () => {
                      const ok = await dbConfig.syncNow();
                      toast[ok ? "success" : "error"](ok ? "SYNC_COMPLETE" : "SYNC_FAILED");
                    }}
                    disabled={dbConfig.connectionStatus !== "connected"}
                    className="bg-green-500 text-black font-bold uppercase text-xs tracking-widest rounded-none hover:bg-green-400 h-10"
                  >
                    <RefreshCw className="h-3 w-3 mr-2" /> SYNC_NOW
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-green-500/30 mt-3 flex items-center gap-1">
                * 需要运行本地 API 代理服务才能连接 PostgreSQL / Requires local API proxy service to connect to PostgreSQL
              </p>
            </section>
          </div>
        );

      default:
        // Profile (Default existing content simplified)
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-6 mb-8">
              <div className="relative group">
                <div className="w-24 h-24 bg-black border border-green-500 flex items-center justify-center text-4xl shadow-[0_0_20px_rgba(34,197,94,0.1)]">
                  <User className="h-10 w-10 text-green-500" />
                </div>
                <button onClick={() => toast.info("UPLOAD_AVATAR_INIT...")} className="absolute -bottom-2 -right-2 p-2 bg-black border border-green-500 hover:bg-green-500 hover:text-black text-green-500 transition-all shadow-lg">
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <div>
                <h4 className="text-lg font-bold text-green-500 mb-1 tracking-wider">USER_ADMIN</h4>
                <p className="text-xs text-green-500/40 font-mono">ID: 0x8F3A2C1B</p>
                <div className="inline-flex items-center gap-1.5 mt-3 px-2 py-0.5 bg-green-500/10 border border-green-500/30 text-green-500 text-[9px] font-bold uppercase tracking-widest">
                  ROOT_PRIVILEGES
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: 50, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative w-full max-w-5xl h-[85vh] bg-black border border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.1)] flex overflow-hidden z-50"
          >
            {/* Sidebar */}
            <div className="w-64 border-r border-green-500/20 flex flex-col bg-black/50">
              <div className="p-6 border-b border-green-500/20">
                <h2 className="text-lg font-bold text-green-500 flex items-center gap-2">
                  <Settings className="h-5 w-5 animate-spin-slow" />
                  SYS_CTRL
                </h2>
                <p className="text-[10px] text-green-500/40 uppercase tracking-widest mt-1">v0.9.4 [Personalize]</p>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as TabId)}
                    className={`w-full px-6 py-3 flex items-center gap-3 text-xs font-bold uppercase tracking-wider transition-all relative overflow-hidden group ${activeTab === item.id
                      ? "text-black bg-green-500"
                      : "text-green-500/50 hover:text-green-500 hover:bg-green-500/5"
                      }`}
                  >
                    <item.icon className={`h-4 w-4 relative z-10 ${activeTab === item.id ? "text-black" : "text-green-500/50 group-hover:text-green-500"}`} />
                    <span className="relative z-10">{item.label}</span>

                    {/* Active Indicator */}
                    {activeTab === item.id && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-green-900 z-20"
                      />
                    )}
                  </button>
                ))}
              </div>

              <div className="p-4 border-t border-green-500/20">
                <div className="flex items-center gap-3 px-2 mb-4">
                  <div className="w-8 h-8 bg-green-500 rounded-none flex items-center justify-center text-black font-bold">
                    YY
                  </div>
                  <div>
                    <p className="text-xs font-bold text-green-500">YanYu_Admin</p>
                    <p className="text-[10px] text-green-500/40 uppercase">Level 5 Access</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-black/90 relative">
              {/* Content Header */}
              <div className="h-16 border-b border-green-500/20 flex items-center justify-between px-8 bg-green-500/5">
                <div className="flex items-center gap-2 text-green-500/40 text-xs font-mono uppercase tracking-widest">
                  <span>ROOT</span>
                  <ChevronRight className="h-3 w-3" />
                  <span>CONFIG</span>
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-green-500 font-bold">{activeTab.replace('_', ' ')}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onClose}
                    className="h-8 border-green-500/30 text-green-500 hover:bg-green-500 hover:text-black hover:border-green-500 transition-all rounded-none text-xs font-bold uppercase tracking-widest"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    className="h-8 bg-green-500 text-black hover:bg-green-400 rounded-none text-xs font-bold uppercase tracking-widest gap-2 shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_25px_rgba(34,197,94,0.5)] transition-all transform hover:scale-105"
                  >
                    <CheckCircle className="h-3 w-3" />
                    Save_Changes
                  </Button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderContent()}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
