import { useState, useEffect } from "react";
import { TextAttributes } from "@opentui/core";
import { theme } from "../theme";
import type { TodoItem } from "../types";

export interface TasksPanelProps {
  todos: TodoItem[];
}

export function TasksPanel({ todos }: TasksPanelProps) {
  const active = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);
  const [blinkPhase, setBlinkPhase] = useState(false);

  const firstActiveId = active.length > 0 ? active[0].id : null;

  useEffect(() => {
    if (!firstActiveId) return;
    const timer = setInterval(() => {
      setBlinkPhase((prev) => !prev);
    }, 500);
    return () => clearInterval(timer);
  }, [firstActiveId]);

  return (
    <box
      flexShrink={0}
      flexDirection="column"
      backgroundColor={theme.color.sidebarBg}
      padding={1}
      gap={0}
    >
      <text fg={theme.color.text} attributes={TextAttributes.BOLD}>
        Tasks ({active.length}/{todos.length})
      </text>
      <box height={1} />
      {todos.length === 0 ? (
        <text fg={theme.color.textDim}>/todo 添加任务</text>
      ) : (
        <>
          {todos.map((t) => {
            const isActive = t.id === firstActiveId;
            const icon = t.done ? "✓" : isActive && blinkPhase ? "•" : "☐";
            const color = t.done ? theme.color.green : theme.color.text;

            return (
              <text key={t.id} fg={color}>
                {icon} {t.text}
              </text>
            );
          })}
        </>
      )}
    </box>
  );
}
