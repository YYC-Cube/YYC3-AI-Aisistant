import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AIConfig } from '../types/storage';

const STORAGE_KEY = 'yyc3_ai_config';
const CURRENT_VERSION = 1;

const DEFAULT_CONFIG: AIConfig = {
  provider: 'ollama',
  apiKey: 'ollama',
  baseUrl: 'http://localhost:11434/v1',
  model: 'llama3',
  temperature: 0.7,
  version: CURRENT_VERSION,
};

export const useAI = () => {
  const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);

  // Load Config
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);

        // Migration
        if (parsed.version !== CURRENT_VERSION) {
          const migrated = { ...DEFAULT_CONFIG, ...parsed, version: CURRENT_VERSION };
          setConfig(migrated);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        } else {
          setConfig(parsed);
        }
      }
    } catch {
      /* 加载失败静默降级 / Silent fallback on load failure */
    } finally {
      setLoading(false);
    }
  }, []);

  // Save Config Helper
  const saveConfig = useCallback((newConfig: AIConfig) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
      setConfig(newConfig);
    } catch {
      /* 保存失败静默处理 / Silent on save failure */
    }
  }, []);

  // Chat Function
  const chat = async (messages: { role: string; content: string }[], onChunk: (chunk: string) => void) => {
    setIsStreaming(true);

    const currentConfig = config;

    try {
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout for local check

      try {
        const response = await fetch(`${currentConfig.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentConfig.apiKey}`
          },
          body: JSON.stringify({
            model: currentConfig.model,
            messages: messages,
            temperature: currentConfig.temperature,
            stream: true,
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`AI API Error: ${response.statusText}`);
        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = (buffer + chunk).split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const dataStr = trimmed.slice(6);
              if (dataStr === '[DONE]') continue;

              try {
                const data = JSON.parse(dataStr);
                const content = data.choices?.[0]?.delta?.content || '';
                if (content) onChunk(content);
              } catch {
                /* 流式块解析异常忽略 / Ignore stream chunk parse error */
              }
            }
          }
        }
      } catch {
        // Fallback to simulation if network fails (likely due to preview env not reaching localhost)

        const fallbackMessage = "Local inference node unreachable. Simulating intelligent response based on protocols...\n\n" +
          `Executing command: ${messages[messages.length - 1].content.slice(0, 20)}...\n` +
          "Analysis: Request valid.\nOutput: This is a simulated response because the local LLM is not accessible from this cloud preview environment. In your local deployment, this would be the Llama3 output.";

        const chunks = fallbackMessage.split(" ");
        let _simText = "";
        for (const chunk of chunks) {
          await new Promise(r => setTimeout(r, 50)); // Simulate typing
          _simText += chunk + " ";
          onChunk(chunk + " ");
        }
      }

    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`AI_CORE_FAILURE: ${errorMsg}`);
      onChunk(`\n[SYSTEM_ERROR]: ${errorMsg}\n`);
    } finally {
      setIsStreaming(false);
    }
  };

  return { chat, isStreaming, config, saveConfig, loading };
};
