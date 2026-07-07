import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { MCPTool, MCPToolCallResult } from "./types.js";

export class MCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;

  async connect(
    command: string[],
    env?: Record<string, string>,
  ): Promise<void> {
    this.transport = new StdioClientTransport({
      command: command[0],
      args: command.slice(1),
      env: { ...process.env, ...env } as Record<string, string>,
    });

    this.client = new Client(
      { name: "asukacode", version: "2.0.0" },
      { capabilities: {} },
    );

    await this.client.connect(this.transport);
  }

  async listTools(): Promise<MCPTool[]> {
    if (!this.client) {
      throw new Error("MCP client not connected");
    }

    const result = await this.client.listTools();
    return result.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<MCPToolCallResult> {
    if (!this.client) {
      throw new Error("MCP client not connected");
    }

    const result = await this.client.callTool({
      name,
      arguments: args,
    });

    return {
      content: Array.isArray(result.content)
        ? result.content.map((c: any) => ({
            type: c.type || "text",
            text: c.text || "",
          }))
        : [{ type: "text", text: String(result.content) }],
      isError: result.isError as boolean | undefined,
    };
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
  }

  isConnected(): boolean {
    return this.client !== null;
  }
}
