import fs from "node:fs"
import path from "node:path"
import os from "node:os"

const ASUKACODE_HOME = path.join(os.homedir(), ".asukacode")

const PROJECTS_DIR = path.join(ASUKACODE_HOME, "projects")

export function encodePath(dirPath: string): string {
  return dirPath
    .replace(/:/g, "-")
    .replace(/[/\\]/g, "-")
    .replace(/'/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export function getCurrentProjectSlug(): string {
  return encodePath(process.cwd())
}

export function getProjectDir(): string {
  const slug = getCurrentProjectSlug()
  return path.join(PROJECTS_DIR, slug)
}

export function getProjectDBPath(): string {
  return path.join(getProjectDir(), "session.db")
}

export function getProjectMemoryDir(): string {
  return path.join(getProjectDir(), "memory")
}

export function getProjectMemoryIndexPath(): string {
  return path.join(getProjectMemoryDir(), "MEMORY.md")
}

export function ensureProjectDir(): void {
  const projectDir = getProjectDir()
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true })
  }
}

export { ensureProjectDir as ensureProjectDirs }

export function listProjects(): string[] {
  if (!fs.existsSync(PROJECTS_DIR)) return []

  return fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
}

export {
  ASUKACODE_HOME,
  PROJECTS_DIR,
}
