import { TextAttributes } from "@opentui/core"
import { theme } from "../theme"
import type { TodoItem } from "../types"

export interface TasksPanelProps {
  todos: TodoItem[]
}

export function TasksPanel({ todos }: TasksPanelProps) {
  const active = todos.filter(t => !t.done)
  const done = todos.filter(t => t.done)

  return (
    <box flexShrink={0} flexDirection="column" backgroundColor={theme.color.sidebarBg} padding={1} gap={0}>
      <text fg={theme.color.text} attributes={TextAttributes.BOLD}>
        Tasks ({active.length}/{todos.length})
      </text>
      <box height={1} />
      {todos.length === 0 ? (
        <text fg={theme.color.textDim}>/todo 添加任务</text>
      ) : (
        <>
          {todos.map(t => (
            <text key={t.id} fg={t.done ? theme.color.textDim : theme.color.text}>
              {t.done ? "✓" : "◌"} {t.text}
            </text>
          ))}
        </>
      )}
    </box>
  )
}
