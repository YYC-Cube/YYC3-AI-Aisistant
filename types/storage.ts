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
  channelId?: string; // Optional channel ID for filtering
}

export interface AIConfig {
  provider: 'openai' | 'ollama' | 'anthropic' | 'zhipu';
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  version: number;
}

/**
 * 主题色配置 / Theme color configuration
 * 定义可用的终端色彩方案
 */
export interface ThemeColorConfig {
  /** 主题标识 / Theme identifier */
  id: string;
  /** 显示名称 / Display label */
  label: string;
  /** CSS 颜色值 / CSS color value */
  primary: string;
  /** Tailwind class 前缀 / Tailwind class prefix */
  twClass: string;
}

/** 预定义主题色列表 / Predefined theme colors */
export const THEME_COLORS: ThemeColorConfig[] = [
  { id: "green", label: "P1 Matrix", primary: "#22c55e", twClass: "green" },
  { id: "emerald", label: "P2 Emerald", primary: "#10b981", twClass: "emerald" },
  { id: "cyan", label: "C1 Cyan", primary: "#06b6d4", twClass: "cyan" },
  { id: "amber", label: "P3 Amber", primary: "#f59e0b", twClass: "amber" },
  { id: "lime", label: "L1 Lime", primary: "#84cc16", twClass: "lime" },
  { id: "violet", label: "V1 Violet", primary: "#8b5cf6", twClass: "violet" },
];

/** 可选字体列表 / Available font families */
export const FONT_OPTIONS = [
  { id: "vt323", label: "VT323 (Pixel)", family: "'VT323', monospace" },
  { id: "fira", label: "Fira Code", family: "'Fira Code', monospace" },
  { id: "jetbrains", label: "JetBrains Mono", family: "'JetBrains Mono', monospace" },
  { id: "source", label: "Source Code Pro", family: "'Source Code Pro', monospace" },
  { id: "ibm", label: "IBM Plex Mono", family: "'IBM Plex Mono', monospace" },
];

/** 字号等级 / Font size levels */
export const FONT_SIZE_OPTIONS = [
  { id: "xs", label: "XS (12px)", value: "12px", twClass: "text-xs" },
  { id: "sm", label: "SM (14px)", value: "14px", twClass: "text-sm" },
  { id: "md", label: "MD (16px)", value: "16px", twClass: "text-base" },
  { id: "lg", label: "LG (18px)", value: "18px", twClass: "text-lg" },
  { id: "xl", label: "XL (20px)", value: "20px", twClass: "text-xl" },
];

export interface UISettings {
  /** 主题标识 / Theme identifier */
  theme: string;
  /** 主题色 ID / Theme color ID */
  themeColorId: string;
  /** 背景透明度 (0-100) / Background opacity (0-100) */
  bgOpacity: number;
  /** 扫描线强度 / Scanline intensity */
  scanlines: number;
  /** CRT 曲面效果 / CRT curvature effect */
  curvature: boolean;
  /** 字号等级 ID / Font size level ID */
  fontSize: string;
  /** 字体 ID / Font family ID */
  fontId: string;
  /** 动画开关 / Animations enabled */
  animations: boolean;
  /** 自定义顶栏文字 / Custom top bar text */
  topBarText: string;
  /** 自定义系统显示名称 / Custom system display name */
  systemDisplayName: string;
  /** 版本号 / Settings version */
  version: number;
}