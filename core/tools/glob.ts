import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";
import z from "zod";

const WORKDIR = process.cwd();

const GlobArgs = z.object({
  pattern: z.string(),
});

export const globDefinition: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "glob",
    description:
      "Find files matching a glob pattern within the working directory. " +
      "Returns relative file paths. " +
      "Supports ** for recursive search and * for wildcard matching. " +
      "Use this to discover files by name pattern before reading them.",
    parameters: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Glob pattern, e.g. '***.js'" },
      },
      required: ["pattern"],
    },
  },
};

function walkGlob(pattern: string): string[] {
  const results: string[] = [];

  if (pattern.includes("**")) {
    const parts = pattern.split("**");
    const prefix = parts[0].replace(/\/$/, "");
    const suffix = parts[1]?.replace(/^\//, "");

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
          walk(full);
        } else if (matchSimple(entry.name, suffix)) {
          results.push(path.relative(WORKDIR, full));
        }
      }
    }

    const startDir = prefix ? path.resolve(WORKDIR, prefix) : WORKDIR;
    walk(startDir);
  } else {
    const dir = path.dirname(pattern);
    const filePat = path.basename(pattern);
    const searchDir = dir === "." ? WORKDIR : path.resolve(WORKDIR, dir);

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(searchDir, { withFileTypes: true });
    } catch {
      return [];
    }
    for (const entry of entries) {
      if (entry.isFile() && matchSimple(entry.name, filePat)) {
        results.push(path.relative(WORKDIR, path.join(searchDir, entry.name)));
      }
    }
  }

  return results;
}

function matchSimple(name: string, pattern: string): boolean {
  const regex = new RegExp(
    "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$",
  );
  return regex.test(name);
}

export async function runGlob(args: unknown): Promise<string> {
  const parsed = GlobArgs.safeParse(args);
  if (!parsed.success) return `Error: ${parsed.error.message}`;
  const { pattern } = parsed.data;
  try {
    const results = walkGlob(pattern);
    const safe = results.filter((p) => {
      const abs = path.resolve(WORKDIR, p);
      return abs.startsWith(WORKDIR);
    });
    return safe.join("\n") || "(no matches)";
  } catch (err: any) {
    return `Error: ${err}`;
  }
}
