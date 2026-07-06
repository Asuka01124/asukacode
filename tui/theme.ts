export const theme = {
  color: {

    text: "#e6e8eb",
    textMuted: "#7d8590",
    textDim: "#4b5563",

    green: "#3ddc97",
    pinkBright: "#FFC0CB",
    purple: "#9d8cff",
    red: "#ef4566",
    yellow: "#f5a742",
    blue: "#60a5fa",

    appBg: "#0a0a0a",
    sidebarBg: "#141414",
    inputBg: "#1e1e1e",
    paletteBg: "#1e1e1e",
    permissionBg: "#ffddf8",

    paletteHighlight: "#fab283",

    progressTrack: "#161b22",

    // Markdown colors
    heading1: "#FFD700",    // 金色
    heading2: "#87CEEB",    // 天蓝色
    heading3: "#98FB98",    // 浅绿色
    code: "#00FF00",        // 亮绿色
    codeBg: "#1a1a1a",      // 深灰色背景
    emphasis: "#FF69B4",    // 粉色
    link: "#00BFFF",        // 蓝色
    hr: "#666666",          // 灰色
    border: "#444444",      // 边框灰色
  },
  space: {
    xs: 1,
    sm: 1,
    md: 2,
  },
  layout: {
    sidebarWidth: 54,
    headerHeight: 3,
    statusBarHeight: 1,
    
    appMinHeight: 10,
    
    inputMinHeight: 5,
  },
} as const

export type Theme = typeof theme