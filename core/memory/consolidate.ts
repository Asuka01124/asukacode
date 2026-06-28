import fs from "node:fs";
import path from "node:path";
import type OpenAI from "openai";
import { getMemoryDir, CONSOLIDATE_THRESHOLD, MemoryType, RawMemoryItem } from "./types.js";
import { listMemoryFiles, writeMemoryFile } from "./storage.js";

const VALID_TYPES: Set<string> = new Set(["user", "feedback", "project", "reference"]);

function extractJsonArray(text: string | null): RawMemoryItem[] | null {
    if (!text) return null;
    const match = text.match(/\[.*\]/s);
    if (!match) return null;
    try {
        const arr = JSON.parse(match[0]);
        if (Array.isArray(arr)) return arr as RawMemoryItem[];
    } catch {

    }
    return null;
}

export async function consolidateMemories(
    client: OpenAI,
    model: string,
): Promise<void> {
    const files = listMemoryFiles();
    if (files.length < CONSOLIDATE_THRESHOLD) return;

    const catalog = files
        .map(
            (f) =>
                `## ${f.filename}\nname: ${f.name}\ndescription: ${f.description}\n${f.body}`,
        )
        .join("\n\n");

    const prompt =
        "Consolidate the following memory files. Rules:\n" +
        "1. Merge duplicates into one\n" +
        "2. Remove outdated/contradicted memories\n" +
        "3. Keep the total under 30 memories\n" +
        "4. Preserve important user preferences above all\n" +
        "Return a JSON array. Each item: {name, type, description, body}.\n\n" +
        `${catalog.slice(0, 16_000)}`;

    try {
        const response = await client.chat.completions.create({
            model,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 3000,
        });

        const text = response.choices[0]?.message?.content;
        const items = extractJsonArray(text);
        if (!items || items.length === 0) return;

        const memoryDir = getMemoryDir();
        for (const f of fs.readdirSync(memoryDir)) {
            if (f.endsWith(".md") && f !== "MEMORY.md") {
                fs.unlinkSync(path.join(memoryDir, f));
            }
        }

        for (const mem of items) {
            const name = mem.name || `memory_${Date.now()}`;
            const memType: MemoryType = VALID_TYPES.has(mem.type)
                ? (mem.type as MemoryType)
                : "user";
            const desc = mem.description || "";
            const body = mem.body || "";
            if (desc && body) {
                writeMemoryFile(name, memType, desc, body);
            }
        }
    } catch {

    }
}
