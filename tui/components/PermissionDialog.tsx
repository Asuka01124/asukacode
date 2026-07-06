import { useState } from "react";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { theme } from "../theme";
import type { PermissionPayload } from "../../core/agent/events.js";

interface PermissionDialogProps {
  payload: PermissionPayload;
}

const BOLD = TextAttributes.BOLD;

export function PermissionDialog({ payload }: PermissionDialogProps) {
  const [selected, setSelected] = useState(0);

  useKeyboard((key) => {
    if (key.name === "left") {
      setSelected(0);
      return;
    }
    if (key.name === "right") {
      setSelected(1);
      return;
    }
    if (key.name === "return") {
      if (selected === 0) {
        payload.approve();
      } else {
        payload.deny();
      }
      return;
    }
  });

  return (
    <box
      flexDirection="column"
      flexGrow={1}
      flexShrink={0}
      marginLeft={2}
    >
      <box flexDirection="row">
        <box width={1} backgroundColor={theme.color.text} flexShrink={0} />
        <box
          flexDirection="column"
          flexGrow={1}
          padding={1}
          gap={1}
          backgroundColor={theme.color.permissionBg}
        >
          <text fg={theme.color.textMuted}>
            {`${payload.toolName ?? "unknown"}: ${payload.reason ?? "no reason"}`}
          </text>
          {payload.args && Object.keys(payload.args).length > 0 && (
            <text fg={theme.color.textMuted}>
              Args: {JSON.stringify(payload.args).slice(0, 100)}
            </text>
          )}
          <box flexDirection="row" gap={1}>
            <box
              backgroundColor={
                selected === 0 ? theme.color.green : theme.color.inputBg
              }
              paddingLeft={1}
              paddingRight={1}
            >
              <text
                fg={selected === 0 ? "#000000" : theme.color.green}
                attributes={selected === 0 ? BOLD : 0}
              >
                Allow once
              </text>
            </box>
            <box
              backgroundColor={
                selected === 1 ? theme.color.red : theme.color.inputBg
              }
              paddingLeft={1}
              paddingRight={1}
            >
              <text
                fg={selected === 1 ? "#000000" : theme.color.red}
                attributes={selected === 1 ? BOLD : 0}
              >
                Reject
              </text>
            </box>
            <text fg={theme.color.textDim}>← → 选择 Enter 确认</text>
          </box>
        </box>
      </box>
    </box>
  );
}
