import fs from "node:fs"
import { make } from "./syscontext.js"
import { register } from "./registry.js"
import { readMemoryIndex } from "../memory/storage.js"
import { getMemoryDir } from "../memory/types.js"

interface MemoryData {
  index: string
  hasMemories: boolean
}

function renderMemoryIndex(data: MemoryData): string {
  if (!data.hasMemories) {
    return "No memories are currently stored. Memories will be automatically extracted from conversations."
  }

  return [
    "Memories available:",
    data.index,
    "",
    "Respect user preferences from memory.",
    "When the user says 'remember' or expresses a clear preference, extract it as a memory.",
  ].join("\n")
}

function hasMemories(): boolean {
  const memoryDir = getMemoryDir()
  if (!fs.existsSync(memoryDir)) return false

  const files = fs.readdirSync(memoryDir).filter((f) => f.endsWith(".md"))
  return files.length > 0
}

const memoryGuidanceSource = make<MemoryData>({
  key: "core/memory-guidance",
  load: async () => {
    const index = readMemoryIndex()

    return {
      index,
      hasMemories: hasMemories(),
    }
  },
  baseline: (data) => renderMemoryIndex(data),
  update: (_previous, current) => {
    if (!current.hasMemories) {
      return "Memory index is no longer available."
    }
    return `Memory index has been updated:\n\n${renderMemoryIndex(current)}`
  },
  removed: () => "Memory guidance is no longer available.",
})

export function registerMemoryGuidance(): void {
  register({
    key: "core/memory-guidance",
    load: async () => memoryGuidanceSource,
  })
}
