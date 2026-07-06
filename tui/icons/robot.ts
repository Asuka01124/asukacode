import type { IconDefinition } from "./types"

const GRAY = "#9CA3AF"
const DARK = "#6B7280"
const BLUE = "#60A5FA"
const LIGHT = "#E5E7EB"

export const robot: IconDefinition = {
  name: "robot",
  description: "机器人",
  rows: [
    [
      { color: GRAY, text: "      ████      " },
    ],
    [
      { color: GRAY, text: "    ████████    " },
    ],
    [
      { color: GRAY, text: "   ██████████   " },
    ],
    [
      { color: GRAY, text: "   █" },
      { color: BLUE, text: "██████" },
      { color: GRAY, text: "█   " },
    ],
    [
      { color: GRAY, text: "   █" },
      { color: BLUE, text: "█" },
      { color: LIGHT, text: "██" },
      { color: BLUE, text: "█" },
      { color: LIGHT, text: "██" },
      { color: BLUE, text: "█" },
      { color: GRAY, text: "█   " },
    ],
    [
      { color: GRAY, text: "   ██████████   " },
    ],
    [
      { color: GRAY, text: "   █" },
      { color: DARK, text: "██████" },
      { color: GRAY, text: "█   " },
    ],
    [
      { color: GRAY, text: "   ██████████   " },
    ],
    [
      { color: GRAY, text: "  ████████████  " },
    ],
    [
      { color: GRAY, text: " ██████  ██████ " },
    ],
    [
      { color: GRAY, text: " ████    ████ " },
    ],
  ],
}
