import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";
import { safePath } from "./safe_path.js";
import z from "zod";

const WriteFileArgs = z.object({
    path: z.string(),
    content: z.string(),
});

export const writeFileDefinition: OpenAI.Chat.Completions.ChatCompletionTool = {
    type: "function",
    function: {
        name: "write_file",
        description:
            "Write content to a file. " +
            "Creates the file if it does not exist, overwrites if it does. " +
            "Parent directories are created automatically. " +
            "Relative paths resolve from the current working directory. " +
            "Do not use this for editing — use edit_file for partial changes.",
        parameters: {
            type: "object",
            properties: {
                path: { type: "string", description: "The path to the file to write" },
                content: { type: "string", description: "Content to write to the file" },
            },
            required: ["path", "content"],
        },
    },
};

export async function runWrite(args: unknown): Promise<string> {
    const parsed = WriteFileArgs.safeParse(args);
    if (!parsed.success) return `Error: ${parsed.error.message}`;
    const { path: filePath, content } = parsed.data;
    try {
        const resolved = safePath(filePath);
        fs.mkdirSync(path.dirname(resolved), { recursive: true });
        fs.writeFileSync(resolved, content);
        return `Wrote ${content.length} bytes to ${filePath}`;
    } catch (err: any) {
        return `Error: ${err}`;
    }
}
