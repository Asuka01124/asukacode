import OpenAI from "openai";
import fs from "node:fs";
import { safePath } from "./safe_path.js";
import z from "zod";

const EditFileArgs = z.object({
    path: z.string(),
    old_text: z.string(),
    new_text: z.string(),
});

export const editFileDefinition: OpenAI.Chat.Completions.ChatCompletionTool = {
    type: "function",
    function: {
        name: "edit_file",
        description:
            "Replace exact text in a file. " +
            "You must match the exact indentation, whitespace, and surrounding code. " +
            "If old_text is not found in the file, the edit fails — read the file first. " +
            "Relative paths resolve from the current working directory. " +
            "Only the first occurrence is replaced. Use replace_all to replace all occurrences.",
        parameters: {
            type: "object",
            properties: {
                path: { type: "string", description: "File path to edit" },
                old_text: { type: "string", description: "Exact text to replace" },
                new_text: { type: "string", description: "Replacement text, must differ from old_text" },
            },
            required: ["path", "old_text", "new_text"],
        },
    },
};

export async function runEdit(args: unknown): Promise<string> {
    const parsed = EditFileArgs.safeParse(args);
    if (!parsed.success) return `Error: ${parsed.error.message}`;
    const { path: filePath, old_text, new_text } = parsed.data;
    try {
        const resolved = safePath(filePath);
        const text = fs.readFileSync(resolved, "utf-8");
        if (!text.includes(old_text)) {
            return `Error: text not found in ${filePath}`;
        }
        fs.writeFileSync(resolved, text.replace(old_text, new_text));
        return `Edited ${filePath}`;
    } catch (err: any) {
        return `Error: ${err}`;
    }
}
