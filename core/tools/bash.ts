import OpenAI from "openai";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import z from "zod";

const TIMEOUT_MS = 120_000;

const execAsync = promisify(exec);

const BashArgs = z.object({
    command: z.string(),
});

export const bashDefinition: OpenAI.Chat.Completions.ChatCompletionTool = {
    type: "function",
    function: {
        name: "bash",
        description:
            "Execute a shell command string with the host user's filesystem, process, and network authority. " +
            "The working directory is the active project root. " +
            `Commands timeout after ${TIMEOUT_MS / 1000} seconds. ` +
            "Output is truncated to 50000 characters. " +
            "Use this for terminal operations like git, npm, docker, etc. " +
            "Do not use for file reading/writing — use read_file / write_file instead.",
        parameters: {
            type: "object",
            properties: {
                command: { type: "string" },
            },
            required: ["command"],
        },
    },
};

export async function runBash(args: unknown): Promise<string> {
    const parsed = BashArgs.safeParse(args);
    if (!parsed.success) return `Error: ${parsed.error.message}`;
    const { command } = parsed.data;
    try {
        const { stdout, stderr } = await execAsync(command, {
            cwd: process.cwd(),
            timeout: TIMEOUT_MS,
        });
        const output = (stdout + stderr).trim();
        return output.slice(0, 50000) || "(no output)";
    } catch (err: any) {
        return `Error: ${err}`;
    }
}
