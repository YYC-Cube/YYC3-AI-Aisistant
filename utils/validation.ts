/**
 * @file 数据验证工具
 * @description 提供类型安全的数据验证函数，用于 localStorage 数据水合
 * @module utils/validation
 * @version 0.9.3
 * @since Intelligence
 *
 * Data Validation Utilities
 * Provides type-safe data validation functions for localStorage data hydration
 */

import { Chat, AIConfig, UISettings } from '../types/storage';

/**
 * 验证聊天数据结构
 * Validate chat data structure
 *
 * @param {unknown} data - 待验证数据 / Data to validate
 * @returns {boolean} 是否为有效 Chat 对象 / Whether it is a valid Chat object
 */
export function validateChat(data: unknown): data is Chat {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    Array.isArray(obj.messages) &&
    (obj.createdAt instanceof Date || typeof obj.createdAt === 'string') &&
    (obj.updatedAt instanceof Date || typeof obj.updatedAt === 'string')
  );
}

/**
 * 验证 AI 配置数据结构
 * Validate AI configuration data structure
 *
 * @param {unknown} data - 待验证数据 / Data to validate
 * @returns {boolean} 是否为有效 AIConfig 对象 / Whether it is a valid AIConfig object
 */
export function validateAIConfig(data: unknown): data is AIConfig {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    ['openai', 'ollama', 'anthropic', 'zhipu', 'qwen', 'deepseek'].includes(obj.provider as string) &&
    typeof obj.baseUrl === 'string'
  );
}

/**
 * 验证 UI 设置数据结构
 * Validate UI settings data structure
 *
 * @param {unknown} data - 待验证数据 / Data to validate
 * @returns {boolean} 是否为有效 UISettings 对象 / Whether it is a valid UISettings object
 */
export function validateUISettings(data: unknown): data is UISettings {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.theme === 'string' &&
    typeof obj.scanlines === 'number' &&
    typeof obj.curvature === 'boolean'
  );
}
