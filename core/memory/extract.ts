import type OpenAI from "openai";
import { writeMemoryFile, listMemoryFiles } from "./storage.js";
import type { MemoryType, RawMemoryItem } from "./types.js";

type Msg = OpenAI.Chat.Completions.ChatCompletionMessageParam;

const VALID_TYPES: Set<string> = new Set(["user", "feedback", "project", "reference"]);

function collectDialogue(messages: Msg[]): string {
    const parts: string[] = [];
    const recent = messages.slice(-10);
    for (const msg of recent) {
        const role = msg.role;
        const content = typeof msg.content === "string" ? msg.content : String(msg.content ?? "");
        if (content.trim()) {
            parts.push(`${role}: ${content}`);
        }
    }
    return parts.join("\n");
}

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

export async function extractMemories(
    messages: Msg[],
    client: OpenAI,
    model: string,
): Promise<void> {
    const dialogue = collectDialogue(messages);
    if (!dialogue.trim()) return;

    const existing = listMemoryFiles();
    const existingDesc = existing.length > 0
        ? existing.map((m) => `- ${m.name}: ${m.description}`).join("\n")
        : "(none)";

    const prompt =
        "Extract user preferences, constraints, or project facts from this dialogue.\n" +
        "Return a JSON array. Each item: {name, type, description, body}.\n" +
        "- name: short kebab-case identifier (e.g. 'user-preference-tabs')\n" +
        "- type: one of 'user' (user preference), 'feedback' (guidance), " +
        "'project' (project fact), 'reference' (external pointer)\n" +
        "- description: one-line summary for index lookup\n" +
        "- body: full detail in markdown\n" +
        "If nothing new or already covered by existing memories, return [].\n\n" +
        `Existing memories:\n${existingDesc}\n\n` +
        `Dialogue:\n${dialogue.slice(0, 4000)}`;

    try {
        const response = await client.chat.completions.create({
            model,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 800,
        });

        const text = response.choices[0]?.message?.content;
        const items = extractJsonArray(text);
        if (!items || items.length === 0) return;

        let count = 0;
        for (const mem of items) {
            const name = mem.name || `memory_${Date.now()}`;
            const memType: MemoryType = VALID_TYPES.has(mem.type) ? (mem.type as MemoryType) : "user";
            const desc = mem.description || "";
            const body = mem.body || "";
            if (desc && body) {
                writeMemoryFile(name, memType, desc, body);
                count++;
            }
        }
    } catch {

    }
}
