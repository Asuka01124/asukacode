import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TOOLS, TOOL_HANDLERS, PLAN_BLOCKED_TOOLS } from "../tools/tools.js";
import {
  runCompactionPipeline,
  reactiveCompact,
  toModelMessages,
} from "../compact/compact.js";
import { setMessageUsage, computeContextStats } from "../utils/token-estimator.js";
import { runCompact } from "../tools/compact.js";
import {
  loadMemories,
  extractMemories,
  consolidateMemories,
} from "../memory/memory.js";
import { getDB, getMaxSeq, insertMessage } from "../database/database.js";
import { checkToolPermission } from "../permission/permission.js";
import { pipe } from "./events.js";
import type { AgentMode } from "./events.js";
import type { SystemContextSession } from "../systemContext/syscontext.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPT_DIR = path.join(__dirname, "prompt");

const PLAN_PROMPT = fs.readFileSync(path.join(PROMPT_DIR, "plan.txt"), "utf-8");
const BUILD_PROMPT = fs.readFileSync(path.join(PROMPT_DIR, "build.txt"), "utf-8");

function nextSeq(db: ReturnType<typeof getDB>, sessionId: string): number {
  return getMaxSeq(db, sessionId) + 1;
}

export async function runLoop(
  sessionId: string,
  client: OpenAI,
  model: string,
  systemPrompt: string,
  ctx: SystemContextSession,
  mode: AgentMode = "build",
) {
  const db = getDB();

  const msgsInit = toModelMessages(sessionId);
  const memoriesContent = await loadMemories(msgsInit, client, model);

  let fullPrompt = systemPrompt;
  if (memoriesContent) fullPrompt = `${fullPrompt}\n\n${memoriesContent}`;

  while (true) {
    const modePrompt = mode === "plan" ? PLAN_PROMPT : BUILD_PROMPT;

    const availableTools = mode === "plan"
      ? TOOLS.filter(t => {
          if ("function" in t) {
            return !PLAN_BLOCKED_TOOLS.has(t.function.name);
          }
          return true;
        })
      : TOOLS;

    let msgs = toModelMessages(sessionId);
    msgs.unshift({ role: "system", content: fullPrompt });

    const preCompress = structuredClone(msgs);
    msgs = await runCompactionPipeline(sessionId, msgs, client, model);

    if (msgs[0]?.role !== "system") {
      msgs.unshift({ role: "system", content: fullPrompt });
    }

    msgs.push({ role: "user", content: modePrompt });

    const contextUpdate = await ctx.getPrompt()
    if (contextUpdate) {
      msgs.push({ role: "user", content: `[Context Update]\n\n${contextUpdate}` })
    }

    let response: OpenAI.Chat.Completions.ChatCompletion;
    try {
      response = await client.chat.completions.create({
        model,
        messages: msgs,
        tools: availableTools,
        reasoning_effort: "high",
        extra_body: { thinking: { type: "enabled" } },
      } as any);
    } catch (err) {
      if (isPromptTooLong(err)) {
        msgs = await reactiveCompact(sessionId, msgs, client, model);
        continue;
      }
      pipe.run({ type: 'error', sessionId, error: String(err) });
      throw err;
    }

    const assistant = response.choices[0].message;
    const content = typeof assistant.content === "string" ? assistant.content : null;
    const reasoningContent = (assistant as any).reasoning_content ?? null;

    if (reasoningContent) {
      pipe.run({ type: 'thinking_start', sessionId });
      pipe.run({ type: 'thinking_delta', sessionId, content: reasoningContent });
      pipe.run({ type: 'thinking_end', sessionId });
    }

    if (content) {
      pipe.run({ type: 'assistant_delta', sessionId, content });
    }

    const toolCallsJSON = assistant.tool_calls
      ? JSON.stringify(assistant.tool_calls)
      : null;

    const usageTotalTokens = response.usage?.total_tokens ?? null
    insertMessage(db, sessionId, nextSeq(db, sessionId), "assistant", content, null, toolCallsJSON, usageTotalTokens);
    if (usageTotalTokens != null) {
      setMessageUsage(assistant, {
        prompt_tokens: response.usage!.prompt_tokens,
        completion_tokens: response.usage!.completion_tokens,
        total_tokens: usageTotalTokens,
      })
    }
    msgs.push(assistant);

    const ctxStats = computeContextStats(msgs, model)
    pipe.run({
      type: 'context_stats',
      totalTokens: ctxStats.totalTokens,
      contextWindow: ctxStats.contextWindow,
      utilization: ctxStats.utilization,
    })

    if (!assistant.tool_calls?.length) {
      await extractMemories(preCompress, client, model);
      await consolidateMemories(client, model);
      pipe.run({ type: 'finished', sessionId });
      return;
    }

    for (const call of assistant.tool_calls) {
      if (call.type !== "function") continue;

      const name = call.function.name;
      const input = JSON.parse(call.function.arguments);

      if (name === "compact") {
        const output = await runCompact(input, sessionId, msgs, client, model);
        insertMessage(db, sessionId, nextSeq(db, sessionId), "tool", output, call.id);
        msgs.push({ role: "tool", tool_call_id: call.id, content: output });
        break;
      }

      pipe.run({ type: 'tool_start', sessionId, name, input });

      const denied = await checkToolPermission({ name, input, mode });
      let output: string;

      if (denied) {
        output = denied;
        pipe.run({ type: 'tool_end', sessionId, name, output, denied: true });
      } else {
        const handler = TOOL_HANDLERS[name];
        output = handler ? await handler(input) : `Unknown tool: ${name}`;
        pipe.run({ type: 'tool_end', sessionId, name, output });
      }

      insertMessage(db, sessionId, nextSeq(db, sessionId), "tool", output, call.id);
      msgs.push({ role: "tool", tool_call_id: call.id, content: output });
    }
  }
}

function isPromptTooLong(err: unknown): boolean {
  const msg = String(err).toLowerCase();
  return msg.includes("prompt_too_long") || msg.includes("too many tokens");
}
