import { useState, useCallback, useRef } from "react";
import { decodePasteBytes, type PasteEvent } from "@opentui/core";
import { theme } from "../theme";
import type { AgentMode, CommandPaletteItem, InputTrigger } from "../types";
import { InlineSelect, type InlineSelectItem } from "./InlineSelect";
import {
  addPasteBlock,
  expandPasteBlocks,
  clearPasteBlocks,
  makePlaceholder,
} from "../../core/paste/paste-blocks";

const MAX_VISIBLE_LINES = 5;

export interface InputBarPropsExtended {
  onSubmit: (value: string) => void;
  onModeToggle?: () => void;
  placeholder?: string;
  focused?: boolean;
  busy?: boolean;
  mode?: AgentMode;
  running?: boolean;
  model?: string;
  slashItems?: CommandPaletteItem[];
  mentionItems?: CommandPaletteItem[];
}

export function InputBar({
  onSubmit,
  onModeToggle,
  placeholder = "",
  focused = false,
  busy = false,
  mode = "build",
  running = false,
  model = "",
  slashItems = [],
  mentionItems = [],
}: InputBarPropsExtended) {
  const textareaRef = useRef<any>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [trigger, setTrigger] = useState<InputTrigger | null>(null);
  const textRef = useRef("");

  const updateTrigger = useCallback((text: string) => {
    textRef.current = text;
    if (text.startsWith("/")) {
      setTrigger({ type: "/", query: text.slice(1), startIndex: 0 });
      setHighlightIndex(0);
      return;
    }
    if (text.startsWith("@")) {
      setTrigger({ type: "@", query: text.slice(1), startIndex: 0 });
      setHighlightIndex(0);
      return;
    }
    setTrigger(null);
  }, []);

  const getFilteredItems = useCallback((): CommandPaletteItem[] => {
    if (!trigger) return [];
    const items = trigger.type === "/" ? slashItems : mentionItems;
    if (!trigger.query) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(trigger.query.toLowerCase()) ||
        item.description?.toLowerCase().includes(trigger.query.toLowerCase()),
    );
  }, [trigger, slashItems, mentionItems]);

  const filteredItems = getFilteredItems();
  const paletteOpen = trigger !== null && filteredItems.length > 0;

  const closePalette = useCallback(() => {
    setTrigger(null);
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.gotoBufferHome();
    }, 0);
  }, []);

  const handlePaletteSelect = useCallback(
    (item: CommandPaletteItem) => {
      if (!trigger) return;
      const insertText = item.insertText ?? `${trigger.type}${item.label}`;
      if (trigger.type === "/") {
        onSubmit(insertText.trim());
        textareaRef.current?.setText("");
        textRef.current = "";
        closePalette();
      } else {
        const newText =
          textRef.current.slice(0, trigger.startIndex) + insertText + " ";
        textareaRef.current?.setText(newText);
        textRef.current = newText;
        closePalette();
      }
    },
    [trigger, closePalette, onSubmit],
  );

  const handleSubmit = useCallback(() => {
    if (busy) return;
    if (paletteOpen && filteredItems[highlightIndex]) {
      handlePaletteSelect(filteredItems[highlightIndex]!);
      return;
    }
    const content = textareaRef.current?.plainText ?? "";
    if (!content.trim()) return;

    const expanded = expandPasteBlocks(content, textareaRef.current);
    onSubmit(expanded);

    textareaRef.current?.setText("");
    textRef.current = "";
    clearPasteBlocks();
    setTrigger(null);
  }, [
    busy,
    paletteOpen,
    filteredItems,
    highlightIndex,
    handlePaletteSelect,
    onSubmit,
  ]);

  const inlineSelectItems: InlineSelectItem[] = filteredItems.map((item) => ({
    id: item.id,
    label: item.label,
    description: item.description,
  }));

  return (
    <box
      flexDirection="column"
      flexShrink={0}
      width="100%"
      marginLeft={2}
      marginRight={2}
      marginBottom={1}
    >
      {paletteOpen && (
        <InlineSelect
          items={inlineSelectItems}
          highlightIndex={highlightIndex}
          onHighlightChange={setHighlightIndex}
          onSelect={(item) => {
            const original = filteredItems.find((f) => f.id === item.id);
            if (original) handlePaletteSelect(original);
          }}
          onCancel={closePalette}
          searchable={false}
          footer={<text fg={theme.color.textDim}>Enter 选择 Esc 取消</text>}
        />
      )}

      <box
        flexDirection="row"
        flexShrink={0}
        width="100%"
        backgroundColor={theme.color.inputBg}
      >
        <box
          width={1}
          backgroundColor={
            mode === "plan" ? theme.color.yellow : theme.color.blue
          }
          flexShrink={0}
        />
        <box flexDirection="column" flexGrow={1}>
          <textarea
            ref={textareaRef}
            height="auto"
            minHeight={3}
            maxHeight={12}
            marginLeft={2}
            marginRight={1}
            marginTop={1}
            focused={focused}
            placeholder={placeholder}
            wrapMode="word"
            onPaste={(event: PasteEvent) => {
              const text = decodePasteBytes(event.bytes)
                .replace(/\r\n/g, "\n")
                .replace(/\r/g, "\n");
              const lines = text.split("\n");
              event.preventDefault();
              if (lines.length <= MAX_VISIBLE_LINES) {
                textareaRef.current?.insertText(text);
              } else {
                const placeholder = makePlaceholder(lines.length);
                const startOffset =
                  textareaRef.current?.cursorOffset ?? 0;
                textareaRef.current?.insertText(placeholder + " ");
                const typeId =
                  textareaRef.current?.extmarks?.registerType?.(
                    "paste-block",
                  );
                if (typeId != null) {
                  const extmarkId =
                    textareaRef.current.extmarks.create({
                      start: startOffset,
                      end: startOffset + placeholder.length,
                      virtual: true,
                      typeId,
                    });
                  addPasteBlock(text, lines.length, extmarkId);
                }
              }
            }}
            onContentChange={() => {
              updateTrigger(textareaRef.current?.plainText ?? "");
            }}
            onKeyDown={(e) => {
              if (e.name === "return" && !e.shift) {
                if (busy || paletteOpen) return;
                e.preventDefault();
                handleSubmit();
              }
              if (e.name === "tab" && e.shift) {
                e.preventDefault();
                onModeToggle?.();
              }
            }}
          />
          <box
            flexDirection="row"
            justifyContent="space-between"
            flexShrink={0}
            marginLeft={2}
          >
            <box flexDirection="row" gap={1} height={2} alignItems="center">
              <text
                fg={mode === "plan" ? theme.color.yellow : theme.color.blue}
              >
                {mode}
              </text>
              {running && (
                <>
                  <text fg={theme.color.textMuted}>·</text>
                  <text fg={theme.color.green}>running</text>
                </>
              )}
              <text fg={theme.color.textMuted}>·</text>
              <text fg={theme.color.textMuted}>{model}</text>
            </box>
          </box>
        </box>
      </box>
    </box>
  );
}
