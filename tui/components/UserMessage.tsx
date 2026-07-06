import { theme } from "../theme";

export interface UserMessageProps {
  content: string;
}

export function UserMessage({ content }: UserMessageProps) {
  return (
    <box
      flexShrink={0}
      flexDirection="row"
      width="100%"
      backgroundColor={theme.color.inputBg}
    >
      <box width={1} backgroundColor={theme.color.pinkBright} flexShrink={0} />
      <box paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1}>
        <text fg={theme.color.text}>{content}</text>
      </box>
    </box>
  );
}
