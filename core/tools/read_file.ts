import OpenAI from "openai";
import fs from "node:fs";
import { safePath } from "./safe_path.js";
import z from "zod";

const ReadFileArgs = z.object({
    path: z.string(),
    limit: z.number().int().optional(),
});

export const readFileDefinition: OpenAI.Chat.Completions.ChatCompletionTool = {
    type: "function",
    function: {
        name: "read_file",
        description:
            "Read a file from the local filesystem. " +
            "You can access any file directly by using this tool. " +
            "If the file does not exist, an error is returned. " +
            "Relative paths resolve from the current working directory. " +
            "Use offset and limit to page through long files.",
        parameters: {
            type: "object",
            properties: {
                path: { type: "string", description: "The path to the file to read" },
                limit: {
                    type: "integer",
                    description: "The number of lines to read. Omit to read the entire file.",
                },
            },
            required: ["path"],
        },
    },
};

export async function runRead(args: unknown): Promise<string> {
    const parsed = ReadFileArgs.safeParse(args);
    if (!parsed.success) return `Error: ${parsed.error.message}`;
    const { path, limit } = parsed.data;
    try {
        const filePath = safePath(path);
        const lines = fs.readFileSync(filePath, "utf-8").split("\n");
        if (limit && limit < lines.length) {
            return lines.slice(0, limit).join("\n") + `\n... (${lines.length - limit} more lines)`;
        }
        return lines.join("\n");
    } catch (err: any) {
        return `Error: ${err}`;
    }
}
