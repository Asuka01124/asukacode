export interface MCPServerConfig {
  command: string[];
  environment?: Record<string, string>;
  enabled?: boolean;
}

export interface MCPServerInfo {
  name: string;
  config: MCPServerConfig;
  connected: boolean;
  error?: string;
  tools: MCPTool[];
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: object;
}

export interface MCPToolCallResult {
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
}

export interface MCPConfig {
  servers: Record<string, MCPServerConfig>;
}
