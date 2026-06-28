import { theme } from "../theme"

export interface UserMessageProps {
  content: string
}

export function UserMessage({ content }: UserMessageProps) {
  return (
    <box
      flexShrink={0}
      flexDirection="row"
      backgroundColor={theme.color.inputBg}
      paddingLeft={1}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
    >
      <text fg={theme.color.text}>{content}</text>
    </box>
  )
}