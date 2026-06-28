import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";
import z from "zod";

const WORKDIR = process.cwd();

const GrepArgs = z.object({
    pattern: z.string(),
    include: z.string().optional(),
    path: z.string().optional(),
});

export const grepDefinition: OpenAI.Chat.Completions.ChatCompletionTool = {
    type: "function",
    function: {
        name: "grep",
        description:
            "Search file contents by regular expression within the working directory. " +
            "Returns file paths, line numbers, and matching lines. " +
            "Use include to filter files by glob pattern (e.g. '*.ts'). " +
            "Use path to narrow the search scope. " +
            "Supports full regex syntax. Limit results to avoid large output.",
        parameters: {
            type: "object",
            properties: {
                pattern: { type: "string", description: "The regex pattern to search for" },
                include: { type: "string", description: "File pattern to include, e.g. '*.{ts,tsx}'" },
                path: { type: "string", description: "Directory path to search in. Defaults to working directory." },
            },
            required: ["pattern"],
        },
    },
};

function grepFiles(pattern: string, include?: string, searchPath?: string): string[] {
    const results: string[] = [];
    const targetDir = searchPath ? path.resolve(WORKDIR, searchPath) : WORKDIR;

    if (!fs.existsSync(targetDir)) return [`Error: path not found: ${targetDir}`];

    const regex = (() => {
        try {
            return new RegExp(pattern, "g");
        } catch {
            return null;
        }
    })();

    if (!regex) return [`Error: invalid regex pattern: ${pattern}`];

    const safeRegex = regex;
    const includeRegex = include ? matchGlobToRegex(include) : null;

    function walk(dir: string) {
        let entries: fs.Dirent[];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
                    walk(full);
                }
            } else if (entry.isFile()) {
                if (includeRegex && !includeRegex.test(entry.name)) continue;
                try {
                    const content = fs.readFileSync(full, "utf-8");
                    const lines = content.split("\n");
                    const relPath = path.relative(WORKDIR, full);
                    for (let i = 0; i < lines.length; i++) {
                        if (safeRegex.test(lines[i])) {
                            const preview = lines[i].trim().slice(0, 200);
                            results.push(`${relPath}:${i + 1}: ${preview}`);
                            if (results.length >= 200) return;
                        }
                    }
                } catch {

                }
            }
        }
    }

    walk(targetDir);
    return results;
}

function matchGlobToRegex(glob: string): RegExp {
    const pattern = glob
        .replace(/\./g, "\\.")
        .replace(/\*/g, ".*")
        .replace(/\?/g, ".");
    return new RegExp(pattern + "$", "i");
}

export async function runGrep(args: unknown): Promise<string> {
    const parsed = GrepArgs.safeParse(args);
    if (!parsed.success) return `Error: ${parsed.error.message}`;
    const { pattern, include, path: searchPath } = parsed.data;

    try {
        const results = grepFiles(pattern, include, searchPath);
        if (results.length === 0) return "(no matches)";
        return results.join("\n");
    } catch (err: any) {
        return `Error: ${err}`;
    }
}
