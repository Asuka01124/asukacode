import { compactHistory } from "../compact/auto.js";
import { toModelMessages, computeContextStats } from "../compact/index.js";
import type OpenAI from "openai";

export const compactDefinition: OpenAI.Chat.Completions.ChatCompletionTool = {
    type: "function",
    function: {
        name: "compact",
        description:
            "Compress conversation history by summarizing older messages. " +
            "Use this when the context is getting too long. " +
            "The conversation is summarized and older messages are replaced with the summary. " +
            "This reduces token usage while preserving key context.",
        parameters: {
            type: "object",
            properties: {},
            additionalProperties: false,
        },
    },
};

export async function runCompact(
    _args: unknown,
    sessionId: string,
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    client: OpenAI,
    model: string,
): Promise<string> {
    const stats = computeContextStats(messages, model)
    await compactHistory(sessionId, messages, client, model, stats);
    const rebuilt = toModelMessages(sessionId);
    messages.length = 0;
    messages.push(...rebuilt);
    return "[Compacted. Conversation history has been summarized.]";
}
