import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { sound } from "../utils/audio";
import { ASCII_AI, ASCII_CODE, ASCII_FAMILY, AsciiText } from "./AsciiArt";

const STARTUP_LOGS = [
  "BIOS_CHECK... OK",
  "LOADING_KERNEL... YYC³_OS_v0.9.3",
  "MOUNTING_VIRTUAL_FS... OK",
  "ESTABLISHING_NEURAL_LINK... OK",
  "SYNCING_MEMORY_BANKS... OK",
  "INITIALIZING_UI_SUBSYSTEM... DONE"
];

export function SystemStartup({ onComplete }: { onComplete?: () => void }) {
  const [stage, setStage] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let logInterval: NodeJS.Timeout;

    if (stage === 0) {
      let currentLogIndex = 0;
      logInterval = setInterval(() => {
        if (currentLogIndex < STARTUP_LOGS.length) {
          setLogs(prev => [...prev, STARTUP_LOGS[currentLogIndex]]);
          currentLogIndex++;
          setProgress(prev => prev + (100 / STARTUP_LOGS.length));
          sound.playKeystroke();
        } else {
          clearInterval(logInterval);
          setTimeout(() => {
            setStage(1);
            sound.playSystemNotification();
          }, 500);
        }
      }, 150);
    }

    return () => clearInterval(logInterval);
  }, [stage]);

  useEffect(() => {
    // Stage 1: ASCII Art Reveal
    if (stage === 1) {
      setTimeout(() => {
        setStage(2);
      }, 2500); // Show ASCII for 2.5s
    }
  }, [stage]);

  useEffect(() => {
    if (stage === 2) {
      setTimeout(() => {
        onCompleteRef.current?.();
      }, 500);
    }
  }, [stage]);

  return (
    <div className="fixed inset-0 z-50 bg-black text-green-500 font-mono flex flex-col items-center justify-center p-8 overflow-hidden cursor-wait">
      {/* Background Grid */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(34, 197, 94, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 197, 94, 0.1) 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}
      />

      {/* Scanline Effect */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-green-500/5 to-transparent animate-scanline"></div>

      <div className="z-10 w-full max-w-4xl flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {stage === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md space-y-8"
            >
              <div className="border border-green-500/30 bg-green-500/5 p-8 relative shadow-[0_0_50px_rgba(34,197,94,0.1)]">
                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-green-500"></div>
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-green-500"></div>
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-green-500"></div>
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-green-500"></div>

                <div className="text-center mb-8">
                  <h1 className="text-4xl font-bold tracking-widest text-green-500 mb-2 glitch-text" data-text="YYC³">YYC³</h1>
                  <div className="text-[10px] uppercase tracking-[0.5em] text-green-500/50">AI Assistant OS v0.9.3 [Intelligence]</div>
                </div>

                <div className="space-y-1.5 h-32 font-mono text-xs md:text-sm">
                  {logs.map((log, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 border-l-2 border-green-500/20 pl-2"
                    >
                      <span className="text-green-500/30 font-bold text-[10px]">&gt;</span>
                      <span className={index === logs.length - 1 ? "text-green-400 font-bold animate-pulse" : "text-green-500/80"}>{log}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] uppercase tracking-widest opacity-70">
                  <span>System Loading</span>
                  <span>{Math.min(100, Math.round(progress))}%</span>
                </div>
                <div className="h-1 w-full bg-green-500/10 overflow-hidden">
                  <motion.div
                    className="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                    initial={{ width: "0%" }}
                    animate={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {stage === 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, filter: "blur(10px)" }}
              className="flex flex-col items-center gap-4 md:gap-6 scale-50 md:scale-75 lg:scale-100 origin-center"
            >
              {/* Line 1: CODE (large) */}
              <div className="flex flex-col items-center">
                <AsciiText lines={ASCII_CODE} animate />
              </div>
              {/* Line 2: AI FAMILY (smaller) */}
              <div className="flex items-start gap-4 md:gap-6 scale-75 origin-top">
                <AsciiText lines={ASCII_AI} animate />
                <AsciiText lines={ASCII_FAMILY} animate />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
