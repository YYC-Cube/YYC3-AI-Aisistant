import { CheckCircle, Eye, Heading, Monitor, Palette, Type } from "lucide-react";
import type { useUISettings } from "../../hooks/useUISettings";
import { FONT_OPTIONS, FONT_SIZE_OPTIONS, THEME_COLORS } from "../../types/storage";
import { Input } from "../ui/input";

interface UiUxTabProps {
  uiHook: ReturnType<typeof useUISettings>;
  onUiChange: (key: string, value: string | number | boolean) => void;
}

export function UiUxTab({ uiHook, onUiChange }: UiUxTabProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section>
        <h3 className="text-xs font-bold text-green-500 uppercase tracking-widest mb-6 flex items-center gap-2">
          <Palette className="h-4 w-4" />
          THEME_COLOR_ENGINE
        </h3>
        <div className="p-6 border border-green-500/20 bg-green-500/5 space-y-6">
          <label className="text-[10px] font-bold text-green-500 uppercase tracking-widest flex items-center gap-2">
            <Palette className="h-3 w-3" /> PHOSPHOR_TYPE
          </label>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {THEME_COLORS.map((color) => (
              <button
                key={color.id}
                onClick={() => onUiChange('themeColorId', color.id)}
                className={`relative h-16 flex flex-col items-center justify-center gap-1.5 border transition-all ${uiHook.settings.themeColorId === color.id
                  ? "border-2 scale-[1.05] shadow-lg"
                  : "border-green-500/20 hover:scale-[1.02]"
                  }`}
                style={{
                  borderColor: uiHook.settings.themeColorId === color.id ? color.primary : undefined,
                  boxShadow: uiHook.settings.themeColorId === color.id ? `0 0 20px ${color.primary}30` : undefined,
                }}
              >
                <div
                  className="w-5 h-5 rounded-full border-2"
                  style={{ backgroundColor: color.primary, borderColor: color.primary }}
                />
                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: color.primary }}>
                  {color.label}
                </span>
                {uiHook.settings.themeColorId === color.id && (
                  <div className="absolute top-1 right-1">
                    <CheckCircle className="h-3 w-3" style={{ color: color.primary }} />
                  </div>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 pt-2">
            <span className="text-[10px] text-green-500/50 uppercase tracking-widest">ACTIVE:</span>
            <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: uiHook.activeThemeColor.primary, opacity: 0.6 }} />
            <span className="text-[10px] font-mono" style={{ color: uiHook.activeThemeColor.primary }}>
              {uiHook.activeThemeColor.primary}
            </span>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-bold text-green-500 uppercase tracking-widest mb-6 flex items-center gap-2">
          <Eye className="h-4 w-4" />
          BACKGROUND_OPACITY
        </h3>
        <div className="p-6 border border-green-500/20 bg-green-500/5 space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-green-500 uppercase tracking-widest">BG_ALPHA_LEVEL</label>
            <span className="text-xs font-mono text-green-500">{uiHook.settings.bgOpacity}%</span>
          </div>
          <div className="relative h-3 bg-green-900/20 rounded-full overflow-hidden">
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={uiHook.settings.bgOpacity}
              onChange={(e) => onUiChange('bgOpacity', parseInt(e.target.value))}
              className="absolute w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `repeating-conic-gradient(#888 0% 25%, transparent 0% 50%)`,
                backgroundSize: '8px 8px'
              }}
            />
            <div
              className="absolute h-full bg-green-500/30 rounded-full transition-all"
              style={{ width: `${uiHook.settings.bgOpacity}%` }}
            />
            <div
              className="absolute h-5 w-5 bg-green-500 rounded-full top-1/2 shadow-[0_0_10px_rgba(34,197,94,0.8)] transition-all"
              style={{ left: `${uiHook.settings.bgOpacity}%`, transform: `translate(-50%, -50%)` }}
            />
          </div>
          <p className="text-[10px] text-green-500/40 leading-relaxed">
            * 仅影响主背景层，不影响文字和控件 / Only affects main background layer, not text or controls
          </p>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-bold text-green-500 uppercase tracking-widest mb-6 flex items-center gap-2">
          <Type className="h-4 w-4" />
          TYPOGRAPHY_CONFIG
        </h3>
        <div className="p-6 border border-green-500/20 bg-green-500/5 space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-green-500 uppercase tracking-widest">FONT_FAMILY</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {FONT_OPTIONS.map((font) => (
                <button
                  key={font.id}
                  onClick={() => onUiChange('fontId', font.id)}
                  className={`p-3 border transition-all text-left ${uiHook.settings.fontId === font.id
                    ? "border-green-500 bg-green-500/10"
                    : "border-green-500/20 bg-black hover:border-green-500/50"
                    }`}
                >
                  <div className="text-xs font-bold text-green-500 mb-1">{font.label}</div>
                  <div className="text-[10px] text-green-500/50" style={{ fontFamily: font.family }}>
                    ABCDEFG 0123456
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-green-500 uppercase tracking-widest">TERMINAL_FONT_SIZE</label>
            <div className="flex items-center bg-black border border-green-500/20 p-1">
              {FONT_SIZE_OPTIONS.map((size) => (
                <button
                  key={size.id}
                  onClick={() => onUiChange('fontSize', size.id)}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest transition-all ${uiHook.settings.fontSize === size.id
                    ? "bg-green-500 text-black"
                    : "text-green-500/40 hover:text-green-500"
                    }`}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-bold text-green-500 uppercase tracking-widest mb-6 flex items-center gap-2">
          <Heading className="h-4 w-4" />
          IDENTITY_CONFIG
        </h3>
        <div className="p-6 border border-green-500/20 bg-green-500/5 space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-green-500 uppercase tracking-widest">SYSTEM_DISPLAY_NAME</label>
            <Input
              value={uiHook.settings.systemDisplayName}
              onChange={(e) => onUiChange('systemDisplayName', e.target.value)}
              placeholder="YYC³ AI Family"
              maxLength={40}
              className="bg-green-500/5 border-green-500/20 text-green-500 font-mono h-10 rounded-none focus-visible:ring-0 focus-visible:border-green-500/50 text-sm"
            />
            <p className="text-[10px] text-green-500/40">
              显示在系统启动和侧栏标题 / Displayed in system startup and sidebar header
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-green-500 uppercase tracking-widest">TOP_BAR_LABEL</label>
            <Input
              value={uiHook.settings.topBarText}
              onChange={(e) => onUiChange('topBarText', e.target.value)}
              placeholder="CODE | AI | FAMILY"
              maxLength={60}
              className="bg-green-500/5 border-green-500/20 text-green-500 font-mono h-10 rounded-none focus-visible:ring-0 focus-visible:border-green-500/50 text-sm"
            />
            <p className="text-[10px] text-green-500/40">
              便于本地协同识别不同实例 / Helps identify different instances in local collaboration
            </p>
          </div>

          <div className="p-4 border border-dashed border-green-500/15 bg-black">
            <label className="text-[9px] font-bold text-green-500/40 uppercase tracking-widest mb-3 block">LIVE_PREVIEW</label>
            <div className="flex items-center gap-4 text-green-500 font-mono tracking-widest select-none">
              {uiHook.settings.topBarText.split('|').map((seg, i, arr) => (
                <span key={i} className="flex items-center gap-4">
                  <span className="text-lg font-black drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]">
                    {seg.trim()}
                  </span>
                  {i < arr.length - 1 && <span className="text-green-500/30 text-lg">|</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-bold text-green-500/50 uppercase tracking-widest mb-6 flex items-center gap-2">
          <Monitor className="h-4 w-4" />
          VISUAL_FX
        </h3>
        <div className="p-6 border border-green-500/20 bg-green-500/5 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex justify-between">
                <label className="text-[10px] font-bold text-green-500 uppercase tracking-widest">SCANLINE_INTENSITY</label>
                <span className="text-xs font-mono text-green-500">{uiHook.settings.scanlines}%</span>
              </div>
              <div className="relative h-2 bg-green-900/20 rounded-full">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={uiHook.settings.scanlines}
                  onChange={(e) => onUiChange('scanlines', parseInt(e.target.value))}
                  className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div
                  className="absolute h-full bg-green-500/20 rounded-full"
                  style={{ width: `${uiHook.settings.scanlines}%` }}
                />
                <div
                  className="absolute h-4 w-4 bg-green-500 rounded-full top-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(34,197,94,0.8)]"
                  style={{ left: `${uiHook.settings.scanlines}%`, transform: `translate(-50%, -50%)` }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center h-full pt-6">
                <label className="text-[10px] font-bold text-green-500 uppercase tracking-widest">CRT_CURVATURE_FX</label>
                <button
                  onClick={() => onUiChange('curvature', !uiHook.settings.curvature)}
                  className={`w-12 h-6 rounded-full border transition-all relative ${uiHook.settings.curvature ? "bg-green-500/20 border-green-500" : "bg-black border-green-500/20"}`}
                >
                  <div className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-green-500 rounded-full transition-all ${uiHook.settings.curvature ? "right-1" : "left-1 opacity-50"}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-green-500/10">
            <label className="text-[10px] font-bold text-green-500 uppercase tracking-widest">ANIMATION_ENGINE</label>
            <button
              onClick={() => onUiChange('animations', !uiHook.settings.animations)}
              className={`w-12 h-6 rounded-full border transition-all relative ${uiHook.settings.animations ? "bg-green-500/20 border-green-500" : "bg-black border-green-500/20"}`}
            >
              <div className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-green-500 rounded-full transition-all shadow-[0_0_10px_rgba(34,197,94,0.8)] ${uiHook.settings.animations ? "right-1" : "left-1 opacity-50"}`} />
            </button>
          </div>

          <div className="flex items-center justify-end p-4 border border-dashed border-green-500/15">
            <button
              onClick={() => uiHook.resetSettings()}
              className="px-3 py-1.5 border border-red-500/30 text-red-500/70 text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 transition-all"
            >
              RESET_DEFAULTS
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
