import type OpenAI from "openai";
import { getDB, markSummarized } from "../database/database.js";
import { AUTO_COMPACT_UTILIZATION } from "./types.js";
import type { ContextStats } from "../utils/token-estimator.js";

type Msg = OpenAI.Chat.Completions.ChatCompletionMessageParam;

const SUMMARY_PROMPT =
  "Summarize this coding-agent conversation so work can continue.\n" +
  "Preserve: 1. current goal, 2. key findings/decisions, 3. files read/changed, " +
  "4. remaining work, 5. user constraints.\n" +
  "Be compact but concrete.";

export async function summarizeHistory(
  messages: Msg[],
  client: OpenAI,
  model: string,
): Promise<string> {
  const conversation = JSON.stringify(messages).slice(0, 80_000);

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SUMMARY_PROMPT },
      { role: "user", content: conversation },
    ],
    max_tokens: 2000,
  });

  return response.choices[0]?.message?.content?.trim() || "(empty summary)";
}

export async function compactHistory(
  sessionId: string,
  messages: Msg[],
  client: OpenAI,
  model: string,
  stats: ContextStats,
): Promise<void> {
  if (stats.utilization < AUTO_COMPACT_UTILIZATION) return;

  const summary = await summarizeHistory(messages, client, model);
  const db = getDB();
  markSummarized(db, sessionId, summary);
}
