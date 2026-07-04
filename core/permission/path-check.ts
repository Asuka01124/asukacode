import path from "node:path"
import fs from "node:fs"

export interface PathCheckResult {
  safe: boolean
  reason?: "relative_escape" | "location_escape" | "external"
  resolved?: string
}

export function checkPath(
  filepath: string,
  workdir: string,
  projectDir: string,
): PathCheckResult {
  const resolved = path.resolve(workdir, filepath)
  const lexicallyInternal =
    resolved.startsWith(projectDir + path.sep) || resolved === projectDir

  if (!path.isAbsolute(filepath) && !lexicallyInternal) {
    return { safe: false, reason: "relative_escape", resolved }
  }

  try {
    const real = fs.realpathSync(resolved)
    if (!real.startsWith(projectDir + path.sep) && real !== projectDir) {
      return { safe: false, reason: "location_escape", resolved: real }
    }
  } catch {
    if (!lexicallyInternal) {
      return { safe: false, reason: "external", resolved }
    }
  }

  return { safe: true, resolved }
}

export function containsPath(filepath: string, projectDir: string): boolean {
  const resolved = path.resolve(projectDir, filepath)
  return resolved.startsWith(projectDir + path.sep) || resolved === projectDir
}
