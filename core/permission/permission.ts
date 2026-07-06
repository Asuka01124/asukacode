import path from "node:path";
import { pipe, type PermissionPayload, type AgentMode } from "../agent/index.js";
import { match } from "./wildcard.js";
import { parse, collectPaths, initParser } from "./shell-parser.js";
import { checkPath } from "./path-check.js";
import { getCommandPrefix } from "./arity.js";
import type { Ruleset, Effect } from "./schema.js";

const WORKDIR = process.cwd();

let parserInitialized = false;

async function ensureParser(): Promise<void> {
  if (parserInitialized) return;
  try {
    const wasmDir = path.join(
      process.cwd(),
      "node_modules",
      "tree-sitter-bash",
    );
    await initParser(wasmDir);
    parserInitialized = true;
  } catch {
    // Parser initialization failed, continue without AST parsing
  }
}

const DENY_LIST: Ruleset = [
  { action: "bash", resource: "rm -rf /", effect: "deny" },
  { action: "bash", resource: "sudo *", effect: "deny" },
  { action: "bash", resource: "shutdown *", effect: "deny" },
  { action: "bash", resource: "reboot *", effect: "deny" },
  { action: "bash", resource: "mkfs *", effect: "deny" },
  { action: "bash", resource: "dd if=*", effect: "deny" },
  { action: "bash", resource: "mkswap *", effect: "deny" },
  { action: "bash", resource: "swapoff *", effect: "deny" },
  { action: "bash", resource: "swapon *", effect: "deny" },
];

const DEFAULT_RULES: Ruleset = [
  { action: "bash", resource: "rm *", effect: "ask" },
  { action: "bash", resource: "del *", effect: "ask" },
  { action: "bash", resource: "erase *", effect: "ask" },
  { action: "bash", resource: "rd *", effect: "ask" },
  { action: "bash", resource: "rmdir *", effect: "ask" },
  { action: "bash", resource: "chmod *", effect: "ask" },
  { action: "bash", resource: "chown *", effect: "ask" },
  { action: "bash", resource: "mv *", effect: "ask" },
  { action: "bash", resource: "cp *", effect: "ask" },
  { action: "read", resource: "*.env", effect: "ask" },
  { action: "read", resource: "*.env.*", effect: "ask" },
  { action: "read", resource: ".env.*", effect: "ask" },
];

function evaluate(action: string, resource: string, rules: Ruleset): Effect {
  const rule = rules.findLast(
    (r) => match(action, r.action) && match(resource, r.resource),
  );
  return rule?.effect ?? "ask";
}

export async function checkToolPermission(block: {
  name: string;
  input: Record<string, unknown>;
  mode?: AgentMode;
}): Promise<string | null> {
  if (
    block.mode === "plan" &&
    ["write_file", "edit_file", "bash", "plan_exit"].includes(block.name)
  ) {
    return "BLOCKED: You are in plan mode (read-only). File edits are forbidden. Instead of attempting to edit files, output your analysis or plan directly as text. Do NOT retry this tool call.";
  }
  const cmd: string = String(block.input.command ?? "");
  const filePath: string = String(block.input.path ?? "");

  if (block.name === "bash") {
    for (const rule of DENY_LIST) {
      if (match("bash", rule.action) && match(cmd, rule.resource)) {
        return "Permission denied by deny list";
      }
    }

    await ensureParser();

    const tree = parse(cmd);
    if (tree) {
      const scan = collectPaths(tree, WORKDIR);

      for (const dir of scan.dirs) {
        const result = checkPath(dir, WORKDIR, WORKDIR);
        if (!result.safe) {
          const userResult = await askUser(
            block.name,
            block.input,
            `Path outside workspace: ${result.reason}`,
          );
          if (userResult === "deny") return "User has DENIED this operation. Do NOT retry this tool call. Instead, explain what you were trying to do and ask the user for alternative instructions.";
        }
      }
    }

    const tokens = cmd.split(/\s+/).filter(Boolean);
    const prefix = getCommandPrefix(tokens);
    const effect = evaluate("bash", prefix + " *", DEFAULT_RULES);

    if (effect === "deny") return "Permission denied by rule";
    if (effect === "ask") {
      const userResult = await askUser(
        block.name,
        block.input,
        "Command requires approval",
      );
      if (userResult === "deny") return "User has DENIED this operation. Do NOT retry this tool call. Instead, explain what you were trying to do and ask the user for alternative instructions.";
    }
  }

  if (block.name === "write_file" || block.name === "edit_file") {
    const result = checkPath(filePath, WORKDIR, WORKDIR);
    if (!result.safe) {
      const userResult = await askUser(
        block.name,
        block.input,
        `Writing outside workspace: ${result.reason}`,
      );
      if (userResult === "deny") return "User has DENIED this operation. Do NOT retry this tool call. Instead, explain what you were trying to do and ask the user for alternative instructions.";
    }
  }

  if (block.name === "read_file") {
    const result = checkPath(filePath, WORKDIR, WORKDIR);
    if (!result.safe) {
      const userResult = await askUser(
        block.name,
        block.input,
        `Reading outside workspace: ${result.reason}`,
      );
      if (userResult === "deny") return "User has DENIED this operation. Do NOT retry this tool call. Instead, explain what you were trying to do and ask the user for alternative instructions.";
    }
  }

  return null;
}

function askUser(
  toolName: string,
  args: Record<string, unknown>,
  reason: string,
): Promise<"allow" | "deny"> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve("deny");
    }, 100_000);

    const payload: PermissionPayload = {
      toolName,
      args,
      reason,
      approve: () => {
        clearTimeout(timer);
        resolve("allow");
      },
      deny: () => {
        clearTimeout(timer);
        resolve("deny");
      },
    };
    pipe.run({ type: "permission", payload });
  });
}
