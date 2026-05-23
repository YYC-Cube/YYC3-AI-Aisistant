import { useState, useEffect, useCallback } from "react";

const CONFIG_KEY_PREFIX = "yyc3_config_";

export interface AIConfig {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  temperature: number;
}

const DEFAULT_CONFIG: AIConfig = {
  provider: "ollama",
  model: "llama3",
  apiKey: "ollama",
  baseUrl: "http://localhost:11434/v1",
  temperature: 0.7
};

export const PRESETS: Record<string, Partial<AIConfig>> = {
  "General": { ...DEFAULT_CONFIG },
  "Coding": {
    provider: "anthropic",
    model: "claude-3-opus-20240229",
    temperature: 0.2
  },
  "Creative": {
    provider: "openai",
    model: "gpt-4-turbo",
    temperature: 0.9
  },
  "Local-Secure": {
    provider: "ollama",
    model: "llama3",
    baseUrl: "http://localhost:11434/v1",
    temperature: 0.5
  }
};

export function useChannelConfig(channelId: string) {
  const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${CONFIG_KEY_PREFIX}${channelId}`);
      if (stored) {
        setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(stored) });
      } else {
        setConfig(DEFAULT_CONFIG);
      }
    } catch {
      /* 频道配置加载失败静默处理 / Silent on channel config load failure */
    }
  }, [channelId]);

  const saveConfig = useCallback((newConfig: AIConfig) => {
    localStorage.setItem(`${CONFIG_KEY_PREFIX}${channelId}`, JSON.stringify(newConfig));
    setConfig(newConfig);
  }, [channelId]);

  const applyPreset = useCallback((presetName: string) => {
    const preset = PRESETS[presetName];
    if (preset) {
      saveConfig({ ...config, ...preset });
    }
  }, [config, saveConfig]);

  return {
    config,
    saveConfig,
    applyPreset
  };
}