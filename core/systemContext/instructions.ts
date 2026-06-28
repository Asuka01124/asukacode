import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import { make } from "./syscontext.js"
import { register } from "./registry.js"

const GLOBAL_INSTRUCTIONS = path.join(os.homedir(), ".asukacode", "Asuka.md")

const PROJECT_INSTRUCTIONS = "AGENTS.md"

function discoverInstructionFiles(): string[] {
  const files: string[] = []

  if (fs.existsSync(GLOBAL_INSTRUCTIONS)) {
    files.push(GLOBAL_INSTRUCTIONS)
  }

  let dir = process.cwd()
  const root = path.parse(dir).root

  while (dir !== root) {
    const candidate = path.join(dir, PROJECT_INSTRUCTIONS)
    if (fs.existsSync(candidate)) {
      files.push(candidate)
      break 
    }
    dir = path.dirname(dir)
  }

  return files
}

function readInstructionFiles(files: string[]): string {
  const parts: string[] = []

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, "utf-8").trim()
      if (content) {
        parts.push(`Instructions from: ${file}\n${content}`)
      }
    } catch {

    }
  }

  return parts.join("\n\n")
}

interface InstructionData {
  files: string[]
  content: string
}

const instructionSource = make<InstructionData>({
  key: "core/instructions",
  load: async () => {
    const files = discoverInstructionFiles()
    const content = files.length > 0 ? readInstructionFiles(files) : ""

    return { files, content: content || "No instruction files found." }
  },
  baseline: (data) => data.content,
  update: (_previous, current) =>
    `These instructions replace all previously loaded ambient instructions.\n\n${current.content}`,
  removed: () => "Previously loaded instructions no longer apply.",
})

export function registerInstructions(): void {
  register({
    key: "core/instructions",
    load: async () => instructionSource,
  })
}
