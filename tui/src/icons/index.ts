import type { IconDefinition } from "./types"
import { crab } from "./crab"
import { cat } from "./cat"
import { robot } from "./robot"
import { star } from "./star"
import { octopus } from "./octopus"
import { fish } from "./fish"
import { turtle } from "./turtle"
import { ghost } from "./ghost"
import { snail } from "./snail"

export const ICONS: Record<string, IconDefinition> = {
  crab,
  cat,
  robot,
  star,
  octopus,
  fish,
  turtle,
  ghost,
  snail,
}

export const ICON_NAMES = Object.keys(ICONS)

export type { IconDefinition, IconSegment } from "./types"
