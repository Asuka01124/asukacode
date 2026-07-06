import type OpenAI from "openai";
import { toolResultBudget } from "./budget.js";
import { snipCompact } from "./snip.js";
import { microCompact } from "./micro.js";
import { compactHistory } from "./auto.js";
import { toModelMessages } from "./to_model.js";
import { computeContextStats, estimateMessagesTokens } from "./token-estimator.js";
import { getModelContextWindow } from "../config/model-context.js";

type Msg = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export async function runCompactionPipeline(
    sessionId: string,
    messages: Msg[],
    client: OpenAI,
    model: string,
): Promise<Msg[]> {

    const window = getModelContextWindow(model)
    const estimated = estimateMessagesTokens(messages)
    const estimatedRatio = estimated / window.effectiveInput
    if (estimatedRatio < 0.5) return messages

    const stats = computeContextStats(messages, model)

    microCompact(messages, stats)

    snipCompact(sessionId, messages, stats)

    toolResultBudget(messages, stats)

    await compactHistory(sessionId, messages, client, model, stats)

    return toModelMessages(sessionId)
}
