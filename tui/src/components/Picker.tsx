import { useState } from "react"
import { useKeyboard } from "@opentui/react"
import { theme } from "../theme"

export interface PickerItem {
  id: string
  label: string
  description?: string
}

export interface PickerProps {
  items: PickerItem[]
  onSelect: (id: string) => void
  onCancel: () => void
}

export function Picker({ items, onSelect, onCancel }: PickerProps) {
  const [idx, setIdx] = useState(0)

  useKeyboard((key) => {
    if (key.name === "up") { setIdx(p => (p > 0 ? p - 1 : items.length - 1)); return }
    if (key.name === "down") { setIdx(p => (p < items.length - 1 ? p + 1 : 0)); return }
    if (key.name === "return") { onSelect(items[idx]!.id); return }
    if (key.name === "escape") { onCancel(); return }
  })

  return (
    <box flexDirection="column" flexShrink={0} marginLeft={2} marginRight={2} marginBottom={1}
      backgroundColor={theme.color.paletteBg} padding={1}>
      {items.map((item, i) => (
        <box key={item.id} flexDirection="row" gap={1}
          backgroundColor={i === idx ? theme.color.paletteHighlight : undefined}>
          <text fg={i === idx ? "#000000" : theme.color.text}>
            {item.label}
          </text>
          {item.description && (
            <text fg={i === idx ? "#000000" : theme.color.textDim}>
              {item.description}
            </text>
          )}
        </box>
      ))}
      <box height={1} />
      <text fg={theme.color.textDim}>Enter 选择  Esc 取消</text>
    </box>
  )
}
