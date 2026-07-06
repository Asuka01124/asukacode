import type OpenAI from "openai"
import { getModelContextWindow } from "../config/model-context.js"

type Msg = OpenAI.Chat.Completions.ChatCompletionMessageParam

export const PROVIDER_USAGE = Symbol("provider_usage")

export interface ProviderUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export type WarningLevel = "normal" | "warning" | "critical" | "blocked"

export interface ContextStats {
  totalTokens: number
  knownTokens: number
  estimatedTokens: number
  contextWindow: number
  effectiveInput: number
  utilization: number
  warningLevel: WarningLevel
  hasKnownUsage: boolean
}

const CHARS_PER_TOKEN: Record<string, number> = {
  system: 3.5,
  user: 3.0,
  assistant: 3.5,
  tool: 2.0,
}

function messageContentLength(msg: Msg): number {
  if (typeof msg.content === "string") return msg.content.length
  if (msg.content === null) return 0
  return String(msg.content).length
}

function messageToolCallsLength(msg: Msg): number {
  if (msg.role !== "assistant") return 0
  const tc = (msg as any).tool_calls
  if (!tc) return 0
  try {
    return JSON.stringify(tc).length
  } catch {
    return 0
  }
}

export function estimateMessageTokens(msg: Msg): number {
  const ratio = CHARS_PER_TOKEN[msg.role] ?? 3.0
  const contentLen = messageContentLength(msg)
  const tcLen = messageToolCallsLength(msg)
  return Math.ceil(contentLen / ratio) + Math.ceil(tcLen / 2.5)
}

export function estimateMessagesTokens(messages: Msg[]): number {
  let total = 0
  for (const msg of messages) {
    total += estimateMessageTokens(msg)
  }
  return total
}

export function getMessageUsage(msg: Msg): ProviderUsage | undefined {
  return (msg as any)[PROVIDER_USAGE]
}

export function setMessageUsage(msg: Msg, usage: ProviderUsage): Msg {
  ;(msg as any)[PROVIDER_USAGE] = usage
  return msg
}

export function computeContextStats(
  messages: Msg[],
  model: string,
): ContextStats {
  const window = getModelContextWindow(model)

  let knownTokens = 0
  let lastKnownIdx = -1

  for (let i = messages.length - 1; i >= 0; i--) {
    const usage = getMessageUsage(messages[i])
    if (usage) {
      knownTokens = usage.total_tokens
      lastKnownIdx = i
      break
    }
  }

  const tailMessages = messages.slice(lastKnownIdx + 1)
  const estimatedTokens = estimateMessagesTokens(tailMessages)

  const totalTokens = knownTokens + estimatedTokens
  const utilization = Math.min(1, totalTokens / window.effectiveInput)

  let warningLevel: WarningLevel
  if (utilization >= 0.95) warningLevel = "blocked"
  else if (utilization >= 0.85) warningLevel = "critical"
  else if (utilization >= 0.50) warningLevel = "warning"
  else warningLevel = "normal"

  return {
    totalTokens,
    knownTokens,
    estimatedTokens,
    contextWindow: window.contextWindow,
    effectiveInput: window.effectiveInput,
    utilization,
    warningLevel,
    hasKnownUsage: lastKnownIdx >= 0,
  }
}
