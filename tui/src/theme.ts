export const theme = {
  color: {

    text: "#e6e8eb",
    textMuted: "#7d8590",
    textDim: "#4b5563",

    green: "#3ddc97",
    pinkBright: "#FFC0CB",
    purple: "#9d8cff",
    red: "#ef4566",
    yellow: "#eab308",
    blue: "#60a5fa",

    appBg: "#0a0a0a",
    sidebarBg: "#141414",
    inputBg: "#1e1e1e",
    paletteBg: "#1e1e1e",
    permissionBg: "#332200",

    paletteLeftStrip: "#2a3038",
    paletteHighlight: "#fab283",

    progressTrack: "#161b22",
  },
  space: {
    xs: 1,
    sm: 1,
    md: 2,
  },
  layout: {
    sidebarWidth: 42,
    headerHeight: 3,
    statusBarHeight: 1,
    
    appMinHeight: 10,
    
    inputMinHeight: 5,
  },
} as const

export type Theme = typeof theme