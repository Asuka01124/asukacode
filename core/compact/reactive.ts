import type OpenAI from "openai";
import { summarizeHistory } from "./auto.js";
import { getDB, markSnipped } from "../database/database.js";
import { DB_SEQ } from "./to_model.js";
import {
  hasToolCalls,
  isToolMessage,
  getToolCallIds,
  getToolCallId,
} from "./types.js";

type Msg = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export async function reactiveCompact(
  sessionId: string,
  messages: Msg[],
  client: OpenAI,
  model: string,
): Promise<Msg[]> {

  let tailStart = Math.max(0, messages.length - 5);

  if (
    tailStart > 0 &&
    tailStart < messages.length &&
    isToolMessage(messages[tailStart])
  ) {
    const tid = getToolCallId(messages[tailStart]);
    if (tid) {
      for (let i = tailStart - 1; i >= 0; i--) {
        if (hasToolCalls(messages[i])) {
          const ids = getToolCallIds(messages[i]);
          if (ids.includes(tid)) {
            tailStart = i;
            break;
          }
        }
      }
    }
  }

  const fromSeq = (messages[0] as any)[DB_SEQ] ?? 0;
  const toSeq =
    tailStart > 0
      ? ((messages[tailStart] as any)[DB_SEQ] ?? tailStart)
      : tailStart;
  const db = getDB();
  markSnipped(db, sessionId, fromSeq, toSeq);

  const head = messages.slice(0, tailStart);
  const tail = messages.slice(tailStart);

  const summary = await summarizeHistory(head, client, model);

  return [
    { role: "user", content: `[Reactive compact]\n\n${summary}` },
    ...tail,
  ];
}

export function isContextOverflowError(err: unknown): boolean {
  const msg = String(err).toLowerCase();
  return msg.includes("prompt_too_long") || msg.includes("too many tokens");
}
