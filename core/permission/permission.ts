import path from "node:path";
import { pipe, type PermissionPayload, type AgentMode } from "../agent/index.js";
import { match } from "./wildcard.js";
import { parse, collectPaths, initParser } from "./shell-parser.js";
import { checkPath } from "./path-check.js";
import { getCommandPrefix } from "./arity.js";
import {
  Risk,
  DENY_LIST,
  COMMAND_RISKS,
  SUB_COMMAND_RULES,
  SENSITIVE_READ_PATTERNS,
} from "./rules.js";
import { toolRegistry } from "../tools/registry.js";

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

const SHELL_META_REGEX = /[|;&`$(){}[\]!#~<]/;
const REDIRECT_REGEX = /\b(tee|>\s*|>>|2>|2>>|&>|>\|)\b/;
const PIPE_REGEX = /\|/;

function hasShellMetacharacters(cmd: string): boolean {
  const inQuote = /(["'])(?:(?!\1|\\).|\\.)*\1/g;
  const stripped = cmd.replace(inQuote, '');
  return SHELL_META_REGEX.test(stripped) || REDIRECT_REGEX.test(stripped) || PIPE_REGEX.test(stripped);
}

function isSensitivePath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  for (const pattern of SENSITIVE_READ_PATTERNS) {
    const normalizedPattern = pattern.replace(/\\/g, '/').toLowerCase();
    if (match(normalized, normalizedPattern)) {
      return true;
    }
    if (normalizedPattern.startsWith('~/')) {
      const homeRelative = normalizedPattern.slice(2);
      if (match(normalized, homeRelative) || normalized.endsWith('/' + homeRelative)) {
        return true;
      }
    }
  }
  return false;
}

function matchSubCommandRule(tokens: string[]): { command: string; pattern: string; effect: "allow" | "deny" | "ask" } | null {
  if (tokens.length < 2) return null;
  const cmd = tokens[0];
  const subCmd = tokens.slice(1).join(' ');

  for (const rule of SUB_COMMAND_RULES) {
    if (rule.command === cmd && match(subCmd, rule.pattern)) {
      return rule;
    }
  }
  return null;
}

function riskToReason(risk: Risk): string {
  const reasons: string[] = [];
  if (risk & Risk.WRITE) reasons.push("may modify files");
  if (risk & Risk.NETWORK) reasons.push("network access");
  if (risk & Risk.EXECUTE) reasons.push("executes programs");
  if (risk & Risk.SECRET) reasons.push("may expose secrets");
  if (risk & Risk.DANGEROUS) reasons.push("dangerous operation");
  return reasons.join(", ") || "requires approval";
}

const DENY_MESSAGE = "User has DENIED this operation. Do NOT retry this tool call. Instead, explain what you were trying to do and ask the user for alternative instructions.";

async function askUser(
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

function matchesDenyList(cmd: string): boolean {
  const rules = DENY_LIST["bash"];
  if (!rules) return false;
  return rules.some((pattern) => match(cmd, pattern));
}

async function checkBashPermission(
  cmd: string,
  input: Record<string, unknown>,
): Promise<string | null> {
  if (matchesDenyList(cmd)) {
    return "Permission denied by deny list";
  }

  await ensureParser();
  const tree = parse(cmd);
  if (tree) {
    const scan = collectPaths(tree, WORKDIR);
    for (const dir of scan.dirs) {
      const result = checkPath(dir, WORKDIR, WORKDIR);
      if (!result.safe) {
        const userResult = await askUser(
          "bash",
          input,
          `Path outside workspace: ${result.reason}`,
        );
        if (userResult === "deny") return DENY_MESSAGE;
      }
    }
  }

  if (hasShellMetacharacters(cmd)) {
    const userResult = await askUser(
      "bash",
      input,
      "Command contains shell metacharacters (redirect/pipe/tee)",
    );
    if (userResult === "deny") return DENY_MESSAGE;
    return null;
  }

  const tokens = cmd.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  const subRule = matchSubCommandRule(tokens);
  if (subRule) {
    if (subRule.effect === "allow") return null;
    if (subRule.effect === "deny") return "Permission denied by rule";
    const userResult = await askUser(
      "bash",
      input,
      `Command requires approval (${subRule.command} ${subRule.pattern})`,
    );
    if (userResult === "deny") return DENY_MESSAGE;
    return null;
  }

  const prefix = getCommandPrefix(tokens);
  const risk = COMMAND_RISKS[prefix] ?? Risk.EXECUTE;

  if (risk === Risk.SAFE) return null;

  const reason = riskToReason(risk);
  const userResult = await askUser("bash", input, reason);
  if (userResult === "deny") return DENY_MESSAGE;
  return null;
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

  const metadata = toolRegistry.getMetadata(block.name);
  if (metadata?.source === "mcp") {
    const category = metadata.category || "write";
    switch (category) {
      case "read":
        return null;
      case "write":
      case "execute":
      case "network": {
        const reason = `[MCP:${metadata.server}] Tool requires approval (${category})`;
        const userResult = await askUser(block.name, block.input, reason);
        if (userResult === "deny") return DENY_MESSAGE;
        return null;
      }
    }
  }

  const cmd: string = String(block.input.command ?? "");
  const filePath: string = String(block.input.path ?? "");

  if (block.name === "bash") {
    return checkBashPermission(cmd, block.input);
  }

  if (block.name === "write_file" || block.name === "edit_file") {
    const result = checkPath(filePath, WORKDIR, WORKDIR);
    if (!result.safe) {
      const userResult = await askUser(
        block.name,
        block.input,
        `Writing outside workspace: ${result.reason}`,
      );
      if (userResult === "deny") return DENY_MESSAGE;
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
      if (userResult === "deny") return DENY_MESSAGE;
    }
    if (isSensitivePath(filePath)) {
      const userResult = await askUser(
        block.name,
        block.input,
        "Reading sensitive file (keys/tokens/credentials)",
      );
      if (userResult === "deny") return DENY_MESSAGE;
    }
  }

  return null;
}
