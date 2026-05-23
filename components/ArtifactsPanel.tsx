import { motion, AnimatePresence } from "framer-motion";
import { X, Maximize2, Minimize2, Download, Code, Eye, RefreshCw, Terminal } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";

export type ArtifactType = "code" | "web" | "diagram" | "text";

export interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  content: string;
  language?: string;
}

interface ArtifactsPanelProps {
  artifact: Artifact | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ArtifactsPanel({ artifact, isOpen, onClose }: ArtifactsPanelProps) {
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!artifact) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className={`h-full border-l border-green-500/30 bg-black flex flex-col z-30 shadow-2xl font-mono ${
            isFullscreen ? "fixed inset-0 w-full" : "relative w-full md:w-[500px] lg:w-[700px]"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-green-500/30 bg-black">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-green-500 text-black flex items-center justify-center font-bold">
                <Terminal className="h-3.5 w-3.5" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-xs font-bold text-green-500 uppercase tracking-widest truncate max-w-[200px]">{artifact.title}</h3>
                <p className="text-[9px] text-green-500/50 font-bold uppercase tracking-widest leading-none mt-0.5">
                  PID: {artifact.id.slice(0, 8)} // {artifact.language || artifact.type}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-7 w-7 text-green-500/40 hover:text-green-500 rounded-none hover:bg-green-500/10"
              >
                {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose}
                className="h-7 w-7 text-green-500/40 hover:text-red-500 rounded-none hover:bg-red-500/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-green-500/20 bg-green-500/5">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("preview")}
                className={`flex items-center gap-2 px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all border ${
                  viewMode === "preview" 
                    ? "bg-green-500 text-black border-green-500" 
                    : "text-green-500/50 border-green-500/30 hover:text-green-500"
                }`}
              >
                <Eye className="h-3 w-3" />
                GUI_VIEW
              </button>
              <button
                onClick={() => setViewMode("code")}
                className={`flex items-center gap-2 px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all border ${
                  viewMode === "code" 
                    ? "bg-green-500 text-black border-green-500" 
                    : "text-green-500/50 border-green-500/30 hover:text-green-500"
                }`}
              >
                <Code className="h-3 w-3" />
                SRC_CODE
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-6 text-[9px] font-bold text-green-500/40 hover:text-green-500 uppercase tracking-widest rounded-none">
                <Download className="h-3 w-3 mr-1.5" /> SAVE
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto bg-black relative">
            {/* Grid Background */}
            <div className="absolute inset-0 pointer-events-none opacity-10" 
                 style={{ 
                   backgroundImage: `linear-gradient(to right, #22c55e 1px, transparent 1px), linear-gradient(to bottom, #22c55e 1px, transparent 1px)`,
                   backgroundSize: '20px 20px'
                 }} 
            />
            
            <AnimatePresence mode="wait">
              {viewMode === "preview" ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full w-full flex flex-col items-center justify-center p-8 relative z-10"
                >
                  {artifact.type === "web" ? (
                    <div className="w-full h-full bg-black border border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.1)] flex flex-col">
                      <div className="h-6 bg-green-500/10 border-b border-green-500/30 flex items-center px-2 gap-2">
                        <div className="w-2 h-2 bg-red-500/50" />
                        <div className="w-2 h-2 bg-yellow-500/50" />
                        <div className="w-2 h-2 bg-green-500/50" />
                        <div className="flex-1 text-[9px] text-green-500/40 font-mono text-center truncate">
                          localhost:8080/deploy/v1
                        </div>
                      </div>
                      <iframe 
                        title="artifact-preview"
                        srcDoc={artifact.content} 
                        className="w-full h-full border-none bg-white"
                      />
                    </div>
                  ) : artifact.type === "diagram" ? (
                    <div className="p-10 border border-green-500/30 bg-green-500/5 flex flex-col items-center gap-6">
                      <div className="w-64 h-64 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin flex items-center justify-center">
                         <RefreshCw className="h-10 w-10 text-green-500/50" />
                      </div>
                      <p className="text-green-500 font-bold uppercase tracking-widest animate-pulse">RENDERING_GRAPHICS...</p>
                    </div>
                  ) : (
                    <div className="text-center space-y-4">
                      <div className="w-20 h-20 border border-green-500/30 flex items-center justify-center mx-auto bg-green-500/5">
                        <Code className="h-8 w-8 text-green-500/50" />
                      </div>
                      <p className="text-green-500/50 font-bold uppercase tracking-widest">NO_PREVIEW_AVAILABLE</p>
                      <Button onClick={() => setViewMode("code")} className="bg-green-500/10 text-green-500 border border-green-500/50 rounded-none hover:bg-green-500 hover:text-black">
                        VIEW_SOURCE
                      </Button>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="code"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full p-6 font-mono text-sm text-green-100/80 leading-relaxed overflow-x-auto relative z-10"
                >
                  <pre>
                    <code>{artifact.content}</code>
                  </pre>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Info */}
          <div className="px-4 py-2 border-t border-green-500/30 bg-black flex items-center justify-between z-20">
             <div className="flex items-center gap-2 text-[9px] font-bold text-green-500/40 uppercase tracking-widest">
               <div className="w-1.5 h-1.5 bg-green-500 animate-pulse" />
               SYSTEM_READY
             </div>
             <div className="text-[9px] font-bold text-green-500/20 uppercase tracking-widest">
               ENCRYPTED_CHANNEL
             </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
