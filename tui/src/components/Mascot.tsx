import { theme } from "../theme"

const ORANGE = "#FF8C00"
const CREAM = "#FFE0B2"
const GREEN = "#00D26A"
const PINK = "#FF85A2"

type Seg = { color: string; text: string }

const CAT: Seg[][] = [
  // 耳朵
  [{ color: ORANGE, text: "     ████" }],
  // 头顶
  [{ color: ORANGE, text: "    ██████" }],
  // 脸部上
  [
    { color: ORANGE, text: "   ███" },
    { color: CREAM, text: "▓▓▓▓" },
    { color: ORANGE, text: "███" },
  ],
  // 眼睛
  [
    { color: ORANGE, text: "   ██" },
    { color: CREAM, text: "▓" },
    { color: GREEN, text: "▒" },
    { color: CREAM, text: "  " },
    { color: GREEN, text: "▒" },
    { color: CREAM, text: "▓" },
    { color: ORANGE, text: "██" },
  ],
  // 鼻子
  [
    { color: ORANGE, text: "   ██" },
    { color: CREAM, text: "▓" },
    { color: PINK, text: "♥" },
    { color: CREAM, text: "  " },
    { color: PINK, text: "♥" },
    { color: CREAM, text: "▓" },
    { color: ORANGE, text: "██" },
  ],
  // 下巴
  [
    { color: ORANGE, text: "   ██" },
    { color: CREAM, text: "▓▓▓▓" },
    { color: ORANGE, text: "██" },
  ],
  // 身体
  [{ color: ORANGE, text: "    ██████" }],
  // 爪子
  [{ color: ORANGE, text: "     ██ ██" }],
]

export function Mascot() {
  return (
    <box
      height={12}
      flexShrink={0}
      flexDirection="column"
      justifyContent="center"
      backgroundColor={theme.color.sidebarBg}
      paddingLeft={2}
      paddingRight={2}
    >
      <box flexDirection="column" justifyContent="center">
        {CAT.map((row, i) => (
          <box key={i} flexDirection="row" justifyContent="center">
            {row.map((seg, j) => (
              <text key={j} fg={seg.color}>{seg.text}</text>
            ))}
          </box>
        ))}
      </box>
      <text fg={theme.color.pinkBright}>{"~".repeat(27)}</text>
    </box>
  )
}
