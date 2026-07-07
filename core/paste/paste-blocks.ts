export interface PasteBlock {
  content: string;
  lines: number;
  extmarkId: number;
}

const pasteBlocks: PasteBlock[] = [];

export function addPasteBlock(
  content: string,
  lines: number,
  extmarkId: number,
): void {
  pasteBlocks.push({ content, lines, extmarkId });
}

export function removePasteBlockByExtmarkId(extmarkId: number): void {
  const idx = pasteBlocks.findIndex((b) => b.extmarkId === extmarkId);
  if (idx >= 0) pasteBlocks.splice(idx, 1);
}

export function expandPasteBlocks(text: string, textarea: any): string {
  const typeId = textarea?.extmarks?.getTypeId?.("paste-block");
  if (typeId == null) return text;
  const marks = textarea.extmarks.getAllForTypeId(typeId) ?? [];
  const blocks = marks
    .map((mark: any) => {
      const block = pasteBlocks.find((b) => b.extmarkId === mark.id);
      return block ? { ...block, start: mark.start, end: mark.end } : null;
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.start - b.start);

  if (blocks.length === 0) return text;

  let result = "";
  let lastEnd = 0;
  for (const block of blocks) {
    const placeholder = makePlaceholder(block.lines);
    const idx = text.indexOf(placeholder, lastEnd);
    if (idx < 0) continue;
    result += text.slice(lastEnd, idx) + block.content;
    lastEnd = idx + placeholder.length;
  }
  result += text.slice(lastEnd);
  return result;
}

export function clearPasteBlocks(): void {
  pasteBlocks.length = 0;
}

export function hasPasteBlocks(): boolean {
  return pasteBlocks.length > 0;
}

export function makePlaceholder(lines: number): string {
  return `[pasted ~${lines} lines]`;
}
