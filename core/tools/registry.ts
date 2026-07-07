import type OpenAI from "openai";

export type ToolCategory = "read" | "write" | "execute" | "network";

export interface ToolMetadata {
  source: "builtin" | "mcp";
  server?: string;
  category?: ToolCategory;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  metadata: ToolMetadata;
  execute: (args: unknown) => Promise<string>;
}

class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  unregister(name: string): void {
    this.tools.delete(name);
  }

  unregisterByServer(serverName: string): void {
    for (const [name, tool] of this.tools) {
      if (tool.metadata.source === "mcp" && tool.metadata.server === serverName) {
        this.tools.delete(name);
      }
    }
  }

  getTools(): OpenAI.Chat.Completions.ChatCompletionTool[] {
    return Array.from(this.tools.values()).map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as any,
      },
    }));
  }

  getHandler(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getMetadata(name: string): ToolMetadata | undefined {
    return this.tools.get(name)?.metadata;
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  clear(): void {
    this.tools.clear();
  }

  size(): number {
    return this.tools.size;
  }
}

export const toolRegistry = new ToolRegistry();
