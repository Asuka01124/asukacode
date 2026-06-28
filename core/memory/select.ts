import type OpenAI from "openai";
import { listMemoryFiles, readMemoryFile } from "./storage.js";
import { MAX_RELEVANT } from "./types.js";

type Msg = OpenAI.Chat.Completions.ChatCompletionMessageParam;

function collectRecentUserText(messages: Msg[]): string {
    const texts: string[] = [];
    for (let i = messages.length - 1; i >= 0 && texts.length < 3; i--) {
        const msg = messages[i];
        if (msg.role !== "user") continue;
        const content = typeof msg.content === "string" ? msg.content : String(msg.content ?? "");
        if (content.trim()) texts.push(content);
    }
    return texts.reverse().join(" ").slice(0, 2000);
}

function extractJsonArray(text: string | null): number[] | null {
    if (!text) return null;
    const match = text.match(/\[.*?\]/s);
    if (!match) return null;
    try {
        const arr = JSON.parse(match[0]);
        if (Array.isArray(arr) && arr.every((v) => typeof v === "number")) {
            return arr;
        }
    } catch {

    }
    return null;
}

export async function selectRelevantMemories(
    messages: Msg[],
    client: OpenAI,
    model: string,
): Promise<string[]> {
    const files = listMemoryFiles();
    if (files.length === 0) return [];

    const recent = collectRecentUserText(messages);
    if (!recent.trim()) return [];

    const catalogLines = files.map(
        (f, i) => `${i}: ${f.name} — ${f.description}`,
    );
    const catalog = catalogLines.join("\n");

    const prompt =
        "Given the recent conversation and the memory catalog below, " +
        "select the indices of memories that are clearly relevant. " +
        "Return ONLY a JSON array of integers, e.g. [0, 3]. " +
        "If none are relevant, return [].\n\n" +
        `Recent conversation:\n${recent}\n\n` +
        `Memory catalog:\n${catalog}`;

    try {
        const response = await client.chat.completions.create({
            model,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 200,
        });

        const text = response.choices[0]?.message?.content;
        const indices = extractJsonArray(text);

        if (indices) {
            const selected: string[] = [];
            for (const idx of indices) {
                if (idx >= 0 && idx < files.length) {
                    selected.push(files[idx].filename);
                    if (selected.length >= MAX_RELEVANT) break;
                }
            }
            if (selected.length > 0) return selected;
        }
    } catch {

    }

    const keywords = recent
        .split(/\s+/)
        .map((w) => w.toLowerCase())
        .filter((w) => w.length > 3);

    const selected: string[] = [];
    for (const f of files) {
        const text = (f.name + " " + f.description).toLowerCase();
        if (keywords.some((kw) => text.includes(kw))) {
            selected.push(f.filename);
            if (selected.length >= MAX_RELEVANT) break;
        }
    }

    return selected;
}

export async function loadMemories(
    messages: Msg[],
    client: OpenAI,
    model: string,
): Promise<string> {
    const selectedFiles = await selectRelevantMemories(messages, client, model);
    if (selectedFiles.length === 0) return "";

    const parts = ["<relevant_memories>"];
    for (const filename of selectedFiles) {
        const content = readMemoryFile(filename);
        if (content) parts.push(content);
    }
    parts.push("</relevant_memories>");
    return parts.join("\n\n");
}
