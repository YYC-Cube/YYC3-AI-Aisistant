import { useCallback, useEffect, useMemo, useState } from 'react';
import { FONT_OPTIONS, FONT_SIZE_OPTIONS, THEME_COLORS, UISettings } from '../types/storage';

/**
 * UI 设置持久化管理 Hook
 * UI Settings persistence management hook
 *
 * 支持主题色、背景透明度、字体、字号、顶栏文字、系统显示名称等配置
 * Supports theme color, background opacity, font, size, top bar text, system display name, etc.
 */

const STORAGE_KEY = 'yyc3_ui_settings';
const CURRENT_VERSION = 2;

const DEFAULT_SETTINGS: UISettings = {
  theme: 'P1 Matrix',
  themeColorId: 'green',
  bgOpacity: 100,
  scanlines: 15,
  curvature: true,
  fontSize: 'xl',
  fontId: 'vt323',
  animations: true,
  topBarText: 'CODE | AI | FAMILY',
  systemDisplayName: 'YYC\u00b3 AI Assistant',
  version: CURRENT_VERSION,
};

export const useUISettings = () => {
  const [settings, setSettings] = useState<UISettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  /** 加载并迁移设置 / Load and migrate settings */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<UISettings>;

        /** v1 → v2 迁移：补全新增字段 / Migration v1 → v2: fill new fields */
        const migrated: UISettings = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          themeColorId: parsed.themeColorId || DEFAULT_SETTINGS.themeColorId,
          bgOpacity: typeof parsed.bgOpacity === 'number' ? parsed.bgOpacity : DEFAULT_SETTINGS.bgOpacity,
          fontId: parsed.fontId || DEFAULT_SETTINGS.fontId,
          topBarText: parsed.topBarText || DEFAULT_SETTINGS.topBarText,
          systemDisplayName: parsed.systemDisplayName || DEFAULT_SETTINGS.systemDisplayName,
          version: CURRENT_VERSION,
        };

        setSettings(migrated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      }
    } catch {
      /* 静默降级到默认值 / Silent fallback to defaults */
    } finally {
      setLoading(false);
    }
  }, []);

  /** 保存完整设置 / Save complete settings */
  const saveSettings = useCallback((newSettings: UISettings) => {
    try {
      const updated = { ...newSettings, version: CURRENT_VERSION };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSettings(updated);
    } catch {
      /* 写入失败静默处理 / Silent on write failure */
    }
  }, []);

  /** 增量更新设置 / Incremental update settings */
  const updateSettings = useCallback((updates: Partial<UISettings>) => {
    setSettings(prev => {
      const next: UISettings = { ...prev, ...updates, version: CURRENT_VERSION };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* 静默 / Silent */
      }
      return next;
    });
  }, []);

  /** 重置为默认设置 / Reset to default settings */
  const resetSettings = useCallback(() => {
    saveSettings(DEFAULT_SETTINGS);
  }, [saveSettings]);

  /** 计算当前主题色对象 / Compute current theme color object */
  const activeThemeColor = useMemo(
    () => THEME_COLORS.find(c => c.id === settings.themeColorId) || THEME_COLORS[0],
    [settings.themeColorId]
  );

  /** 计算当前字体对象 / Compute current font object */
  const activeFont = useMemo(
    () => FONT_OPTIONS.find(f => f.id === settings.fontId) || FONT_OPTIONS[0],
    [settings.fontId]
  );

  /** 计算当前字号对象 / Compute current font size object */
  const activeFontSize = useMemo(
    () => FONT_SIZE_OPTIONS.find(s => s.id === settings.fontSize) || FONT_SIZE_OPTIONS[4],
    [settings.fontSize]
  );

  return {
    settings,
    loading,
    updateSettings,
    saveSettings,
    resetSettings,
    activeThemeColor,
    activeFont,
    activeFontSize,
  };
};
