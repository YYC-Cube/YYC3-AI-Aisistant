import { Chat } from "./components/Chat";
import { Toaster } from "sonner";
import { useUISettings } from "./hooks/useUISettings";

/**
 * 应用根组件 / Application root component
 *
 * 动态应用 UI 设置（字体、字号、主题色、背景透明度）
 * Dynamically applies UI settings (font, font size, theme color, background opacity)
 */
export default function App() {
  const { settings, activeThemeColor, activeFont, activeFontSize } = useUISettings();

  /** 动态字体 URL 构建 / Build dynamic Google Fonts URL */
  const fontUrls = [
    "https://fonts.googleapis.com/css2?family=VT323&display=swap",
    "https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;700&display=swap",
    "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap",
    "https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;700&display=swap",
    "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap",
  ];

  const themeColor = activeThemeColor.primary;
  const fontFamily = activeFont.family;
  const fontSize = activeFontSize.value;
  const bgOpacity = settings.bgOpacity / 100;

  return (
    <>
      <style>{`
        ${fontUrls.map(u => `@import url('${u}');`).join('\n')}

        /* Global Scrollbar Styling - Dynamic Theme Color */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #000; 
          border-left: 1px solid ${themeColor}1a;
        }
        
        ::-webkit-scrollbar-thumb {
          background: ${themeColor}33; 
          border: 1px solid ${themeColor}4d;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: ${themeColor}80; 
        }

        /* Selection Color */
        ::selection {
          background: ${themeColor}4d;
          color: #fff;
        }

        /* Glitch Animation Keyframes */
        @keyframes glitch {
          0% { transform: translate(0) }
          20% { transform: translate(-2px, 2px) }
          40% { transform: translate(-2px, -2px) }
          60% { transform: translate(2px, 2px) }
          80% { transform: translate(2px, -2px) }
          100% { transform: translate(0) }
        }

        .glitch-text:hover {
          animation: glitch 0.3s cubic-bezier(.25, .46, .45, .94) both infinite;
          color: ${themeColor};
        }

        /* Global Grid Background */
        .hacker-grid-bg {
          background-size: 30px 30px;
          background-image:
            linear-gradient(to right, ${themeColor}0d 1px, transparent 1px),
            linear-gradient(to bottom, ${themeColor}0d 1px, transparent 1px);
          background-attachment: fixed;
        }
        
        /* Dynamic Font & Terminal Blink */
        body, button, input, textarea, pre, code {
          font-family: ${fontFamily} !important;
          letter-spacing: 0.05em;
        }
        
        @keyframes terminal-blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        
        .cursor-blink {
          animation: terminal-blink 1s steps(1) infinite;
        }
      `}</style>
      <div 
        className="dark h-screen w-full font-mono hacker-grid-bg"
        style={{
          backgroundColor: `rgba(0, 0, 0, ${bgOpacity})`,
          color: themeColor,
          fontSize,
        }}
      >
        <Chat />
        <Toaster 
          theme="dark" 
          position="bottom-right" 
          toastOptions={{
            style: {
              background: '#000',
              border: `1px solid ${themeColor}`,
              color: themeColor,
              fontFamily: fontFamily.replace(/'/g, ''),
              borderRadius: '0px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            },
          }}
        />
      </div>
    </>
  );
}
