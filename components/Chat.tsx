import { AnimatePresence, motion } from "framer-motion";
import { Bell, Database, FileCode, Github, HelpCircle, Layout, Search, Settings as SettingsIcon, Terminal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useChannelManager } from "../hooks/useChannelManager";
import { useChatPersistence } from "../hooks/useChatPersistence";
import { useUISettings } from "../hooks/useUISettings";
import { Chat as ChatType } from "../types/storage";
import { Artifact, ArtifactsPanel } from "./ArtifactsPanel";
import { ChatContainer } from "./ChatContainer";
import { ChatHistory, ClaudeSidebar } from "./ClaudeSidebar";
import { ClaudeWelcome } from "./ClaudeWelcome";
import { SettingsModal } from "./SettingsModal";
import { YYC3Background } from "./YYC3Background";
import { Button } from "./ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "./ui/sidebar";

import { SystemStartup } from "./SystemStartup";

export function Chat() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"profile" | "models" | "connectivity" | "extensions" | "gitops" | "workflows" | "channels" | "database" | "ui_ux" | "ai_family">("models");
  const [isArtifactsOpen, setIsArtifactsOpen] = useState(false);
  const [activeArtifact, _setActiveArtifact] = useState<Artifact | null>(null);
  const [searchScope, setSearchScope] = useState<"ALL" | "LOGS" | "LOCAL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSystemReady, setIsSystemReady] = useState(false);

  // UI Settings Hook (shared with SettingsModal)
  const uiSettingsHook = useUISettings();
  const { settings: uiSettings, activeThemeColor } = uiSettingsHook;

  // Channel Manager
  const channelManager = useChannelManager();

  // Local Persistence Hook
  const { chats, setChats, loading: isChatsLoading, exportData, importData } = useChatPersistence(channelManager.activeChannelId, [
    {
      id: "1",
      title: "产品需求分析",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isStarred: true,
    },
    {
      id: "2",
      title: "前端架构审查",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isStarred: true,
    }
  ]);

  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'terminal' | 'projects' | 'artifacts'>('terminal');
  const currentChat = chats.find(chat => chat.id === currentChatId) || null;

  const generateChatHistory = (): ChatHistory[] => {
    return chats.map(chat => ({
      id: chat.id,
      title: chat.title,
      lastMessage: chat.messages.length > 0
        ? chat.messages[chat.messages.length - 1].text
        : "新对话",
      timestamp: new Date(chat.updatedAt),
      messageCount: chat.messages.filter(m => m.isUser).length,
      isStarred: chat.isStarred,
    }));
  };

  const handleToggleStar = (chatId: string) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId ? { ...chat, isStarred: !chat.isStarred, updatedAt: new Date() } : chat
    ));
  };

  const handleNewChat = () => {
    const newChat: ChatType = {
      id: Date.now().toString(),
      channelId: channelManager.activeChannelId,
      title: "新对话",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isStarred: false,
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
  };

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  const handleUpdateChat = (updatedChat: ChatType) => {
    setChats(prev => prev.map(chat =>
      chat.id === updatedChat.id ? { ...updatedChat, updatedAt: new Date() } : chat
    ));
  };

  const handleDeleteChat = (chatId: string) => {
    setChats(prev => prev.filter(chat => chat.id !== chatId));
    if (currentChatId === chatId) setCurrentChatId(null);
  };

  const handleWelcomeMessage = (messageText: string) => {
    const newChat: ChatType = {
      id: Date.now().toString(),
      channelId: channelManager.activeChannelId,
      title: messageText.slice(0, 50) + (messageText.length > 50 ? "..." : ""),
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
  };

  if (!isSystemReady) {
    return <SystemStartup onComplete={() => setIsSystemReady(true)} />;
  }

  if (isChatsLoading) {
    return <div className="h-screen w-full flex items-center justify-center bg-black text-green-500 font-mono animate-pulse">SYNCING_NEURAL_NETWORKS...</div>;
  }

  return (
    <SidebarProvider
      defaultOpen={true}
      style={{ "--sidebar-width-icon": "0px" } as React.CSSProperties}
    >
      <ClaudeSidebar
        chatHistory={generateChatHistory()}
        currentChatId={currentChatId}
        currentView={currentView}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onToggleStar={handleToggleStar}
        onChangeView={setCurrentView}
      />

      <SidebarInset className="bg-transparent text-green-500 overflow-hidden font-mono h-screen">
        <div className="flex h-full flex-row relative overflow-hidden">
          {/* Main Chat Content */}
          <div className="flex-1 flex flex-col relative overflow-hidden bg-transparent">
            {/* Header */}
            <motion.header
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-green-500/20 bg-black/80 backdrop-blur-md z-20"
            >
              <div className="flex items-center gap-4">
                <SidebarTrigger className="h-9 w-9 p-0 hover:bg-green-500/10 text-green-500/50 hover:text-green-500 transition-all rounded-none border border-green-500/20" />

                {/* 自定义顶栏标识 / Custom top bar identity label */}
                <div className="hidden md:flex items-center gap-4 font-mono tracking-widest select-none" style={{ color: activeThemeColor.primary }}>
                  {uiSettings.topBarText.split('|').map((segment, idx, arr) => (
                    <span key={idx} className="flex items-center gap-4">
                      <span
                        className="text-2xl lg:text-3xl font-black tracking-widest"
                        style={{ textShadow: `0 0 10px ${activeThemeColor.primary}80` }}
                      >
                        {segment.trim()}
                      </span>
                      {idx < arr.length - 1 && (
                        <span className="text-xl lg:text-2xl" style={{ color: `${activeThemeColor.primary}30` }}>|</span>
                      )}
                    </span>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {currentChat && (
                    <motion.div
                      key={currentChat.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex flex-col"
                    >
                      <h1 className="text-xs font-bold text-green-500 truncate max-w-[200px] md:max-w-[400px] uppercase tracking-wider">
                        {currentChat.title === "新对话" ? "NEW_SESSION_INIT" : currentChat.title}
                      </h1>
                      <p className="text-[9px] text-green-500/30 font-bold uppercase tracking-[0.2em]">SECURE_CHANNEL_v3</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-2">
                {/* Search Bar */}
                <div className="hidden md:flex items-center mr-2 border border-green-500/20 bg-green-500/5 px-2 h-9 group focus-within:border-green-500/50 transition-colors">
                  <Search className="h-3 w-3 text-green-500/50 mr-2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="SEARCH_QUERY..."
                    className="bg-transparent border-none outline-none text-[10px] text-green-500 font-mono w-32 lg:w-48 placeholder:text-green-500/20 uppercase tracking-wider"
                  />
                  <div className="h-4 w-[1px] bg-green-500/20 mx-2" />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSearchScope(searchScope === "LOGS" ? "ALL" : "LOGS")}
                      className={`text-[9px] font-bold uppercase tracking-widest cursor-pointer hover:text-green-500 flex items-center gap-1 ${searchScope === "LOGS" ? "text-green-500" : "text-green-500/40"}`}
                      title="Search Chat Logs"
                    >
                      <Database className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setSearchScope(searchScope === "LOCAL" ? "ALL" : "LOCAL")}
                      className={`text-[9px] font-bold uppercase tracking-widest cursor-pointer hover:text-green-500 flex items-center gap-1 ${searchScope === "LOCAL" ? "text-green-500" : "text-green-500/40"}`}
                      title="Search Local Files"
                    >
                      <FileCode className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Common Tools */}
                <div className="flex items-center gap-1 mr-2 border-r border-green-500/20 pr-2">
                  <Button
                    onClick={() => {
                      setSettingsTab("extensions");
                      setIsSettingsOpen(true);
                    }}
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-green-500/40 hover:text-green-500 hover:bg-green-500/10 rounded-none"
                    title="Terminal Shell"
                  >
                    <Terminal className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => {
                      setSettingsTab("gitops");
                      setIsSettingsOpen(true);
                    }}
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-green-500/40 hover:text-green-500 hover:bg-green-500/10 rounded-none"
                    title="Git Operations"
                  >
                    <Github className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => toast.info("NO_NEW_NOTIFICATIONS")} variant="ghost" size="icon" className="h-9 w-9 text-green-500/40 hover:text-green-500 hover:bg-green-500/10 rounded-none">
                    <Bell className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => toast.info("DOCS_OPEN_REQUEST")} variant="ghost" size="icon" className="h-9 w-9 text-green-500/40 hover:text-green-500 hover:bg-green-500/10 rounded-none">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </div>

                {activeArtifact && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsArtifactsOpen(!isArtifactsOpen)}
                    className={`h-9 px-3 gap-2 rounded-none border transition-all ${isArtifactsOpen
                      ? "bg-green-500 text-black border-green-500"
                      : "text-green-500/40 hover:text-green-500 border-green-500/20"
                      }`}
                  >
                    <Layout className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:block">
                      {isArtifactsOpen ? "HIDE_PANEL" : "SHOW_PANEL"}
                    </span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSettingsTab("models");
                    setIsSettingsOpen(true);
                  }}
                  className="h-9 w-9 text-green-500/40 hover:text-green-500 hover:bg-green-500/10 rounded-none border border-transparent hover:border-green-500/20 transition-all"
                >
                  <SettingsIcon className="h-4 w-4" />
                </Button>
              </div>
            </motion.header>

            <main className="flex-1 overflow-hidden relative">
              <YYC3Background />
              <AnimatePresence mode="wait">
                {currentChat ? (
                  <motion.div
                    key="chat-content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full"
                  >
                    <ChatContainer
                      currentChat={currentChat}
                      onUpdateChat={handleUpdateChat}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="welcome-content"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    className="h-full"
                  >
                    <ClaudeWelcome onSendMessage={handleWelcomeMessage} />
                  </motion.div>
                )}
              </AnimatePresence>
            </main>
          </div>

          {/* Artifacts Panel */}
          <ArtifactsPanel
            artifact={activeArtifact}
            isOpen={isArtifactsOpen}
            onClose={() => setIsArtifactsOpen(false)}
          />
        </div>

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          defaultTab={settingsTab}
          channelManager={channelManager}
          onExportChannel={exportData}
          onImportChannel={importData}
          uiSettingsHook={uiSettingsHook}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
