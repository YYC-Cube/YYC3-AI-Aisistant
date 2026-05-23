import { motion } from "framer-motion";

const COLORS = [
  "text-green-500",
  "text-green-400",
  "text-green-500",
  "text-green-400",
  "text-green-500",
  "text-green-400"
];

export const ASCII_CODE = [
  "    █████╗  ██████╗ ██████╗ ███████╗",
  "   ██╔════╝██╔═══██╗██╔══██╗██╔════╝",
  "   ██║     ██║   ██║██║  ██║█████╗  ",
  "   ██║     ██║   ██║██║  ██║██╔══╝  ",
  "   ╚██████╗╚██████╔╝██████╔╝███████╗",
  "    ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝"
];

// Reconstructed "AI" based on the style
export const ASCII_AI = [
  " █████╗  ██╗",
  "██╔══██╗ ██║",
  "███████║ ██║",
  "██╔══██║ ██║",
  "██║  ██║ ██║",
  "╚═╝  ╚═╝ ╚═╝"
];

// Reconstructed "FAMILY" based on the style
export const ASCII_FAMILY = [
  "███████╗ █████╗ ███╗   ███╗██╗██╗   ██╗   ██╗",
  "██╔════╝██╔══██╗████╗ ████║██║██║   ╚██╗ ██╔╝",
  "█████╗  ███████║██╔████╔██║██║██║    ╚████╔╝",
  "██╔══╝  ██╔══██║██║╚██╔╝██║██║██║     ╚██╔╝",
  "██║     ██║  ██║██║ ╚═╝ ██║██║███████╗ ██║",
  "╚═╝     ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚══════╝ ╚═╝"
];

interface AsciiTextProps {
  lines: string[];
  className?: string;
  animate?: boolean;
}

export function AsciiText({ lines, className = "", animate = false }: AsciiTextProps) {
  return (
    <div className={`font-mono leading-[1.1] whitespace-pre select-none ${className}`}>
      {lines.map((line, i) => (
        <motion.div
          key={i}
          initial={animate ? { opacity: 0, x: -20 } : undefined}
          animate={animate ? { opacity: 1, x: 0 } : undefined}
          transition={animate ? { delay: i * 0.1 } : undefined}
          className={`${COLORS[i % COLORS.length]} drop-shadow-[0_0_5px_currentColor]`}
        >
          {line}
        </motion.div>
      ))}
    </div>
  );
}