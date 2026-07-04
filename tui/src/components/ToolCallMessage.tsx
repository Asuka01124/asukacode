import { TextAttributes } from "@opentui/core";
import { theme } from "../theme";
import type { ToolCallEntry, ToolCallStatus } from "../types";

export interface ToolCallMessageProps {
  entry: ToolCallEntry;
}

function getToolLabel(name: string): string {
  const labels: Record<string, string> = {
    bash: "Shell",
    read: "Read",
    write: "Write",
    edit: "Edit",
    glob: "Glob",
    grep: "Grep",
    webfetch: "WebFetch",
    load_skill: "Skill",
    compact: "Compact",
    question: "Question",
    task: "Task",
    todowrite: "TodoWrite",
  };
  return labels[name] || name;
}

function getToolColor(status: ToolCallStatus): string {
  switch (status) {
    case "running":
      return theme.color.blue;
    case "completed":
      return theme.color.green;
    case "error":
      return theme.color.red;
    case "denied":
      return theme.color.textMuted;
    default:
      return theme.color.textDim;
  }
}

function formatInput(name: string, input: unknown): string {
  if (!input) return "";
  const str = typeof input === "string" ? input : JSON.stringify(input);
  if (str.length > 80) return str.slice(0, 80) + "...";
  return str;
}

export function ToolCallMessage({ entry }: ToolCallMessageProps) {
  const duration =
    entry.endTime != null
      ? Math.round((entry.endTime - entry.startTime) / 1000)
      : null;

  return (
    <box
      flexDirection="row"
      paddingRight={1}
      paddingTop={0}
      paddingBottom={0}
      gap={1}
    >
      <text fg={theme.color.text} attributes={TextAttributes.BOLD}>
        {getToolLabel(entry.name)}
      </text>
      {entry.input != null && (
        <text fg={theme.color.textMuted} overflow="hidden" wrapMode="none">
          {formatInput(entry.name, entry.input)}
        </text>
      )}
      {entry.status === "running" && <text fg={theme.color.blue}>...</text>}
      {duration != null && (
        <text fg={theme.color.textMuted}>· {duration}s</text>
      )}
      {entry.status === "denied" && <text fg={theme.color.red}>(denied)</text>}
      {entry.status === "error" && <text fg={theme.color.red}>(error)</text>}
    </box>
  );
}
