export type ToolCallStatus = "pending" | "running" | "completed" | "error" | "denied"

export interface ThoughtStep {
  id: string
  
  durationMs: number
  
  detail?: string
}

export interface ToolCallEvent {
  id: string
  
  label: string
  
  model: string
  
  durationMs: number
  status: ToolCallStatus
  
  thoughts: ThoughtStep[]
  
  output?: string
}

export interface CommandEchoEntry {
  type: "command_echo"
  id: string
  command: string
}

export interface ToolCallEntry {
  type: "tool_call"
  id: string
  name: string
  input: unknown
  output?: string
  status: ToolCallStatus
  startTime: number
  endTime?: number
}

export interface UserMessageEntry {
  type: "user_message"
  id: string
  content: string
}

export interface AssistantMessageEntry {
  type: "assistant_message"
  id: string
  heading?: string
  
  lines: string[]
  ordered?: boolean
}

export interface ThinkingEntry {
  type: "thinking"
  id: string
  lines: string[]
}

export type ConversationEntry = CommandEchoEntry | ToolCallEntry | UserMessageEntry | AssistantMessageEntry | ThinkingEntry

export interface ContextStats {
  tokens: number
  tokenLimit: number
  costUsd: number
}

export interface SessionInfo {
  id: string
  name: string
  elapsedSeconds: number
}

export interface TodoItem {
  id: string
  text: string
  done: boolean
}

export interface AgentHeaderInfo {
  model: string
  mode: string
}

export interface DiagnosticsCounts {
  
  editorMode: string
  branch: string
  warnings: number
  notices: number
  errors: number
}

export type TriggerChar = "/" | "@"

export interface InputTrigger {
  type: TriggerChar
  
  query: string
  
  startIndex: number
}

export interface CommandPaletteItem {
  id: string
  
  label: string
  
  description?: string
  
  insertText?: string
}

export interface InputBarProps {
  value: string
  onChange: (value: string) => void
  
  onSubmit: (value: string) => void
  placeholder?: string
  focused?: boolean
  promptSymbol?: string
  
  slashItems?: CommandPaletteItem[]
  
  mentionItems?: CommandPaletteItem[]
  
  onPaletteVisibleChange?: (visible: boolean) => void
}