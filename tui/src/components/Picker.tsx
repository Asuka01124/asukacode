import { useState } from "react";
import { theme } from "../theme";
import { InlineSelect, type InlineSelectItem } from "./InlineSelect";

export interface PickerItem {
  id: string;
  label: string;
  description?: string;
}

export interface PickerProps {
  items: PickerItem[];
  onSelect: (id: string) => void;
  onCancel: () => void;
  searchable?: boolean;
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
}

export function Picker({
  items,
  onSelect,
  onCancel,
  searchable = false,
  onSearch,
  searchPlaceholder = "搜索...",
}: PickerProps) {
  const [idx, setIdx] = useState(0);

  const inlineItems: InlineSelectItem[] = items.map((item) => ({
    id: item.id,
    label: item.label,
    description: item.description,
  }));

  return (
    <box
      flexDirection="row"
      flexShrink={0}
      width="100%"
      marginLeft={2}
      marginRight={2}
    >
      <InlineSelect
        items={inlineItems}
        highlightIndex={idx}
        onHighlightChange={setIdx}
        onSelect={(item) => onSelect(item.id)}
        onCancel={onCancel}
        searchable={searchable}
        onSearch={onSearch}
        searchPlaceholder={searchPlaceholder}
        footer={<text fg={theme.color.textDim}>Enter 选择 Esc 取消</text>}
      />
    </box>
  );
}
