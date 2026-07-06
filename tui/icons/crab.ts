import type { IconDefinition } from "./types"

const BODY = "#FF8C00"
const DARK = "#CC7000"
const EYE = "#FFFFFF"

export const crab: IconDefinition = {
  name: "crab",
  description: "小螃蟹",
  rows: [
    [
      { color: BODY, text: " ▐" },
      { color: EYE, text: "▛███▜" },
      { color: BODY, text: "▌" },
    ],
    [
      { color: BODY, text: "▝▜" },
      { color: EYE, text: "█████" },
      { color: BODY, text: "▛▘" },
    ],
    [
      { color: BODY, text: "  ▘▘ ▝▝  " },
    ],
  ],
}
