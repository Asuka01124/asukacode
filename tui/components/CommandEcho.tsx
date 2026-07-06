import { theme } from "../theme"

export interface CommandEchoProps {
  command: string
}

export function CommandEcho({ command }: CommandEchoProps) {
  return (
    <box
      flexShrink={0}
      flexDirection="row"
      alignItems="center"
      gap={1}
      paddingLeft={1}
      paddingRight={1}
      height={3}
    >
      <text fg={theme.color.purple}>{">"}</text>
      <text fg={theme.color.text}>{command}</text>
    </box>
  )
}