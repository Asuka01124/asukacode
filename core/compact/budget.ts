import fs from "node:fs";
import path from "node:path";
import type OpenAI from "openai";
import { getDB, markCompactByToolCall } from "../database/database.js";
import { PERSIST_THRESHOLD, BUDGET_COMPACT_UTILIZATION, hasToolCalls, isToolMessage } from "./types.js";
import type { ContextStats } from "../utils/token-estimator.js";

type Msg = OpenAI.Chat.Completions.ChatCompletionMessageParam;

const TOOL_RESULTS_DIR = path.join(process.cwd(), ".tool_results");

function persistLargeOutput(
  toolCallId: string,
  output: string,
): { path: string; preview: string } {
  fs.mkdirSync(TOOL_RESULTS_DIR, { recursive: true });
  const filePath = path.join(TOOL_RESULTS_DIR, `${toolCallId}.txt`);

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, output);
  }

  return { path: filePath, preview: output.slice(0, 2000) };
}

export function toolResultBudget(
  messages: Msg[],
  stats: ContextStats,
  maxBytes: number = 200_000,
): void {
  if (stats.utilization < BUDGET_COMPACT_UTILIZATION) return;

  let lastToolCallIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (hasToolCalls(messages[i])) {
      lastToolCallIdx = i;
      break;
    }
  }
  if (lastToolCallIdx === -1) return;

  const blocks: { toolCallId: string; content: string }[] = [];
  for (let i = lastToolCallIdx + 1; i < messages.length; i++) {
    const msg = messages[i];
    if (isToolMessage(msg)) {
      const content =
        typeof (msg as any).content === "string"
          ? (msg as any).content
          : String((msg as any).content ?? "");
      const tid = (msg as any).tool_call_id || "";
      if (tid) blocks.push({ toolCallId: tid, content });
    }
  }

  if (blocks.length === 0) return;

  let total = blocks.reduce((sum, b) => sum + b.content.length, 0);
  if (total <= maxBytes) return;

  const ranked = [...blocks].sort(
    (a, b) => b.content.length - a.content.length,
  );

  const db = getDB();
  for (const block of ranked) {
    if (total <= maxBytes) break;
    if (block.content.length <= PERSIST_THRESHOLD) continue;

    const { path: filePath, preview } = persistLargeOutput(
      block.toolCallId,
      block.content,
    );
    const saved = block.content.length - preview.length;

    markCompactByToolCall(db, block.toolCallId, "persisted", {
      path: filePath,
      preview,
    });

    total -= saved;
  }
}
