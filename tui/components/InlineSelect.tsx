import { useCallback, useRef, useEffect, useState } from "react";
import { TextAttributes, ScrollBoxRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { theme } from "../theme";

export interface InlineSelectItem {
  id: string;
  label: string;
  description?: string;
}

export interface InlineSelectProps {
  items: InlineSelectItem[];
  highlightIndex: number;
  onHighlightChange: (index: number) => void;
  onSelect: (item: InlineSelectItem) => void;
  onCancel: () => void;

  searchable?: boolean;
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;

  maxHeight?: number;
  highlightColor?: string;

  footer?: React.ReactNode;

  showInput?: boolean;
  inputPlaceholder?: string;
  onInputSubmit?: (value: string) => void;
}

export function InlineSelect({
  items,
  highlightIndex,
  onHighlightChange,
  onSelect,
  onCancel,
  searchable = false,
  onSearch,
  searchPlaceholder = "搜索...",
  maxHeight = 10,
  highlightColor = "#fab283",
  footer,
  showInput = false,
  inputPlaceholder = "请输入你的答案...",
  onInputSubmit,
}: InlineSelectProps) {
  const searchInputRef = useRef<any>(null);
  const scrollboxRef = useRef<ScrollBoxRenderable | null>(null);
  const customInputRef = useRef<any>(null);
  const [inputMode, setInputMode] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const handleSearch = useCallback(
    (query: string) => {
      onSearch?.(query);
      onHighlightChange(0);
    },
    [onSearch, onHighlightChange],
  );

  useEffect(() => {
    if (scrollboxRef.current && items[highlightIndex]) {
      scrollboxRef.current.scrollChildIntoView(items[highlightIndex].id);
    }
  }, [highlightIndex, items]);

  useEffect(() => {
    if (inputMode && customInputRef.current) {
      customInputRef.current.focus?.();
    }
  }, [inputMode]);

  useKeyboard((key) => {
    if (inputMode) {
      if (key.name === "escape") {
        setInputMode(false);
        setInputValue("");
        return;
      }
      return;
    }

    if (key.name === "up") {
      onHighlightChange(
        highlightIndex > 0 ? highlightIndex - 1 : allItems.length - 1,
      );
      return;
    }
    if (key.name === "down") {
      onHighlightChange(
        highlightIndex < allItems.length - 1 ? highlightIndex + 1 : 0,
      );
      return;
    }
    if (key.name === "return") {
      const item = allItems[highlightIndex];
      if (item) {
        if (showInput && item.id === "custom") {
          setInputMode(true);
        } else {
          onSelect(item);
        }
      }
      return;
    }
    if (key.name === "escape") {
      onCancel();
      return;
    }
  });

  const customItem: InlineSelectItem = {
    id: "custom",
    label: inputPlaceholder,
    description: "输入自定义答案",
  };

  const allItems = showInput ? [...items, customItem] : items;

  return (
    <box flexDirection="column" flexShrink={0}>
      {searchable && (
        <box backgroundColor={theme.color.inputBg} flexDirection="row" flexShrink={0}>
          <box width={1} backgroundColor={theme.color.text} flexShrink={0} />
          <box
            flexGrow={1}
            paddingLeft={1}
            paddingRight={1}
            paddingTop={0}
            paddingBottom={0}
          >
            <input
              ref={searchInputRef}
              placeholder={searchPlaceholder}
              onInput={(e) => handleSearch(e)}
              focused={true}
            />
          </box>
        </box>
      )}
      <box flexDirection="row" flexShrink={0}>
        <box width={1} backgroundColor={theme.color.text} flexShrink={0} />
        <scrollbox
          ref={scrollboxRef}
          flexDirection="column"
          flexGrow={1}
          backgroundColor={theme.color.paletteBg}
          maxHeight={maxHeight}
          scrollY={true}
          scrollbarOptions={{ visible: false }}
        >
          {allItems.map((item, i) => (
            <box
              key={item.id}
              id={item.id}
              flexDirection="row"
              paddingLeft={1}
              paddingRight={1}
              backgroundColor={
                i === highlightIndex ? highlightColor : undefined
              }
            >
              <box width={25} flexShrink={0}>
                <text
                  fg={i === highlightIndex ? "#000000" : theme.color.text}
                  attributes={
                    i === highlightIndex ? TextAttributes.BOLD : undefined
                  }
                  overflow="hidden"
                  wrapMode="none"
                >
                  {item.label}
                </text>
              </box>
              {item.description && (
                <box flexGrow={1}>
                  <text
                    fg={i === highlightIndex ? "#000000" : theme.color.textDim}
                    overflow="hidden"
                    wrapMode="none"
                  >
                    {item.description}
                  </text>
                </box>
              )}
            </box>
          ))}
        </scrollbox>
      </box>
      {inputMode && (
        <box backgroundColor={theme.color.inputBg} flexDirection="row">
          <box width={1} backgroundColor={theme.color.yellow} flexShrink={0} />
          <box flexGrow={1} paddingLeft={1} paddingRight={1} paddingTop={0} paddingBottom={0}>
            <input
              ref={customInputRef}
              placeholder={inputPlaceholder}
              onInput={(e) => setInputValue(e)}
              onKeyDown={(e) => {
                if (e.name === "return") {
                  const value = customInputRef.current?.plainText ?? "";
                  if (value.trim()) {
                    onInputSubmit?.(value.trim());
                    setInputMode(false);
                    setInputValue("");
                  }
                }
                if (e.name === "escape") {
                  setInputMode(false);
                  setInputValue("");
                }
              }}
            />
          </box>
        </box>
      )}
      {footer && !inputMode && (
        <box backgroundColor={theme.color.inputBg}>
          <box width={1} backgroundColor={theme.color.text} flexShrink={0} />
          <box
            flexDirection="row"
            flexShrink={0}
            paddingLeft={2}
            paddingRight={2}
          >
            {footer}
          </box>
        </box>
      )}
    </box>
  );
}
