import type OpenAI from "openai";

export const SNIP_COMPACT_UTILIZATION = 0.70;

export const SNIP_TARGET_USAGE = 0.60;

export const MICRO_COMPACT_UTILIZATION = 0.50;

export const BUDGET_COMPACT_UTILIZATION = 0.75;

export const AUTO_COMPACT_UTILIZATION = 0.85;

export const BLOCKED_UTILIZATION = 0.95;

export const KEEP_RECENT = 3;

export const MAX_MESSAGES = 100;

export const PERSIST_THRESHOLD = 30_000;

export const MAX_REACTIVE_RETRIES = 1;

type Msg = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export function estimateSize(messages: Msg[]): number {
    return JSON.stringify(messages).length;
}

export function hasToolCalls(msg: Msg): boolean {
    if (msg.role !== "assistant") return false;
    const tc = (msg as any).tool_calls;
    return Array.isArray(tc) && tc.length > 0;
}

export function isToolMessage(msg: Msg): boolean {
    return msg.role === "tool";
}

export function getToolCallIds(msg: Msg): string[] {
    if (msg.role !== "assistant") return [];
    const tc = (msg as any).tool_calls;
    if (!Array.isArray(tc)) return [];
    return tc.map((c: any) => c.id);
}

export function getToolCallId(msg: Msg): string | undefined {
    if (msg.role !== "tool") return undefined;
    return (msg as any).tool_call_id;
}

export function toolBelongsToAssistant(
    messages: Msg[],
    toolIdx: number,
    assistantIdx: number,
): boolean {
    const toolMsg = messages[toolIdx];
    if (!isToolMessage(toolMsg)) return false;
    const tid = getToolCallId(toolMsg);
    if (!tid) return false;

    const pendingIds = new Set<string>();
    for (let i = assistantIdx; i < toolIdx; i++) {
        if (hasToolCalls(messages[i])) {
            for (const id of getToolCallIds(messages[i])) {
                pendingIds.add(id);
            }
        }
        if (isToolMessage(messages[i])) {
            const doneId = getToolCallId(messages[i]);
            if (doneId) pendingIds.delete(doneId);
        }
    }
    return pendingIds.has(tid);
}
