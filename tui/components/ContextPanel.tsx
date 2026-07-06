import { TextAttributes } from "@opentui/core"
import { theme } from "../theme"
import type { ContextStats } from "../types"

export interface ContextPanelProps {
  stats: ContextStats
}

export function ContextPanel({ stats }: ContextPanelProps) {
  const percent = Math.min(100, Math.max(0, (stats.tokens / stats.tokenLimit) * 100))
  const displayPercent = Math.max(1, Math.round(percent))

  return (
    <box
      flexShrink={0}
      flexDirection="column"
      backgroundColor={theme.color.sidebarBg}
      padding={1}
      gap={0}
    >
      <text fg={theme.color.text} attributes={TextAttributes.BOLD}>
        Context
      </text>
      <box height={1} />
      <text fg={theme.color.text}>{stats.tokens.toLocaleString()} tokens</text>
      <text fg={theme.color.textMuted}>{displayPercent}% used</text>
      <box height={1} />
      <box flexDirection="row" height={1} width="100%">
        <box width={`${percent}%` as `${number}%`} backgroundColor={theme.color.green} />
        <box flexGrow={1} backgroundColor={theme.color.progressTrack} />
      </box>
    </box>
  )
}