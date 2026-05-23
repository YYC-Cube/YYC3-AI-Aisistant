import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Cpu,
  Paperclip,
  Send,
  Terminal,
  Wifi,
  X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAI } from "../hooks/useAI";
import { sound } from "../utils/audio"; // Import Sound Engine
import { ChatMessage } from "./ChatMessage";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

export interface Attachment {
  id: string;
  name: string;
  type: "image" | "file";
  size: string;
  url?: string;
}

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isStreaming?: boolean;
  attachments?: Attachment[];
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  isStarred?: boolean;
}

interface ChatContainerProps {
  currentChat: Chat;
  onUpdateChat: (chat: Chat) => void;
}

export function ChatContainer({ currentChat, onUpdateChat }: ChatContainerProps) {
  const [inputValue, setInputValue] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real AI Integration
  const { chat } = useAI();

  // Mock Token Logic
  const calculateTokens = () => {
    const textLength = currentChat.messages.reduce((acc, m) => acc + m.text.length, 0);
    return Math.floor(textLength * 0.7) + (currentChat.messages.length * 50);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChat.messages]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' : 'file',
      size: `${(file.size / 1024).toFixed(1)} KB`,
      url: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleCommand = (command: string) => {
    const cmd = command.trim().toLowerCase();

    if (cmd === '/clear') {
      sound.playEnter();
      onUpdateChat({
        ...currentChat,
        messages: [],
        updatedAt: new Date()
      });
      toast.success("BUFFER_FLUSHED");
      return true;
    }

    if (cmd === '/sys') {
      sound.playIncomingMessage();
      const sysMsg: Message = {
        id: Date.now().toString(),
        text: "SYSTEM DIAGNOSTICS:\n-------------------\nKERNEL: OK\nMEMORY: OPTIMAL\nSYNC_NODE: LOCAL\nLATENCY: 12ms\nENCRYPTION: AES-256",
        isUser: false,
        timestamp: new Date()
      };
      onUpdateChat({
        ...currentChat,
        messages: [...currentChat.messages, sysMsg],
        updatedAt: new Date()
      });
      return true;
    }

    if (cmd === '/help') {
      const helpMsg: Message = {
        id: Date.now().toString(),
        text: "AVAILABLE COMMANDS:\n/clear - Flush current buffer\n/sys   - System diagnostics\n/help  - Display this menu",
        isUser: false,
        timestamp: new Date()
      };
      onUpdateChat({
        ...currentChat,
        messages: [...currentChat.messages, helpMsg],
        updatedAt: new Date()
      });
      return true;
    }

    return false;
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() && attachments.length === 0) return;

    sound.playEnter(); // Sound Effect

    // Command Parsing
    if (inputValue.startsWith('/')) {
      const isCommand = handleCommand(inputValue);
      setInputValue("");
      if (isCommand) return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      text: inputValue,
      isUser: true,
      timestamp: new Date(),
      attachments: attachments.length > 0 ? [...attachments] : undefined
    };

    const updatedChatWithUser = {
      ...currentChat,
      messages: [...currentChat.messages, userMsg],
      updatedAt: new Date(),
    };

    onUpdateChat(updatedChatWithUser);
    setInputValue("");
    setAttachments([]);

    // AI logic (Real Integration)
    const aiMsgId = (Date.now() + 1).toString();
    const initialAiMsg: Message = {
      id: aiMsgId,
      text: "",
      isUser: false,
      timestamp: new Date(),
      isStreaming: true,
    };

    // Add empty AI message first
    const updatedWithAi = {
      ...updatedChatWithUser,
      messages: [...updatedChatWithUser.messages, initialAiMsg],
    };
    onUpdateChat(updatedWithAi);

    // Initial response sound
    setTimeout(() => sound.playIncomingMessage(), 500);

    let currentText = "";

    const history = updatedChatWithUser.messages.map(m => ({
      role: m.isUser ? "user" : "assistant",
      content: m.text
    }));

    await chat(history, (chunk) => {
      currentText += chunk;

      if (chunk.includes("```web") || currentText.includes("```web")) {
        // Artifact logic
      }

      onUpdateChat({
        ...updatedChatWithUser,
        messages: [...updatedChatWithUser.messages, {
          ...initialAiMsg,
          text: currentText,
          isStreaming: true
        }],
      });
    });

    // Finalize message
    onUpdateChat({
      ...updatedChatWithUser,
      messages: [...updatedChatWithUser.messages, {
        ...initialAiMsg,
        text: currentText,
        isStreaming: false
      }],
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent relative overflow-hidden font-mono selection:bg-green-500/30 selection:text-green-200">
      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto pt-4 pb-40 px-4 md:px-0 scrollbar-hide"
      >
        <div className="max-w-4xl mx-auto w-full">
          <AnimatePresence mode="popLayout">
            {currentChat.messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Floating Status Bar */}
      <div className="absolute top-4 right-4 z-10 hidden md:block">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-black/80 backdrop-blur-sm border border-green-500/30 px-3 py-1.5 flex items-center gap-4 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
        >
          <div className="flex items-center gap-2">
            <Activity className="h-3 w-3 text-green-500 animate-pulse" />
            <span className="text-[10px] font-bold text-green-500/70 uppercase tracking-widest">
              MEM: <span className="text-green-500">{calculateTokens()}</span>
            </span>
          </div>
          <div className="w-px h-3 bg-green-500/20" />
          <div className="flex items-center gap-2">
            <Cpu className="h-3 w-3 text-green-500" />
            <span className="text-[10px] font-bold text-green-500/70 uppercase tracking-widest">
              CPU: <span className="text-green-500">12%</span>
            </span>
          </div>
          <div className="w-px h-3 bg-green-500/20" />
          <div className="flex items-center gap-2">
            <Wifi className="h-3 w-3 text-green-500" />
            <span className="text-[10px] font-bold text-green-500/70 uppercase tracking-widest">
              NET: <span className="text-green-500">LOCAL</span>
            </span>
          </div>
        </motion.div>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-black/90 backdrop-blur-md z-20 border-t border-green-500/20">
        <div className="max-w-4xl mx-auto flex flex-col gap-3">

          {/* Attachment Preview Area */}
          <AnimatePresence>
            {attachments.length > 0 && (
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 10, opacity: 0 }}
                className="flex flex-wrap gap-2 px-2"
              >
                {attachments.map((file) => (
                  <div key={file.id} className="relative group border border-green-500/30 bg-green-500/5 p-2 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500/50" />
                    <span className="text-xs text-green-500 font-mono">{file.name}</span>
                    <button
                      onClick={() => removeAttachment(file.id)}
                      className="ml-2 text-green-500/50 hover:text-red-500 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className={`relative bg-black/50 border-2 transition-all duration-300 ${isFocused ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : 'border-green-500/30'}`}>
            <form onSubmit={handleSendMessage} className="flex flex-col">
              <div className="flex items-start">
                <div className="p-3 pt-4 text-green-500 animate-pulse">
                  <Terminal className="h-4 w-4" />
                </div>
                <Textarea
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    sound.playKeystroke();
                  }}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="enter_command..."
                  className="min-h-[60px] max-h-[200px] w-full bg-transparent border-none focus-visible:ring-0 resize-none text-base text-green-500 placeholder:text-green-900/50 p-3 pl-0 font-mono leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between p-2 bg-green-500/5 border-t border-green-500/10">
                <div className="flex items-center gap-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    multiple
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 w-8 text-green-500/40 hover:text-green-500 hover:bg-green-500/10 rounded-none transition-all"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  type="submit"
                  disabled={!inputValue.trim() && attachments.length === 0}
                  className={`h-8 px-4 rounded-none transition-all duration-300 font-bold uppercase tracking-widest text-xs flex items-center gap-2 ${(inputValue.trim() || attachments.length > 0)
                    ? 'bg-green-500 text-black hover:bg-green-400'
                    : 'bg-green-500/10 text-green-500/20 cursor-not-allowed'
                    }`}
                >
                  <span>EXECUTE</span>
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
