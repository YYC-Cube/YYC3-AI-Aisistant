import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUISettings } from '../../hooks/useUISettings';

describe('useUISettings', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should return default settings on first load', () => {
    const { result } = renderHook(() => useUISettings());
    expect(result.current.settings.themeColorId).toBe('green');
    expect(result.current.settings.fontId).toBe('vt323');
    expect(result.current.loading).toBe(false);
  });

  it('should update settings partially', () => {
    const { result } = renderHook(() => useUISettings());
    act(() => {
      result.current.updateSettings({ bgOpacity: 50 });
    });
    expect(result.current.settings.bgOpacity).toBe(50);
    expect(result.current.settings.themeColorId).toBe('green');
  });

  it('should reset to defaults', () => {
    const { result } = renderHook(() => useUISettings());
    act(() => {
      result.current.updateSettings({ bgOpacity: 30, themeColorId: 'amber' });
    });
    expect(result.current.settings.bgOpacity).toBe(30);
    act(() => {
      result.current.resetSettings();
    });
    expect(result.current.settings.bgOpacity).toBe(100);
    expect(result.current.settings.themeColorId).toBe('green');
  });

  it('should compute activeThemeColor from settings', () => {
    const { result } = renderHook(() => useUISettings());
    expect(result.current.activeThemeColor.id).toBe('green');
    expect(result.current.activeThemeColor).toHaveProperty('primary');
  });

  it('should compute activeFont from settings', () => {
    const { result } = renderHook(() => useUISettings());
    expect(result.current.activeFont.id).toBe('vt323');
    expect(result.current.activeFont).toHaveProperty('family');
  });

  it('should compute activeFontSize from settings', () => {
    const { result } = renderHook(() => useUISettings());
    expect(result.current.activeFontSize).toHaveProperty('value');
  });

  it('should persist settings to localStorage', () => {
    const { result } = renderHook(() => useUISettings());
    act(() => {
      result.current.updateSettings({ scanlines: 50 });
    });
    const stored = JSON.parse(localStorage.getItem('yyc3_ui_settings') || '{}');
    expect(stored.scanlines).toBe(50);
  });

  it('should load settings from localStorage on mount', () => {
    localStorage.setItem('yyc3_ui_settings', JSON.stringify({
      themeColorId: 'cyan', bgOpacity: 80, version: 2,
    }));
    const { result } = renderHook(() => useUISettings());
    expect(result.current.settings.themeColorId).toBe('cyan');
    expect(result.current.settings.bgOpacity).toBe(80);
  });

  it('should handle change theme color', () => {
    const { result } = renderHook(() => useUISettings());
    act(() => {
      result.current.updateSettings({ themeColorId: 'red' });
    });
    expect(result.current.settings.themeColorId).toBe('red');
  });

  it('should handle change font', () => {
    const { result } = renderHook(() => useUISettings());
    act(() => {
      result.current.updateSettings({ fontId: 'fira-code' });
    });
    expect(result.current.settings.fontId).toBe('fira-code');
  });
});
