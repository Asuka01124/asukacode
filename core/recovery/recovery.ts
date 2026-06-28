export const DEFAULT_MAX_TOKENS = 8000;

export const ESCALATED_MAX_TOKENS = 64_000;

export const MAX_RECOVERY_RETRIES = 3;

export const MAX_RETRIES = 3;

const BASE_DELAY_MS = 2000;

export class RecoveryState {
    hasEscalated = false;
    recoveryCount = 0;
    hasAttemptedReactiveCompact = false;
    currentModel: string;

    constructor(primaryModel: string) {
        this.currentModel = primaryModel;
    }
}

function retryDelay(attempt: number): number {
    const base = Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 32_000) / 1000;
    const jitter = Math.random() * base * 0.25;
    return base + jitter;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms * 1000));
}

export function isPromptTooLongError(err: unknown): boolean {
    const msg = String(err).toLowerCase();
    return (
        (msg.includes("prompt") && msg.includes("long")) ||
        msg.includes("prompt_is_too_long") ||
        msg.includes("context_length_exceeded") ||
        msg.includes("max_context_window")
    );
}

function isRateLimit(err: unknown): boolean {
    const msg = String(err).toLowerCase();
    return msg.includes("429") || msg.includes("rate") && msg.includes("limit");
}

function isOverloaded(err: unknown): boolean {
    const msg = String(err).toLowerCase();
    const name = (err as any)?.constructor?.name || "";
    return (
        msg.includes("529") ||
        name.toLowerCase().includes("overloaded") ||
        msg.includes("overloaded")
    );
}

type ApiCall<T> = () => Promise<T>;

export async function withRetry<T>(
    fn: ApiCall<T>,
    state: RecoveryState,
): Promise<T> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const result = await fn();
            return result;
        } catch (err) {

            if (isRateLimit(err)) {
                const delay = retryDelay(attempt);
                await sleep(delay);
                continue;
            }

            if (isOverloaded(err)) {
                const delay = retryDelay(attempt);
                await sleep(delay);
                continue;
            }

            throw err;
        }
    }
    throw new Error(`Max retries (${MAX_RETRIES}) exceeded`);
}

