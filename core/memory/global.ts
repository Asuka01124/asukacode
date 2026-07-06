import fs from "node:fs";
import { getGlobalMemoryPath } from "../config/index.js";

export function readGlobalMemory(): string {
  const memoryPath = getGlobalMemoryPath();
  if (!fs.existsSync(memoryPath)) return "";
  return fs.readFileSync(memoryPath, "utf-8").trim();
}

export function appendToGlobalMemory(content: string): void {
  const memoryPath = getGlobalMemoryPath();
  const timestamp = new Date().toISOString().split("T")[0];
  const entry = `\n\n## ${timestamp}\n\n${content}\n`;

  if (!fs.existsSync(memoryPath)) {
    fs.writeFileSync(memoryPath, `# AsukaCode Global Memory${entry}`, "utf-8");
  } else {
    fs.appendFileSync(memoryPath, entry, "utf-8");
  }
}
