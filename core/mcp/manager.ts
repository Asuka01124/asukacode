import { MCPClient } from "./client.js";
import { toolRegistry, type ToolCategory } from "../tools/registry.js";
import { loadMCPConfig } from "./config.js";
import type { MCPServerConfig, MCPServerInfo, MCPTool } from "./types.js";

export class MCPManager {
  private servers: Map<string, MCPServerInfo> = new Map();
  private clients: Map<string, MCPClient> = new Map();

  loadConfig(): void {
    const config = loadMCPConfig();
    for (const [name, serverConfig] of Object.entries(config.servers)) {
      if (!this.servers.has(name)) {
        this.servers.set(name, {
          name,
          config: serverConfig,
          connected: false,
          tools: [],
        });
      }
    }
  }

  async connect(name: string, config: MCPServerConfig): Promise<void> {
    try {
      const client = new MCPClient();
      await client.connect(config.command, config.environment);
      const tools = await client.listTools();

      this.clients.set(name, client);
      this.servers.set(name, {
        name,
        config,
        connected: true,
        tools,
      });

      for (const tool of tools) {
        toolRegistry.register({
          name: `${name}_${tool.name}`,
          description: tool.description || "",
          parameters: tool.inputSchema as Record<string, unknown>,
          metadata: {
            source: "mcp",
            server: name,
            category: this.categorizeTool(tool),
          },
          execute: async (args) => {
            const result = await client.callTool(
              tool.name,
              args as Record<string, unknown>,
            );
            return result.content.map((c) => c.text || "").join("\n");
          },
        });
      }
    } catch (err) {
      this.servers.set(name, {
        name,
        config,
        connected: false,
        error: err instanceof Error ? err.message : String(err),
        tools: [],
      });
    }
  }

  async disconnect(name: string): Promise<void> {
    const client = this.clients.get(name);
    if (client) {
      await client.disconnect();
      this.clients.delete(name);
    }

    const server = this.servers.get(name);
    if (server) {
      server.connected = false;
      server.tools = [];
    }

    toolRegistry.unregisterByServer(name);
  }

  async reconnect(name: string): Promise<void> {
    const server = this.servers.get(name);
    if (!server) throw new Error(`Server ${name} not found`);

    await this.disconnect(name);
    await this.connect(name, server.config);
  }

  getStatus(): MCPServerInfo[] {
    return Array.from(this.servers.values());
  }

  getServer(name: string): MCPServerInfo | undefined {
    return this.servers.get(name);
  }

  isConnected(name: string): boolean {
    return this.clients.get(name)?.isConnected() ?? false;
  }

  private categorizeTool(tool: MCPTool): ToolCategory {
    const name = tool.name.toLowerCase();

    if (
      name.includes("read") ||
      name.includes("get") ||
      name.includes("list") ||
      name.includes("search") ||
      name.includes("find") ||
      name.includes("query")
    ) {
      return "read";
    }

    if (
      name.includes("write") ||
      name.includes("create") ||
      name.includes("update") ||
      name.includes("delete") ||
      name.includes("set") ||
      name.includes("add") ||
      name.includes("remove")
    ) {
      return "write";
    }

    if (
      name.includes("exec") ||
      name.includes("run") ||
      name.includes("shell") ||
      name.includes("command")
    ) {
      return "execute";
    }

    if (
      name.includes("fetch") ||
      name.includes("request") ||
      name.includes("browse") ||
      name.includes("http") ||
      name.includes("url")
    ) {
      return "network";
    }

    return "write";
  }
}

export const mcpManager = new MCPManager();
