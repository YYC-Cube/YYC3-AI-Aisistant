import { useMemo } from "react";
import { Chat } from "./components/Chat";
import { Toaster } from "sonner";
import { useUISettings } from "./hooks/useUISettings";

const FONT_LINKS = [
  "https://fonts.googleapis.com/css2?family=VT323&display=swap",
  "https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;700&display=swap",
  "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap",
  "https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;700&display=swap",
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap",
];

const STATIC_CSS = `
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: #000; }
  ::-webkit-scrollbar-thumb { background: #333; border: 1px solid #555; }
  ::-webkit-scrollbar-thumb:hover { background: #666; }
  @keyframes glitch {
    0% { transform: translate(0) }
    20% { transform: translate(-2px, 2px) }
    40% { transform: translate(-2px, -2px) }
    60% { transform: translate(2px, 2px) }
    80% { transform: translate(2px, -2px) }
    100% { transform: translate(0) }
  }
  @keyframes terminal-blink {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0; }
  }
  .cursor-blink { animation: terminal-blink 1s steps(1) infinite; }
`;

export default function App() {
  const { settings, activeThemeColor, activeFont, activeFontSize } = useUISettings();

  const themeColor = activeThemeColor.primary;
  const fontFamily = activeFont.family;
  const fontSize = activeFontSize.value;
  const bgOpacity = settings.bgOpacity / 100;

  const dynamicCss = useMemo(() => `
    ${STATIC_CSS}
    ::-webkit-scrollbar-track { border-left: 1px solid ${themeColor}1a; }
    ::-webkit-scrollbar-thumb { background: ${themeColor}33; border: 1px solid ${themeColor}4d; }
    ::-webkit-scrollbar-thumb:hover { background: ${themeColor}80; }
    ::selection { background: ${themeColor}4d; color: #fff; }
    .glitch-text:hover { animation: glitch 0.3s cubic-bezier(.25,.46,.45,.94) both infinite; color: ${themeColor}; }
    .hacker-grid-bg {
      background-size: 30px 30px;
      background-image:
        linear-gradient(to right, ${themeColor}0d 1px, transparent 1px),
        linear-gradient(to bottom, ${themeColor}0d 1px, transparent 1px);
      background-attachment: fixed;
    }
    body, button, input, textarea, pre, code {
      font-family: ${fontFamily} !important;
      letter-spacing: 0.05em;
    }
  `, [themeColor, fontFamily]);

  const toasterStyle = useMemo(() => ({
    background: '#000',
    border: `1px solid ${themeColor}`,
    color: themeColor,
    fontFamily: fontFamily.replace(/'/g, ''),
    borderRadius: '0px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em'
  }), [themeColor, fontFamily]);

  return (
    <>
      {FONT_LINKS.map(href => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      <style>{dynamicCss}</style>
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
          toastOptions={{ style: toasterStyle }}
        />
      </div>
    </>
  );
}
