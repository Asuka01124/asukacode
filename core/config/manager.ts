import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import readline from "node:readline";
import { z } from "zod";
import { ALL_RULES } from "../utils/model-context.js";

export const ConfigSchema = z.object({
  apiKey: z.string().min(1, "API Key is required"),
  model: z.string().min(1, "Model is required"),
  baseURL: z.string().url().min(1, "Base URL is required"),
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

const ANSI_RE = /\x1b\[[0-9;]*[a-zA-Z]/g

function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, "").trim()
}

async function askQuestion(
  rl: readline.Interface,
  question: string
): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(stripAnsi(answer));
    });
  });
}

export async function runInitWizard(): Promise<Config> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\nWelcome to AsukaCode!\n");
  console.log("Let's set up your configuration.\n");

  const apiKey = await askQuestion(rl, "? API Key: ");
  if (!apiKey) {
    rl.close();
    throw new Error("API Key is required");
  }

  const models = ALL_RULES.map((r) => r.patterns[0])
  console.log("\nAvailable models:")
  models.forEach((m, i) => console.log(`  ${String(i + 1).padStart(2)}. ${m}`))
  console.log()
  const choice = await askQuestion(rl, `Model (1-${models.length}): `);
  const idx = parseInt(choice) - 1
  if (isNaN(idx) || idx < 0 || idx >= models.length) {
    rl.close();
    throw new Error(`Invalid model selection: ${choice}`);
  }
  const model = models[idx]

  const baseURL = await askQuestion(
    rl,
    `? Base URL (OpenAI-compatible, e.g. https://api.deepseek.com): `
  );

  rl.close();

  if (!baseURL) throw new Error("Base URL is required");

  const config: Config = {
    apiKey,
    model,
    baseURL,
  };

  saveConfig(config);

  console.log(`\n✓ Configuration saved to ${CONFIG_FILE}`);

  return config;
}

export function loadOrInitConfig(): Promise<Config> {
  const existing = loadConfig();
  if (existing) return Promise.resolve(existing);
  return runInitWizard();
}
