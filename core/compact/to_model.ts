import type OpenAI from "openai";
import { getDB, getMessages } from "../database/database.js";
import type { MessageRow } from "../database/database.js";
import { setMessageUsage } from "../utils/token-estimator.js";

type Msg = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export const DB_SEQ = Symbol("db_seq");

function rowToMessage(row: MessageRow): Msg | null {

  if (row.compact_type === "summarized") return null;

  if (row.compact_type === "snipped") return null;

  const content = buildContent(row);
  let msg: Msg | null = null;

  const safeContent = content ?? "";

  switch (row.role) {
    case "system":
      msg = { role: "system", content: safeContent };
      break;
    case "user":
      msg = { role: "user", content: safeContent };
      break;
    case "assistant": {
      const tc = row.tool_calls ? JSON.parse(row.tool_calls) : undefined;
      msg = {
        role: "assistant",
        content: safeContent,
        tool_calls: tc,
      } as Msg;
      break;
    }
    case "tool":
      msg = {
        role: "tool",
        tool_call_id: row.tool_call_id ?? "",
        content: safeContent,
      };
      break;
  }

  if (msg) (msg as any)[DB_SEQ] = row.seq;

  if (msg && row.usage_total_tokens != null) {
    setMessageUsage(msg, {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: row.usage_total_tokens,
    })
  }

  return msg;
}

function buildContent(row: MessageRow): string {
  switch (row.compact_type) {
    case "placeholder":
      return "[Earlier tool result cleared]";
    case "persisted":
      return `<persisted-output>\nFull output: ${row.compact_path}\nPreview:\n${row.compact_preview ?? ""}\n</persisted-output>`;
    default:
      return row.content ?? "";
  }
}

export function toModelMessages(sessionId: string): Msg[] {
  const db = getDB();
  const rows = getMessages(db, sessionId);
  if (rows.length === 0) return [];

  if (rows[0].compact_type === "summarized") {
    const summary = rows[0].compact_summary ?? "(empty)";
    return [{ role: "user", content: `[Compacted]\n\n${summary}` }];
  }

  const result: Msg[] = [];
  let snippedCount = 0;

  for (const row of rows) {
    if (row.compact_type === "snipped") {
      snippedCount++;
      continue;
    }

    if (snippedCount > 0) {
      result.push({
        role: "user",
        content: `[snipped ${snippedCount} messages]`,
      });
      snippedCount = 0;
    }

    const msg = rowToMessage(row);
    if (msg) result.push(msg);
  }

  if (snippedCount > 0) {
    result.push({
      role: "user",
      content: `[snipped ${snippedCount} messages]`,
    });
  }

  return result;
}
