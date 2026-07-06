import { useState, useRef } from "react";
import { theme } from "../theme";
import { InlineSelect, type InlineSelectItem } from "./InlineSelect";

export interface PickerItem {
  id: string;
  label: string;
  description?: string;
}

export interface PickerProps {
  question?: string;
  items: PickerItem[];
  onSelect: (id: string) => void;
  onCancel: () => void;
  searchable?: boolean;
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  showInput?: boolean;
  inputPlaceholder?: string;
  onInputSubmit?: (value: string) => void;
}

export function Picker({
  question,
  items,
  onSelect,
  onCancel,
  searchable = false,
  onSearch,
  searchPlaceholder = "搜索...",
  showInput = false,
  inputPlaceholder = "请输入你的答案...",
  onInputSubmit,
}: PickerProps) {
  const [idx, setIdx] = useState(0);

  const inlineItems: InlineSelectItem[] = items.map((item) => ({
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
    >
      {question && (
        <box backgroundColor={theme.color.inputBg} flexDirection="row">
          <box width={1} backgroundColor={theme.color.yellow} flexShrink={0} />
          <box flexGrow={1} paddingLeft={1} paddingRight={1} paddingTop={1} paddingBottom={1}>
            <text fg={theme.color.yellow}>{question}</text>
          </box>
        </box>
      )}
      <InlineSelect
        items={inlineItems}
        highlightIndex={idx}
        onHighlightChange={setIdx}
        onSelect={(item) => onSelect(item.id)}
        onCancel={onCancel}
        searchable={searchable}
        onSearch={onSearch}
        searchPlaceholder={searchPlaceholder}
        footer={showInput ? undefined : <text fg={theme.color.textDim}>Enter 选择 Esc 取消</text>}
        showInput={showInput}
        inputPlaceholder={inputPlaceholder}
        onInputSubmit={onInputSubmit}
      />
    </box>
  );
}
