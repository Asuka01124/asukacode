import path from "node:path"

let Parser: any = null
let parser: any = null

export async function initParser(wasmDir: string): Promise<void> {
  const mod = await import("web-tree-sitter")
  Parser = mod.default || mod
  await Parser.init()
  parser = new Parser()
  const wasmPath = path.join(wasmDir, "tree-sitter-bash.wasm")
  const lang = await Parser.Language.load(wasmPath)
  parser.setLanguage(lang)
}

export function parse(command: string): any {
  if (!parser) return null
  try {
    return parser.parse(command)
  } catch {
    return null
  }
}

export interface ScanResult {
  dirs: Set<string>
  fileOps: Set<string>
}

const FILE_COMMANDS = new Set([
  "rm", "cp", "mv", "mkdir", "touch", "chmod", "chown", "cat",
  "sed", "awk", "echo", "tee", "dd", "truncate", "install",
  "ln", "unlink", "mktemp",
])

export function collectPaths(tree: any, cwd: string): ScanResult {
  const scan: ScanResult = {
    dirs: new Set(),
    fileOps: new Set(),
  }

  function walk(node: any) {
    if (node.type === "command") {
      const nameNode = node.childForFieldName("name")
      const cmd = nameNode?.text
      if (cmd && FILE_COMMANDS.has(cmd)) {
        scan.fileOps.add(cmd)
        for (const child of node.children) {
          if (child.type === "argument" || child.type === "word") {
            const text = child.text
            if (text && !text.startsWith("-")) {
              const resolved = path.resolve(cwd, text)
              scan.dirs.add(path.dirname(resolved))
            }
          }
        }
      }
    }
    for (const child of node.children) {
      walk(child)
    }
  }

  walk(tree.rootNode)
  return scan
}
