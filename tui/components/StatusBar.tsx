import { TextAttributes } from "@opentui/core"
import { theme } from "../theme"
import type { ContextStats, DiagnosticsCounts } from "../types"

export interface StatusBarProps {
  diagnostics: DiagnosticsCounts
  context: ContextStats
}

function formatTokenShort(tokens: number): string {
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`
  return String(tokens)
}

export function StatusBar({ diagnostics, context }: StatusBarProps) {
  const percentUsed = Math.max(1, Math.round((context.tokens / context.tokenLimit) * 100))

  return (
    <box
      height={theme.layout.statusBarHeight}
      flexShrink={0}
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      paddingLeft={2}
      paddingRight={2}
    >
      <box flexDirection="row" gap={2}>
        <text fg={theme.color.green} attributes={TextAttributes.BOLD}>
          {diagnostics.editorMode}
        </text>
        <text fg={theme.color.textMuted}>{diagnostics.branch}</text>
        <text fg={theme.color.yellow}>{"\u26a0 "}{diagnostics.warnings}</text>
        <text fg={theme.color.yellow}>{"\u26a0 "}{diagnostics.notices}</text>
        <text fg={theme.color.red}>{"\u2297 "}{diagnostics.errors}</text>
      </box>

      <box flexDirection="row" gap={2}>
        <text fg={theme.color.textMuted}>
          {formatTokenShort(context.tokens)} ({percentUsed}%)
        </text>
        <text fg={theme.color.textMuted}>${context.costUsd.toFixed(2)}</text>
      </box>
    </box>
  )
}