import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { useState, useEffect } from "react";
import { sound } from "../utils/audio"; // Import Sound Engine
import { 
  Terminal, 
  Cpu, 
  Code, 
  Shield, 
  Database, 
  Send,
  Zap,
  Globe,
  Paperclip
} from "lucide-react";

interface ClaudeWelcomeProps {
  onSendMessage: (message: string) => void;
  userName?: string;
}

export function ClaudeWelcome({ onSendMessage, userName = "USER" }: ClaudeWelcomeProps) {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [bootSequence, setBootSequence] = useState<string[]>([]);
  const [isBooted, setIsBooted] = useState(false);

  // Boot sequence animation
  useEffect(() => {
    const logs = [
      "INIT_KERNEL...",
      "LOADING_MODULES...",
      "MOUNTING_FS...",
      "CHECKING_PERMISSIONS...",
      "ESTABLISHING_SECURE_LINK...",
      "SYSTEM_READY."
    ];
    
    let delay = 0;
    logs.forEach((log, index) => {
      delay += Math.random() * 300 + 100;
      setTimeout(() => {
        setBootSequence(prev => [...prev, log]);
        if (index === logs.length - 1) setIsBooted(true);
      }, delay);
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      sound.playEnter(); // Play enter sound
      onSendMessage(inputValue.trim());
      setInputValue("");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    sound.playKeystroke(); // Play keystroke sound
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const commands = [
    { icon: Code, label: "DEPLOY_APP", cmd: "deploy --new" },
    { icon: Cpu, label: "SYS_DIAGNOSTIC", cmd: "run diagnostics" },
    { icon: Shield, label: "SECURITY_SCAN", cmd: "scan --deep" },
    { icon: Database, label: "QUERY_DB", cmd: "sql --wizard" },
  ];

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden font-mono text-green-500 selection:bg-green-500/30 selection:text-green-900">
      
      {/* Background Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-10" 
           style={{ 
             backgroundImage: `linear-gradient(to right, #22c55e 1px, transparent 1px), linear-gradient(to bottom, #22c55e 1px, transparent 1px)`,
             backgroundSize: '40px 40px'
           }} 
      />

      <div className="flex-1 flex flex-col items-center justify-center px-4 max-w-4xl mx-auto w-full pb-20 relative z-10">
        
        {/* Boot Sequence / Logo Area */}
        <div className="w-full mb-12 space-y-4">
           {!isBooted ? (
             <div className="space-y-1 font-mono text-xs">
               {bootSequence.map((log, i) => (
                 <div key={i} className="flex items-center gap-2">
                   <span className="text-green-500/50">[{new Date().toLocaleTimeString()}]</span>
                   <span className="text-green-500">{log}</span>
                 </div>
               ))}
               <div className="w-3 h-4 bg-green-500 animate-pulse" />
             </div>
           ) : (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="text-center"
             >
               <div className="flex flex-col items-center justify-center gap-4 mb-6">
                 <div className="inline-block border border-green-500/30 p-4 bg-green-500/5 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                   <Terminal className="w-12 h-12 text-green-500 animate-pulse" />
                 </div>
               </div>
               <p className="text-green-500 text-base md:text-lg tracking-[0.3em] uppercase font-bold text-shadow-glow">
                 WELCOME BACK, {userName}.
               </p>
               <p className="text-green-500/50 text-xs tracking-[0.5em] uppercase mt-2">
                 AWAITING_INSTRUCTION...
               </p>
             </motion.div>
           )}
        </div>

        {/* Command Input */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="w-full max-w-2xl relative"
        >
          <div className={`relative bg-black border-2 transition-all duration-300 ${isFocused ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.2)]' : 'border-green-500/30'}`}>
            
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-3 py-1 bg-green-500/10 border-b border-green-500/20">
               <div className="flex gap-1.5">
                 <div className="w-2 h-2 rounded-full bg-red-500/50" />
                 <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                 <div className="w-2 h-2 rounded-full bg-green-500/50" />
               </div>
               <div className="text-[9px] font-bold text-green-500/40 uppercase tracking-widest">
                 BASH -- 80x24
               </div>
            </div>

            <form onSubmit={handleSubmit} className="p-4">
              <div className="flex items-start gap-2">
                <span className="text-green-500 pt-1 font-bold animate-pulse">{`>`}</span>
                <Textarea
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="enter command or query..."
                  className="min-h-[80px] w-full bg-transparent border-none focus-visible:ring-0 resize-none text-lg text-green-500 placeholder:text-green-500/20 p-0 font-mono leading-relaxed"
                />
              </div>
              
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-green-500/10">
                <div className="flex items-center gap-2">
                   <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-green-500/40 hover:text-green-500 hover:bg-green-500/10 rounded-none">
                     <Paperclip className="h-4 w-4" />
                   </Button>
                   <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-green-500/40 hover:text-green-500 hover:bg-green-500/10 rounded-none">
                     <Globe className="h-4 w-4" />
                   </Button>
                </div>
                
                <Button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className={`h-8 px-6 rounded-none transition-all duration-300 font-bold uppercase tracking-widest text-xs border ${
                    inputValue.trim() 
                      ? 'bg-green-500 text-black border-green-500 hover:bg-green-400' 
                      : 'bg-transparent text-green-500/30 border-green-500/30 cursor-not-allowed'
                  }`}
                >
                  EXECUTE
                  <Send className="h-3 w-3 ml-2" />
                </Button>
              </div>
            </form>
          </div>
        </motion.div>

        {/* Quick Commands */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 w-full max-w-3xl"
        >
          {commands.map((cmd, index) => (
            <button
              key={index}
              onClick={() => onSendMessage(cmd.cmd)}
              className="group flex flex-col items-center gap-3 p-4 border border-green-500/20 hover:border-green-500 hover:bg-green-500/5 transition-all duration-300"
            >
              <div className="p-2 bg-green-500/10 rounded-none group-hover:bg-green-500/20 transition-colors">
                <cmd.icon className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-green-500 uppercase tracking-widest">{cmd.label}</span>
                <span className="text-[9px] text-green-500/40 font-mono mt-1 opacity-0 group-hover:opacity-100 transition-opacity">./{cmd.cmd}</span>
              </div>
            </button>
          ))}
        </motion.div>

        {/* Footer Info */}
        <div className="fixed bottom-6 left-0 right-0 text-center pointer-events-none">
           <div className="flex items-center justify-center gap-6 text-[10px] text-green-500/30 font-bold uppercase tracking-[0.3em]">
             <span className="flex items-center gap-2"><Zap className="w-3 h-3" /> CORE: STABLE</span>
             <span className="w-px h-3 bg-green-500/20" />
             <span>VER: 3.5.0-S</span>
           </div>
        </div>
      </div>
    </div>
  );
}
