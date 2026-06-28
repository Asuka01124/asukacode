import type OpenAI from "openai";
import { getDB, markCompactByToolCall } from "../database/database.js";
import { KEEP_RECENT, MICRO_COMPACT_UTILIZATION, isToolMessage, getToolCallId } from "./types.js";
import type { ContextStats } from "../utils/token-estimator.js";

type Msg = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export function microCompact(messages: Msg[], stats: ContextStats): void {
  if (stats.utilization < MICRO_COMPACT_UTILIZATION) return;

  const toolItems: { idx: number; toolCallId: string; contentLen: number }[] =
    [];

  for (let i = 0; i < messages.length; i++) {
    if (isToolMessage(messages[i])) {
      const tid = getToolCallId(messages[i]) ?? "";
      const content =
        typeof (messages[i] as any).content === "string"
          ? (messages[i] as any).content
          : "";
      if (tid) {
        toolItems.push({ idx: i, toolCallId: tid, contentLen: content.length });
      }
    }
  }

  if (toolItems.length <= KEEP_RECENT) return;

  const oldItems = toolItems.slice(0, toolItems.length - KEEP_RECENT);

  const db = getDB();
  for (const item of oldItems) {
    if (item.contentLen > 120) {
      markCompactByToolCall(db, item.toolCallId, "placeholder");
    }
  }
}
