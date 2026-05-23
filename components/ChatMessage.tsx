import { motion } from "framer-motion";
import { useState, forwardRef } from "react";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isStreaming?: boolean;
}

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = forwardRef<HTMLDivElement, ChatMessageProps>(({ message }, ref) => {
  const { isUser, text, isStreaming } = message;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const code = part.replace(/```/g, '').trim();
        const lang = code.split('\n')[0] || 'text';
        const actualCode = code.includes('\n') ? code.substring(code.indexOf('\n') + 1) : code;
        
        return (
          <div key={index} className="my-4 border border-green-500/30 bg-black font-mono text-xl relative group/code">
            <div className="flex items-center justify-between px-3 py-1 bg-green-500/10 border-b border-green-500/30">
              <span className="text-lg font-bold text-green-500 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500/50"></span>
                {lang}
              </span>
              <button onClick={handleCopy} className="text-green-500/40 hover:text-green-500 transition-colors uppercase text-sm tracking-wider font-bold">
                {copied ? "[COPIED]" : "[COPY]"}
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-green-100/90 leading-relaxed scrollbar-thin scrollbar-thumb-green-500/30 scrollbar-track-transparent">
              <code>{actualCode}</code>
            </pre>
            <div className="absolute bottom-0 right-0 p-1 opacity-0 group-hover/code:opacity-100 transition-opacity">
              <span className="text-sm text-green-500/30">EOF</span>
            </div>
          </div>
        );
      }
      return <p key={index} className="whitespace-pre-wrap mb-4 last:mb-0 text-green-50/90 leading-relaxed font-mono tracking-wide text-2xl">{part}</p>;
    });
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full mb-8 px-2 md:px-0 font-mono"
    >
      <div className="flex flex-col gap-1">
        {/* Header/Prompt Line */}
        <div className="flex items-center gap-2 select-none mb-1">
          <span className={`text-lg font-bold ${isUser ? "text-blue-400" : "text-green-500"}`}>
            {isUser ? "user@local" : "system@claude"}
          </span>
          <span className="text-gray-600 text-lg">:</span>
          <span className="text-blue-300 text-lg">~</span>
          <span className="text-gray-600 text-lg">$</span>
          <span className="text-sm text-gray-500 uppercase tracking-widest ml-2 opacity-50">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
          </span>
        </div>

        {/* Message Body */}
        <div className={`pl-0 ${isUser ? "text-blue-100" : "text-green-100"} border-l-2 ${isUser ? "border-blue-500/30 pl-4" : "border-green-500/30 pl-4"}`}>
          {/* Thinking State */}
          {!isUser && isStreaming && text.length === 0 && (
             <div className="flex items-center gap-2 text-green-500/50 animate-pulse">
               <span className="w-2 h-4 bg-green-500/50"></span>
               <span className="text-sm uppercase tracking-widest">COMPUTING_TENSORS...</span>
             </div>
          )}

          {renderContent(text)}
          
          {isStreaming && (
            <span className="inline-block w-2.5 h-5 bg-green-500 animate-pulse align-middle ml-1 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
          )}

          {/* Actions Footer */}
          {!isUser && !isStreaming && (
            <div className="flex items-center gap-4 mt-4 pt-2 border-t border-dashed border-green-500/20 opacity-50 hover:opacity-100 transition-opacity w-fit">
              <button onClick={handleCopy} className="text-sm text-green-500/50 hover:text-green-500 uppercase tracking-widest flex items-center gap-1">
                <span className="text-green-500">[</span>
                {copied ? "ACK" : "CPY"}
                <span className="text-green-500">]</span>
              </button>
              <button className="text-sm text-green-500/50 hover:text-green-500 uppercase tracking-widest flex items-center gap-1">
                <span className="text-green-500">[</span>RTRY<span className="text-green-500">]</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

ChatMessage.displayName = "ChatMessage";
