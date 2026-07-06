import { TextAttributes } from "@opentui/core"
import { theme } from "../theme"
import type { AssistantMessageEntry } from "../types"

export interface AssistantMessageProps {
  entry: AssistantMessageEntry
}

export function AssistantMessage({ entry }: AssistantMessageProps) {
  return (
    <box
      flexShrink={0}
      flexDirection="column"
      paddingLeft={1}
      paddingRight={1}
      paddingTop={1}
      paddingBottom={1}
    >
      {entry.heading && (
        <text fg={theme.color.text} attributes={TextAttributes.BOLD} marginBottom={1}>
          {entry.heading}
        </text>
      )}
      {entry.lines.map((line, i) => (
        <text key={i} fg={theme.color.text}>
          {entry.ordered ? `${i + 1}. ${line}` : line}
        </text>
      ))}
    </box>
  )
}