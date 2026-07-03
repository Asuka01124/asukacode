import { useCallback, useRef, useEffect } from "react";
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
}: InlineSelectProps) {
  const searchInputRef = useRef<any>(null);
  const scrollboxRef = useRef<ScrollBoxRenderable | null>(null);

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

  useKeyboard((key) => {
    if (key.name === "up") {
      onHighlightChange(
        highlightIndex > 0 ? highlightIndex - 1 : items.length - 1,
      );
      return;
    }
    if (key.name === "down") {
      onHighlightChange(
        highlightIndex < items.length - 1 ? highlightIndex + 1 : 0,
      );
      return;
    }
    if (key.name === "return") {
      const item = items[highlightIndex];
      if (item) onSelect(item);
      return;
    }
    if (key.name === "escape") {
      onCancel();
      return;
    }
  });

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
          {items.map((item, i) => (
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
      {footer && (
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
