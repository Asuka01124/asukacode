import { TextAttributes } from "@opentui/core"
import { theme } from "../theme"
import type { SessionInfo } from "../types"

export interface SessionPanelProps {
  session: SessionInfo
}

export function SessionPanel({ session }: SessionPanelProps) {
  return (
    <box
      flexShrink={0}
      flexDirection="column"
      backgroundColor={theme.color.sidebarBg}
      padding={1}
      gap={0}
    >
      <text fg={theme.color.text} attributes={TextAttributes.BOLD}>
        Session
      </text>
      <box height={1} />
      <text fg={theme.color.textMuted}>ID: {session.id}</text>
      <text fg={theme.color.text}>
        {session.name || "(新会话)"}
      </text>
    </box>
  )
}