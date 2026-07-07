import OpenAI from "openai";
import { PLAN_BLOCKED_TOOLS, runCompact } from "../tools/index.js";
import { toolRegistry } from "../tools/registry.js";
import {
  runCompactionPipeline,
  reactiveCompact,
  toModelMessages,
  setMessageUsage,
  computeContextStats,
} from "../compact/index.js";
import {
  loadMemories,
  extractMemories,
  consolidateMemories,
} from "../memory/index.js";
import { getDB, getMaxSeq, insertMessage } from "../database/database.js";
import { checkToolPermission } from "../permission/index.js";
import { pipe } from "./events.js";
import type { AgentMode } from "./events.js";
import type { SystemContextSession } from "../systemContext/index.js";

import PLAN_PROMPT from "./prompt/plan.txt";
import BUILD_PROMPT from "./prompt/build.txt";

function nextSeq(db: ReturnType<typeof getDB>, sessionId: string): number {
  return getMaxSeq(db, sessionId) + 1;
}

function mergeToolCalls(
  existing: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[],
  delta: OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta.ToolCall[],
): void {
  for (const dt of delta) {
    const idx = dt.index ?? 0;
    if (!existing[idx]) {
      existing[idx] = {
        id: dt.id ?? "",
        type: "function",
        function: { name: "", arguments: "" },
      };
    }
    if (dt.id) existing[idx].id = dt.id;
    if ("function" in existing[idx]) {
      if (dt.function?.name) existing[idx].function.name += dt.function.name;
      if (dt.function?.arguments)
        existing[idx].function.arguments += dt.function.arguments;
    }
  }
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

    const allTools = toolRegistry.getTools();
    const availableTools =
      mode === "plan"
        ? allTools.filter((t) => {
            if ("function" in t) {
              return !PLAN_BLOCKED_TOOLS.has(t.function.name);
            }
            return true;
          })
        : allTools;

    let msgs = toModelMessages(sessionId);
    msgs.unshift({ role: "system", content: fullPrompt });

    const preCompress = structuredClone(msgs);
    msgs = await runCompactionPipeline(sessionId, msgs, client, model);

    if (msgs[0]?.role !== "system") {
      msgs.unshift({ role: "system", content: fullPrompt });
    }

    msgs.push({ role: "user", content: modePrompt });

    const contextUpdate = await ctx.getPrompt();
    if (contextUpdate) {
      msgs.push({
        role: "user",
        content: `[Context Update]\n\n${contextUpdate}`,
      });
    }

    // Stream API call
    let fullContent = "";
    let reasoningContent = "";
    const toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] =
      [];
    let usageTokens: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    } | null = null;

    try {
      const stream = (await client.chat.completions.create({
        model,
        messages: msgs,
        tools: availableTools,
        stream: true,
        reasoning_effort: "high",
        extra_body: { thinking: { type: "enabled" } },
      } as any)) as unknown as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;

      let thinkingStarted = false;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        // Handle reasoning content (thinking)
        if ((delta as any)?.reasoning_content) {
          const rc = (delta as any).reasoning_content as string;
          reasoningContent += rc;
          if (!thinkingStarted) {
            pipe.run({ type: "thinking_start", sessionId });
            thinkingStarted = true;
          }
          pipe.run({ type: "thinking_delta", sessionId, content: rc });
        }

        // Handle regular content
        if (delta?.content) {
          fullContent += delta.content;
          pipe.run({
            type: "assistant_delta",
            sessionId,
            content: delta.content,
          });
        }

        // Handle tool calls
        if (delta?.tool_calls) {
          mergeToolCalls(toolCalls, delta.tool_calls);
        }

        // Handle usage
        if (chunk.usage) {
          usageTokens = {
            prompt_tokens: chunk.usage.prompt_tokens,
            completion_tokens: chunk.usage.completion_tokens,
            total_tokens: chunk.usage.total_tokens,
          };
        }
      }

      if (thinkingStarted) {
        pipe.run({ type: "thinking_end", sessionId });
      }
    } catch (err) {
      if (isPromptTooLong(err)) {
        msgs = await reactiveCompact(sessionId, msgs, client, model);
        continue;
      }
      pipe.run({ type: "error", sessionId, error: String(err) });
      throw err;
    }

    // Build assistant message for DB
    const toolCallsJSON =
      toolCalls.length > 0 ? JSON.stringify(toolCalls) : null;

    const assistant: OpenAI.Chat.Completions.ChatCompletionMessage = {
      role: "assistant",
      content: fullContent || null,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      refusal: null,
    };

    insertMessage(
      db,
      sessionId,
      nextSeq(db, sessionId),
      "assistant",
      fullContent || null,
      null,
      toolCallsJSON,
      usageTokens?.total_tokens ?? null,
    );
    if (usageTokens) {
      setMessageUsage(assistant, {
        prompt_tokens: usageTokens.prompt_tokens,
        completion_tokens: usageTokens.completion_tokens,
        total_tokens: usageTokens.total_tokens,
      });
    }
    msgs.push(assistant);

    const ctxStats = computeContextStats(msgs, model);
    pipe.run({
      type: "context_stats",
      totalTokens: ctxStats.totalTokens,
      contextWindow: ctxStats.contextWindow,
      utilization: ctxStats.utilization,
    });

    if (toolCalls.length === 0) {
      await extractMemories(preCompress, client, model);
      await consolidateMemories(client, model);
      pipe.run({ type: "finished", sessionId });
      return;
    }

    for (const call of toolCalls) {
      if (call.type !== "function") continue;

      const name = call.function.name;
      const input = JSON.parse(call.function.arguments);

      if (name === "compact") {
        const output = await runCompact(input, sessionId, msgs, client, model);
        insertMessage(
          db,
          sessionId,
          nextSeq(db, sessionId),
          "tool",
          output,
          call.id,
        );
        msgs.push({ role: "tool", tool_call_id: call.id, content: output });
        break;
      }

      pipe.run({ type: "tool_start", sessionId, name, input });

      const denied = await checkToolPermission({ name, input, mode });
      let output: string;

      if (denied) {
        output = denied;
        pipe.run({ type: "tool_end", sessionId, name, output, denied: true });
      } else {
        const tool = toolRegistry.getHandler(name);
        output = tool ? await tool.execute(input) : `Unknown tool: ${name}`;
        pipe.run({ type: "tool_end", sessionId, name, output });
      }

      insertMessage(
        db,
        sessionId,
        nextSeq(db, sessionId),
        "tool",
        output,
        call.id,
      );
      msgs.push({ role: "tool", tool_call_id: call.id, content: output });
    }
  }
}

function isPromptTooLong(err: unknown): boolean {
  const msg = String(err).toLowerCase();
  return msg.includes("prompt_too_long") || msg.includes("too many tokens");
}
