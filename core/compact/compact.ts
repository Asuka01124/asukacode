import type OpenAI from "openai";
import { toolResultBudget } from "./budget.js";
import { snipCompact } from "./snip.js";
import { microCompact } from "./micro.js";
import { compactHistory } from "./auto.js";
import { toModelMessages } from "./to_model.js";
import { computeContextStats, estimateMessagesTokens } from "../utils/token-estimator.js";
import { getModelContextWindow } from "../utils/model-context.js";

export { reactiveCompact, isContextOverflowError } from "./reactive.js";
export { toModelMessages } from "./to_model.js";
export { computeContextStats } from "../utils/token-estimator.js";
export type { ContextStats } from "../utils/token-estimator.js";

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
