import fs from "node:fs";
import path from "node:path";
import { safeMatter } from "../utils/matter.js";
import { getMemoryDir, getMemoryIndexPath, MemoryEntry, MemoryType } from "./types.js";

function slugify(name: string): string {
    return name.toLowerCase().replace(/\s+/g, "-").replace(/\//g, "-");
}

export function writeMemoryFile(
    name: string,
    memType: MemoryType,
    description: string,
    body: string,
): string {
    const memoryDir = getMemoryDir();
    fs.mkdirSync(memoryDir, { recursive: true });

    const filename = `${slugify(name)}.md`;
    const filepath = path.join(memoryDir, filename);

    const content = `---\nname: ${name}\ndescription: ${description}\ntype: ${memType}\n---\n\n${body}\n`;
    fs.writeFileSync(filepath, content);

    rebuildIndex();
    return filepath;
}

export function rebuildIndex(): void {
    const memoryDir = getMemoryDir();
    const memoryIndex = getMemoryIndexPath();

    fs.mkdirSync(memoryDir, { recursive: true });

    const entries: string[] = [];
    const files = fs.readdirSync(memoryDir)
        .filter(f => f.endsWith(".md") && f !== "MEMORY.md")
        .sort();

    for (const filename of files) {
        const raw = fs.readFileSync(path.join(memoryDir, filename), "utf-8");
        const { data, content } = safeMatter(raw);
        const name = data.name || path.basename(filename, ".md");
        const desc = data.description || content.split("\n")[0].slice(0, 80);
        entries.push(`- [${name}](${filename}) — ${desc}`);
    }

    if (entries.length > 0) {
        fs.writeFileSync(memoryIndex, entries.join("\n") + "\n");
    } else if (fs.existsSync(memoryIndex)) {
        fs.writeFileSync(memoryIndex, "");
    }
}

export function readMemoryIndex(): string {
    const memoryIndex = getMemoryIndexPath();
    if (!fs.existsSync(memoryIndex)) return "";
    return fs.readFileSync(memoryIndex, "utf-8").trim();
}

export function readMemoryFile(filename: string): string | null {
    const memoryDir = getMemoryDir();
    const filepath = path.join(memoryDir, filename);
    if (!fs.existsSync(filepath)) return null;
    return fs.readFileSync(filepath, "utf-8");
}

export function listMemoryFiles(): MemoryEntry[] {
    const memoryDir = getMemoryDir();
    fs.mkdirSync(memoryDir, { recursive: true });

    const result: MemoryEntry[] = [];
    const files = fs.readdirSync(memoryDir)
        .filter(f => f.endsWith(".md") && f !== "MEMORY.md")
        .sort();

    for (const filename of files) {
        const raw = fs.readFileSync(path.join(memoryDir, filename), "utf-8");
        const { data, content } = safeMatter(raw);
        result.push({
            filename,
            name: data.name || path.basename(filename, ".md"),
            description: data.description || "",
            type: (data.type as MemoryType) || "user",
            body: content,
        });
    }

    return result;
}
