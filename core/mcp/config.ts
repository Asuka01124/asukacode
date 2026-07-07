import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { mcpManager } from "./manager.js";
import type { MCPConfig } from "./types.js";

const MCP_CONFIG_PATH = path.join(os.homedir(), ".asukacode", "mcp.json");
let watcher: fs.FSWatcher | null = null;
let debounceTimer: NodeJS.Timeout | null = null;

export function loadMCPConfig(): MCPConfig {
  if (!fs.existsSync(MCP_CONFIG_PATH)) {
    return { servers: {} };
  }

  try {
    const content = fs.readFileSync(MCP_CONFIG_PATH, "utf-8");
    return JSON.parse(content);
  } catch {
    return { servers: {} };
  }
}

export async function connectAllEnabled(): Promise<void> {
  const config = loadMCPConfig();

  for (const [name, serverConfig] of Object.entries(config.servers)) {
    if (serverConfig.enabled !== false) {
      await mcpManager.connect(name, serverConfig);
    }
  }
}

export function startConfigWatcher(): void {
  if (watcher) return;

  const configDir = path.dirname(MCP_CONFIG_PATH);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  if (!fs.existsSync(MCP_CONFIG_PATH)) {
    fs.writeFileSync(MCP_CONFIG_PATH, JSON.stringify({ servers: {} }, null, 2));
  }

  watcher = fs.watch(MCP_CONFIG_PATH, { persistent: false }, () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      await reloadMCPConfig();
    }, 500);
  });
}

export function stopConfigWatcher(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

async function reloadMCPConfig(): Promise<void> {
  const oldServers = new Set(mcpManager.getStatus().map((s) => s.name));
  const newConfig = loadMCPConfig();
  const newServers = new Set(Object.keys(newConfig.servers));

  for (const name of oldServers) {
    if (!newServers.has(name)) {
      await mcpManager.disconnect(name);
    }
  }

  for (const [name, config] of Object.entries(newConfig.servers)) {
    if (config.enabled !== false) {
      await mcpManager.connect(name, config);
    } else {
      await mcpManager.disconnect(name);
    }
  }
}

export async function reloadMCP(): Promise<void> {
  await reloadMCPConfig();
}

export function getMCPConfigPath(): string {
  return MCP_CONFIG_PATH;
}
