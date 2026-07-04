import { theme } from "../theme"
import type { ContextStats, SessionInfo, TodoItem } from "../types"
import { Mascot } from "./Mascot"
import { ContextPanel } from "./ContextPanel"
import { SessionPanel } from "./SessionPanel"
import { TasksPanel } from "./TasksPanel"

export interface SidebarProps {
  context: ContextStats
  session: SessionInfo
  todos: TodoItem[]
  icon?: string
  flexShrink?: number
  overflow?: "hidden" | "scroll" | "visible"
}

export function Sidebar({
  context,
  session,
  todos,
  icon,
  flexShrink = 0,
  overflow = "visible",
}: SidebarProps) {
  return (
    <box
      width={theme.layout.sidebarWidth}
      flexShrink={flexShrink}
      flexDirection="column"
      overflow={overflow}
      backgroundColor={theme.color.sidebarBg}
      marginLeft={2.8}
      paddingTop={1}
      paddingBottom={1}
      paddingLeft={1}
      paddingRight={0}
      gap={1}
    >
      <Mascot icon={icon} />
      <ContextPanel stats={context} />
      <SessionPanel session={session} />
      {todos.length > 0 && <TasksPanel todos={todos} />}
    </box>
  )
}