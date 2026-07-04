import type { IconDefinition } from "./types"

const YELLOW = "#FBBF24"
const LIGHT = "#FDE68A"

export const star: IconDefinition = {
  name: "star",
  description: "星星",
  rows: [
    [
      { color: YELLOW, text: "        █        " },
    ],
    [
      { color: YELLOW, text: "       ███       " },
    ],
    [
      { color: YELLOW, text: "      █████      " },
    ],
    [
      { color: YELLOW, text: "     ███████     " },
    ],
    [
      { color: LIGHT, text: "█████████████████████" },
    ],
    [
      { color: YELLOW, text: "   ███████████   " },
    ],
    [
      { color: YELLOW, text: "  █████████████  " },
    ],
    [
      { color: YELLOW, text: " ███████████████ " },
    ],
    [
      { color: YELLOW, text: "█████     ██████" },
    ],
    [
      { color: YELLOW, text: "████       ████" },
    ],
  ],
}
