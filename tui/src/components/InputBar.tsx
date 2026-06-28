import { useState, useCallback, useRef } from "react"
import { TextAttributes } from "@opentui/core"
import { useKeyboard } from "@opentui/react"
import { theme } from "../theme"
import type { CommandPaletteItem, InputTrigger, TriggerChar } from "../types"

export interface InputBarPropsExtended {
  onSubmit: (value: string) => void
  placeholder?: string
  focused?: boolean
  busy?: boolean
  mode?: string
  model?: string
  slashItems?: CommandPaletteItem[]
  mentionItems?: CommandPaletteItem[]
}

export function InputBar({
  onSubmit,
  placeholder = "",
  focused = false,
  busy = false,
  mode = "chat",
  model = "claude-sonnet-4-6",
  slashItems = [],
  mentionItems = [],
}: InputBarPropsExtended) {
  const textareaRef = useRef<any>(null)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const [trigger, setTrigger] = useState<InputTrigger | null>(null)
  const textRef = useRef("")

  const updateTrigger = useCallback((text: string) => {
    textRef.current = text
    const lastSlash = text.lastIndexOf("/")
    const lastAt = text.lastIndexOf("@")
    let type: TriggerChar
    let startIndex: number
    if (lastSlash > lastAt) { type = "/"; startIndex = lastSlash }
    else if (lastAt > lastSlash) { type = "@"; startIndex = lastAt }
    else { setTrigger(null); return }
    setTrigger({ type, query: text.slice(startIndex + 1), startIndex })
    setHighlightIndex(0)
  }, [])

  const getFilteredItems = useCallback((): CommandPaletteItem[] => {
    if (!trigger) return []
    const items = trigger.type === "/" ? slashItems : mentionItems
    if (!trigger.query) return items
    return items.filter((item) =>
      item.label.toLowerCase().includes(trigger.query.toLowerCase()) ||
      item.description?.toLowerCase().includes(trigger.query.toLowerCase()),
    )
  }, [trigger, slashItems, mentionItems])

  const filteredItems = getFilteredItems()
  const paletteOpen = trigger !== null && filteredItems.length > 0

  const closePalette = useCallback(() => {
    setTrigger(null)
  }, [])

  const handlePaletteSelect = useCallback((item: CommandPaletteItem) => {
    if (!trigger) return
    const insertText = item.insertText ?? `${trigger.type}${item.label} `
    const newText = textRef.current.slice(0, trigger.startIndex) + insertText
    textareaRef.current?.setText(newText)
    textRef.current = newText
    closePalette()
  }, [trigger, closePalette])

  const handleSubmit = useCallback(() => {
    if (busy) return
    if (paletteOpen && filteredItems[highlightIndex]) {
      handlePaletteSelect(filteredItems[highlightIndex]!)
      return
    }
    const content = textareaRef.current?.plainText ?? ""
    if (!content.trim()) return
    onSubmit(content)
    textareaRef.current?.setText("")
    textRef.current = ""
    setTrigger(null)
  }, [busy, paletteOpen, filteredItems, highlightIndex, handlePaletteSelect, onSubmit])

  const paletteOpenRef = useRef(paletteOpen); paletteOpenRef.current = paletteOpen
  const filteredItemsRef = useRef(filteredItems); filteredItemsRef.current = filteredItems

  useKeyboard((key) => {
    if (!paletteOpenRef.current) return
    if (key.name === "up") setHighlightIndex((p) => (p > 0 ? p - 1 : filteredItemsRef.current.length - 1))
    if (key.name === "down") setHighlightIndex((p) => (p < filteredItemsRef.current.length - 1 ? p + 1 : 0))
    if (key.name === "escape") closePalette()
  })

  return (
    <box flexDirection="column" flexShrink={0} width="100%" marginLeft={2} marginRight={2} marginBottom={2}>
      {paletteOpen && (
        <box flexDirection="row" flexShrink={0}>
          <box width={3} backgroundColor={theme.color.paletteLeftStrip} flexShrink={0} />
          <box flexDirection="column" flexGrow={1} backgroundColor={theme.color.paletteBg} maxHeight={10} overflow="scroll">
            {filteredItems.map((item, i) => (
              <box key={item.id} flexDirection="row" paddingLeft={1} paddingRight={1}
                backgroundColor={i === highlightIndex ? "#fab283" : undefined}>
                <text fg={i === highlightIndex ? "#000000" : theme.color.text}
                  attributes={i === highlightIndex ? TextAttributes.BOLD : undefined}>{item.label}</text>
                {item.description && (
                  <text fg={i === highlightIndex ? "#000000" : theme.color.textDim} marginLeft={1}>{item.description}</text>
                )}
              </box>
            ))}
          </box>
        </box>
      )}

      <box flexDirection="row" flexShrink={0} width="100%" backgroundColor={theme.color.inputBg}>
        <box width={1} backgroundColor={theme.color.blue} flexShrink={0} />
        <box flexDirection="column" flexGrow={1} paddingLeft={2} paddingRight={2} paddingTop={1}>
          <textarea
            ref={textareaRef}
            height="auto"
            minHeight={3}
            maxHeight={12}
            focused={focused}
            placeholder={placeholder}
            wrapMode="word"
            onContentChange={() => {
              updateTrigger(textareaRef.current?.plainText ?? "")
            }}
            onKeyDown={(e) => {
              if (e.name === "return" && !e.shift) {
                if (busy) return
                e.preventDefault()
                handleSubmit()
              }
            }}
          />
          <box flexDirection="row" justifyContent="space-between" alignItems="flex-end"
            height={2} flexShrink={0} paddingTop={1}>
            <box flexDirection="row" gap={1} >
              <text fg={theme.color.blue}>{mode}</text>
              <text fg={theme.color.textMuted}>·</text>
              <text fg={theme.color.textMuted}>{model}</text>
            </box>
          </box>
        </box>
      </box>
    </box>
  )
}
