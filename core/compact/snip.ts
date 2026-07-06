import type OpenAI from "openai"
import { getDB, markSnipped } from "../database/database.js"
import { DB_SEQ } from "./to_model.js"
import {
  MAX_MESSAGES,
  SNIP_COMPACT_UTILIZATION,
  SNIP_TARGET_USAGE,
  hasToolCalls,
  isToolMessage,
  getToolCallIds,
  getToolCallId,
} from "./types.js"
import { type ContextStats, estimateMessagesTokens } from "./token-estimator.js"

type Msg = OpenAI.Chat.Completions.ChatCompletionMessageParam

function getSeq(msg: Msg): number | undefined {
  return (msg as any)[DB_SEQ]
}

export function snipCompact(
  sessionId: string,
  messages: Msg[],
  stats: ContextStats,
): boolean {
  if (stats.utilization < SNIP_COMPACT_UTILIZATION) return false
  if (messages.length <= MAX_MESSAGES) {
    const checkUtil = estimateMessagesTokens(messages)
    const checkRatio = checkUtil / stats.effectiveInput
    if (checkRatio < SNIP_COMPACT_UTILIZATION) return false
  }

  const keepHead = 3
  const keepTail = 12

  if (messages.length <= keepHead + keepTail) return false

  const targetTokens = stats.effectiveInput * SNIP_TARGET_USAGE
  const needToFree = stats.totalTokens - targetTokens

  let headEnd = keepHead
  let tailStart = messages.length - keepTail

  if (headEnd > 0 && hasToolCalls(messages[headEnd - 1])) {
    const pendingIds = new Set(getToolCallIds(messages[headEnd - 1]))
    while (headEnd < tailStart && pendingIds.size > 0) {
      const next = messages[headEnd]
      if (isToolMessage(next)) {
        const tid = getToolCallId(next)
        if (tid) pendingIds.delete(tid)
      } else if (hasToolCalls(next)) {
        for (const id of getToolCallIds(next)) pendingIds.add(id)
      }
      headEnd++
    }
  }

  if (tailStart > headEnd && tailStart < messages.length && isToolMessage(messages[tailStart])) {
    const tid = getToolCallId(messages[tailStart])
    if (tid) {
      for (let i = tailStart - 1; i >= headEnd; i--) {
        if (hasToolCalls(messages[i])) {
          const ids = getToolCallIds(messages[i])
          if (ids.includes(tid)) {
            tailStart = i
            break
          }
        }
      }
    }
  }

  let freedTokens = 0
  for (let i = keepHead; i < tailStart; i++) {
    freedTokens += estimateMessagesTokens([messages[i]])
    headEnd = i + 1
    if (freedTokens >= needToFree) break
  }

  if (headEnd > 0 && hasToolCalls(messages[headEnd - 1])) {
    const pendingIds = new Set(getToolCallIds(messages[headEnd - 1]))
    while (headEnd < tailStart && pendingIds.size > 0) {
      const next = messages[headEnd]
      if (isToolMessage(next)) {
        const tid = getToolCallId(next)
        if (tid) pendingIds.delete(tid)
      } else if (hasToolCalls(next)) {
        for (const id of getToolCallIds(next)) pendingIds.add(id)
      }
      headEnd++
    }
  }

  if (headEnd >= tailStart) return false

  const fromSeq = getSeq(messages[headEnd]) ?? headEnd
  const toSeq = getSeq(messages[tailStart]) ?? tailStart

  const db = getDB()
  markSnipped(db, sessionId, fromSeq, toSeq)

  return true
}
