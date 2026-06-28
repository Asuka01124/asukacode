import path from "node:path";
import { getProjectMemoryDir, getProjectMemoryIndexPath } from "../config/project.js";

export function getMemoryDir(): string {
  return getProjectMemoryDir();
}

export function getMemoryIndexPath(): string {
  return getProjectMemoryIndexPath();
}

export const MEMORY_DIR_PLACEHOLDER = ".memory"
export const MEMORY_INDEX_PLACEHOLDER = "MEMORY.md"

export const CONSOLIDATE_THRESHOLD = 10;

export const MAX_RELEVANT = 5;

export type MemoryType = "user" | "feedback" | "project" | "reference";

export interface MemoryEntry {
    filename: string;
    name: string;
    description: string;
    type: MemoryType;
    body: string;
}

export interface RawMemoryItem {
    name: string;
    type: string;
    description: string;
    body: string;
}
