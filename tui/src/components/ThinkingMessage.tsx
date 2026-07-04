import { TextAttributes } from "@opentui/core";
import { theme } from "../theme";
import type { ThinkingEntry } from "../types";

export interface ThinkingMessageProps {
  entry: ThinkingEntry;
  expanded: boolean;
}

export function ThinkingMessage({ entry, expanded }: ThinkingMessageProps) {
  if (entry.lines.length === 0) return null;

  return (
    <box
      flexDirection="column"
      paddingRight={1}
      paddingTop={1}
      paddingBottom={1}
    >
      <text fg={theme.color.paletteHighlight} attributes={TextAttributes.BOLD}>
        {expanded ? "▼ Thinking" : "▶ Thinking"}
      </text>
      {expanded && (
        <box flexDirection="column" paddingLeft={2}>
          {entry.lines.map((line, i) => (
            <text key={i} fg={theme.color.textDim} wrapMode="word">
              {line}
            </text>
          ))}
        </box>
      )}
    </box>
  );
}
