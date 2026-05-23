import { motion } from "framer-motion";
import {
  Cpu,
  Folder,
  PanelLeftClose,
  Pin,
  PinOff,
  Power,
  Star,
  Terminal,
  Trash2
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "./ui/sidebar";

interface ChatListItemProps {
  chat: {
    id: string;
    title: string;
    isStarred?: boolean;
  };
  isActive: boolean;
  onSelect: (chatId: string) => void;
  onToggleStar: (chatId: string) => void;
  onDelete: (chatId: string) => void;
  isStarredSection?: boolean;
}

export interface ChatHistory {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messageCount: number;
  isStarred?: boolean;
}

interface ClaudeSidebarProps {
  chatHistory: ChatHistory[];
  currentChatId: string | null;
  currentView: 'terminal' | 'projects' | 'artifacts';
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onToggleStar: (chatId: string) => void;
  onChangeView: (view: 'terminal' | 'projects' | 'artifacts') => void;
}

export function ClaudeSidebar({
  chatHistory,
  currentChatId,
  currentView,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onToggleStar,
  onChangeView
}: ClaudeSidebarProps) {
  const { state, setOpen, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isHoveringSensor, setIsHoveringSensor] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [autoCloseTimer, setAutoCloseTimer] = useState<NodeJS.Timeout | null>(null);

  // Auto-expand on sensor hover
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isHoveringSensor && isCollapsed && !isMobile) {
      timer = setTimeout(() => {
        setOpen(true);
      }, 200);
    }
    return () => clearTimeout(timer);
  }, [isHoveringSensor, isCollapsed, isMobile, setOpen]);

  // Auto-retract logic
  const handleMouseEnter = () => {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
      setAutoCloseTimer(null);
    }
  };

  const handleMouseLeave = () => {
    if (isPinned || isCollapsed || isMobile) return;

    const timer = setTimeout(() => {
      setOpen(false);
    }, 1500);
    setAutoCloseTimer(timer);
  };

  const getGroupTitle = (date: Date) => {
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return "./today";
    if (diffInDays === 1) return "./yesterday";
    if (diffInDays < 7) return "./last_7_days";
    return "./archive";
  };

  const starredItems = chatHistory.filter(chat => chat.isStarred);
  const unstarredItems = chatHistory.filter(chat => !chat.isStarred);

  const groups: Record<string, ChatHistory[]> = {};
  unstarredItems.forEach(chat => {
    const title = getGroupTitle(new Date(chat.timestamp));
    if (!groups[title]) groups[title] = [];
    groups[title].push(chat);
  });

  const groupOrder = ["./today", "./yesterday", "./last_7_days", "./archive"];

  const coreModules = [
    { id: 'terminal', icon: Terminal, label: "terminal.exe" },
    { id: 'projects', icon: Folder, label: "projects_dir" },
    { id: 'artifacts', icon: Cpu, label: "artifacts_log" },
  ] as const;

  return (
    <>
      {/* Sensing Area */}
      {isCollapsed && (
        <div
          className="fixed inset-y-0 left-0 w-4 z-50 cursor-pointer group/sensor"
          onMouseEnter={() => setIsHoveringSensor(true)}
          onMouseLeave={() => setIsHoveringSensor(false)}
          onClick={() => setOpen(true)}
        >
          <div className="absolute inset-y-0 left-0 w-[2px] bg-green-500/0 group-hover/sensor:bg-green-500/50 transition-all duration-300 shadow-[0_0_15px_rgba(34,197,94,0)] group-hover/sensor:shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
        </div>
      )}

      <Sidebar
        collapsible="icon"
        className="border-none bg-black/80 backdrop-blur-xl transition-all duration-500 group/sidebar overflow-hidden z-40"
        data-variant="hacker"
        style={{ "--sidebar-width-icon": "0px" } as React.CSSProperties}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className={`flex flex-col h-full transition-opacity duration-300 ${isCollapsed ? 'opacity-0 invisible w-0' : 'opacity-100 visible w-auto'}`}>
          <SidebarHeader className="p-4 space-y-4 border-b border-green-500/5 bg-transparent">
            <div className="flex items-center justify-between">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 bg-green-500/10 border border-green-500 flex items-center justify-center shrink-0">
                  <span className="text-green-500 text-lg font-bold">_</span>
                </div>
                <div className="flex flex-col">
                  <h1 className="text-sm font-bold text-green-500 tracking-wider uppercase">YYC³ AI FAMILY</h1>
                  <span className="text-[10px] text-green-500/50">YYC³ OS v0.9.3 [Intelligence]</span>
                </div>
              </motion.div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsPinned(!isPinned)}
                  className={`h-8 w-8 rounded-none transition-all ${isPinned ? 'text-green-500 bg-green-500/10' : 'text-green-500/20 hover:text-green-500 hover:bg-green-500/10'}`}
                  title={isPinned ? "Auto-retract disabled" : "Auto-retract enabled"}
                >
                  {isPinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(false)}
                  className="h-8 w-8 text-green-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-none transition-all"
                  title="Collapse Sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={onNewChat}
                  className="w-full justify-between bg-black/50 hover:bg-green-500/10 text-green-500 border border-green-500/30 transition-all duration-300 rounded-none h-12 group"
                >
                  <span className="flex items-center text-xs tracking-wider">
                    <span className="mr-2 text-green-500/50 group-hover:text-green-500 animate-pulse">&gt;</span>
                    INIT_NEW_SESSION
                  </span>
                  <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 border border-green-500/20 bg-green-500/5 px-1.5 font-mono text-[10px] font-medium text-green-500/60 rounded-none">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                </Button>
              </motion.div>
            </div>
          </SidebarHeader>

          <SidebarContent className="px-2 pb-4 overflow-hidden">
            <ScrollArea className="flex-1 pr-1">
              <div className="space-y-6 pt-4">

                {/* Core Modules */}
                <SidebarMenu>
                  {coreModules.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => onChangeView(item.id)}
                        isActive={currentView === item.id}
                        tooltip={item.label}
                        className={`h-10 text-xs tracking-wider border-l-2 rounded-none transition-all duration-200 group
                          ${currentView === item.id
                            ? "bg-white/10 text-white border-green-500 font-bold"
                            : "text-green-500/50 hover:bg-green-500/5 hover:text-green-400 border-transparent"
                          }
                        `}
                      >
                        <item.icon className={`h-4 w-4 ${currentView === item.id ? "text-green-500" : "text-green-500/40 group-hover:text-green-500"}`} />
                        <span className={currentView === item.id ? "text-white" : ""}>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>

                {/* Starred */}
                {starredItems.length > 0 && (
                  <SidebarGroup className="p-0">
                    <SidebarGroupLabel className="px-3 text-[10px] font-bold text-green-500/30 uppercase tracking-[0.2em] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500/30" />
                      /favorites
                    </SidebarGroupLabel>
                    <SidebarGroupContent className="space-y-px">
                      {starredItems.map((chat) => (
                        <ChatListItem
                          key={chat.id}
                          chat={chat}
                          isActive={currentChatId === chat.id}
                          onSelect={onSelectChat}
                          onToggleStar={onToggleStar}
                          onDelete={onDeleteChat}
                          isStarredSection
                        />
                      ))}
                    </SidebarGroupContent>
                  </SidebarGroup>
                )}

                {/* Groups */}
                {groupOrder.map((groupTitle) => (
                  groups[groupTitle] && (
                    <SidebarGroup key={groupTitle} className="p-0">
                      <SidebarGroupLabel className="px-3 text-[10px] font-bold text-green-500/30 uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-green-500/30" />
                        {groupTitle}
                      </SidebarGroupLabel>
                      <SidebarGroupContent className="space-y-px">
                        {groups[groupTitle].map((chat) => (
                          <ChatListItem
                            key={chat.id}
                            chat={chat}
                            isActive={currentChatId === chat.id}
                            onSelect={onSelectChat}
                            onToggleStar={onToggleStar}
                            onDelete={onDeleteChat}
                          />
                        ))}
                      </SidebarGroupContent>
                    </SidebarGroup>
                  )
                ))}
              </div>
            </ScrollArea>
          </SidebarContent>

          <SidebarFooter className="p-0 border-t border-green-500/5 bg-transparent">
            <div className="flex items-center justify-between p-4 hover:bg-green-500/5 cursor-pointer group transition-colors">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="w-8 h-8 bg-green-500/20 rounded-none flex items-center justify-center border border-green-500/40">
                    <span className="text-green-500 text-xs">US</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 animate-pulse" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-green-500 group-hover:text-green-400">USER_ADMIN</span>
                  <span className="text-[9px] text-green-500/40 uppercase tracking-widest">Connected</span>
                </div>
              </div>
              <Power className="h-4 w-4 text-green-500/30 group-hover:text-red-500 transition-colors" />
            </div>
            <div className="px-4 py-1 bg-green-500/10 text-[9px] text-green-500/40 font-mono text-center tracking-widest uppercase border-t border-green-500/10">
              SECURE CONNECTION ESTABLISHED
            </div>
          </SidebarFooter>
        </div>
      </Sidebar>
    </>
  );
}

function ChatListItem({ chat, isActive, onSelect, onToggleStar, onDelete, isStarredSection = false }: ChatListItemProps) {
  return (
    <div className="group relative px-1">
      <button
        onClick={() => onSelect(chat.id)}
        className={`w-full text-left px-3 py-2 text-xs font-mono truncate flex items-center gap-3 transition-all duration-200 border-l-2 ${isActive
          ? "bg-green-500/10 text-green-400 border-green-500"
          : "text-green-500/40 hover:text-green-400 border-transparent hover:border-green-500/30"
          }`}
      >
        <span className={`text-[10px] ${isActive ? "text-green-500" : "text-green-500/20"}`}>
          {isStarredSection ? "*" : ">"}
        </span>
        <span className="flex-1 truncate">{chat.title}</span>
      </button>

      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all bg-black">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar(chat.id);
          }}
          className="p-1 hover:bg-green-500/10 transition-all text-green-500/30 hover:text-green-500"
        >
          <Star className={`h-3 w-3 ${chat.isStarred ? "fill-green-500 text-green-500" : ""}`} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(chat.id);
          }}
          className="p-1 hover:bg-red-500/10 transition-all text-green-500/30 hover:text-red-500"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
