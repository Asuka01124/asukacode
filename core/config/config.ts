import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { z } from "zod";
import { intro, outro, text, password, select, isCancel, cancel } from "@clack/prompts";
import {
  DEEPSEEK_MODELS,
  CLAUDE_MODELS,
  OPENAI_MODELS,
  QWEN_MODELS,
  KIMI_MODELS,
  GLM_MODELS,
  MINIMAX_MODELS,
  MIMO_MODELS,
  type ModelContextRule,
} from "./model-context.js";

export const ConfigSchema = z.object({
  apiKey: z.string().min(1, "API Key is required"),
  model: z.string().min(1, "Model is required"),
  baseURL: z.string().url().min(1, "Base URL is required"),
  icon: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

const CONFIG_DIR = path.join(os.homedir(), ".asukacode");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const GLOBAL_MEMORY_FILE = path.join(CONFIG_DIR, "Asuka.md");

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export function getGlobalMemoryPath(): string {
  return GLOBAL_MEMORY_FILE;
}

export function configExists(): boolean {
  return fs.existsSync(CONFIG_FILE);
}

export function loadConfig(): Config | null {
  if (!configExists()) return null;

  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    const result = ConfigSchema.safeParse(parsed);

    if (!result.success) {
      console.error("Config validation failed:", result.error.message);
      return null;
    }

    return result.data;
  } catch {
    return null;
  }
}

export function saveConfig(config: Config): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export async function runInitWizard(): Promise<Config | null> {
  intro("Welcome to AsukaCode!");

  const apiKey = await password({
    message: "Enter your API Key",
    validate: (value) => {
      if (!value || value.length === 0) return "API Key is required";
    },
  });
  if (isCancel(apiKey)) {
    cancel("Setup cancelled");
    return null;
  }

  const ctxHint = (r: ModelContextRule) =>
    `${(r.contextWindow / 1000).toLocaleString()}K context window`;

  const model = await select({
    message: "Select a model",
    options: [
      { value: "", label: "── DeepSeek ──", disabled: true },
      ...DEEPSEEK_MODELS.map((r) => ({
        value: r.patterns[0],
        label: `  ${r.patterns[0]}`,
        hint: ctxHint(r),
      })),
      { value: "", label: "── Claude ──", disabled: true },
      ...CLAUDE_MODELS.map((r) => ({
        value: r.patterns[0],
        label: `  ${r.patterns[0]}`,
        hint: ctxHint(r),
      })),
      { value: "", label: "── OpenAI ──", disabled: true },
      ...OPENAI_MODELS.map((r) => ({
        value: r.patterns[0],
        label: `  ${r.patterns[0]}`,
        hint: ctxHint(r),
      })),
      { value: "", label: "── Qwen ──", disabled: true },
      ...QWEN_MODELS.map((r) => ({
        value: r.patterns[0],
        label: `  ${r.patterns[0]}`,
        hint: ctxHint(r),
      })),
      { value: "", label: "── Kimi ──", disabled: true },
      ...KIMI_MODELS.map((r) => ({
        value: r.patterns[0],
        label: `  ${r.patterns[0]}`,
        hint: ctxHint(r),
      })),
      { value: "", label: "── GLM ──", disabled: true },
      ...GLM_MODELS.map((r) => ({
        value: r.patterns[0],
        label: `  ${r.patterns[0]}`,
        hint: ctxHint(r),
      })),
      { value: "", label: "── MiniMax ──", disabled: true },
      ...MINIMAX_MODELS.map((r) => ({
        value: r.patterns[0],
        label: `  ${r.patterns[0]}`,
        hint: ctxHint(r),
      })),
      { value: "", label: "── Mimo ──", disabled: true },
      ...MIMO_MODELS.map((r) => ({
        value: r.patterns[0],
        label: `  ${r.patterns[0]}`,
        hint: ctxHint(r),
      })),
    ],
  });
  if (isCancel(model)) {
    cancel("Setup cancelled");
    return null;
  }

  const baseURL = await text({
    message: "Enter your Base URL",
    placeholder: "https://api.deepseek.com",
    validate: (value) => {
      if (!value || value.length === 0) return "Base URL is required";
      try {
        new URL(value);
      } catch {
        return "Please enter a valid URL (e.g. https://api.deepseek.com)";
      }
    },
  });
  if (isCancel(baseURL)) {
    cancel("Setup cancelled");
    return null;
  }

  const config: Config = {
    apiKey: apiKey as string,
    model: model as string,
    baseURL: baseURL as string,
  };

  saveConfig(config);

  outro(`Configuration saved to ${CONFIG_FILE}`);

  return config;
}

export async function loadOrInitConfig(): Promise<Config | null> {
  const existing = loadConfig();
  if (existing) return existing;
  return runInitWizard();
}
