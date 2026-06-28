export type ModelContextWindow = {
  contextWindow: number
  outputReserve: number
  effectiveInput: number
}

type ModelContextRule = {
  patterns: readonly string[]
  contextWindow: number
  outputReserve: number
}

export const DEEPSEEK_MODELS = [
  {
    patterns: ["deepseek-v4-flash"],
    contextWindow: 1_048_576,
    outputReserve: 8_000,
  },
  {
    patterns: ["deepseek-v4-pro"],
    contextWindow: 1_048_576,
    outputReserve: 8_000,
  },
] as const

export const CLAUDE_MODELS = [
  {
    patterns: ["claude-fable-5"],
    contextWindow: 1_000_000,
    outputReserve: 8_000,
  },
  {
    patterns: ["claude-opus-4-8"],
    contextWindow: 1_000_000,
    outputReserve: 8_000,
  },
  {
    patterns: ["claude-sonnet-4-6"],
    contextWindow: 1_000_000,
    outputReserve: 8_000,
  },
  {
    patterns: ["claude-haiku-4-5"],
    contextWindow: 200_000,
    outputReserve: 8_000,
  },
] as const

export const OPENAI_MODELS = [
  {
    patterns: ["gpt-5.5", "gpt-5.5-2026-04-23"],
    contextWindow: 1_048_576,
    outputReserve: 8_000,
  },
  {
    patterns: ["gpt-5.5-pro"],
    contextWindow: 1_048_576,
    outputReserve: 8_000,
  },
  {
    patterns: ["gpt-5.4"],
    contextWindow: 1_000_000,
    outputReserve: 8_000,
  },
  {
    patterns: ["gpt-5.4-mini"],
    contextWindow: 1_000_000,
    outputReserve: 8_000,
  },
  {
    patterns: ["gpt-4.1", "gpt-4.1-2025-04-14"],
    contextWindow: 1_048_576,
    outputReserve: 8_000,
  },
] as const

export const QWEN_MODELS = [
  {
    patterns: ["qwen3.7-max", "bailian/qwen3.7-max"],
    contextWindow: 1_048_576,
    outputReserve: 8_000,
  },
  {
    patterns: ["qwen3.6-plus", "qwen-plus"],
    contextWindow: 1_000_000,
    outputReserve: 8_000,
  },
  {
    patterns: ["qwen3-max", "qwen3-max-instruct"],
    contextWindow: 262_144,
    outputReserve: 8_000,
  },
  {
    patterns: ["qwen3-235b-a22b-instruct-2507"],
    contextWindow: 1_000_000,
    outputReserve: 8_000,
  },
] as const

export const KIMI_MODELS = [
  {
    patterns: ["kimi-k2.7-code"],
    contextWindow: 262_144,
    outputReserve: 8_000,
  },
  {
    patterns: ["kimi-k2.6"],
    contextWindow: 262_144,
    outputReserve: 8_000,
  },
  {
    patterns: ["kimi-k2.5"],
    contextWindow: 262_144,
    outputReserve: 8_000,
  },
] as const

export const GLM_MODELS = [
  {
    patterns: ["glm-5.2", "glm-5.2[1m]"],
    contextWindow: 1_000_000,
    outputReserve: 8_000,
  },
  {
    patterns: ["glm-5.1"],
    contextWindow: 1_000_000,
    outputReserve: 8_000,
  },
  {
    patterns: ["glm-5"],
    contextWindow: 200_000,
    outputReserve: 8_000,
  },
] as const

export const MINIMAX_MODELS = [
  {
    patterns: ["MiniMax-M3"],
    contextWindow: 1_048_576,
    outputReserve: 8_000,
  },
  {
    patterns: ["MiniMax-M2.7", "MiniMax-M2.7-highspeed"],
    contextWindow: 204_800,
    outputReserve: 8_000,
  },
] as const

export const MIMO_MODELS = [
  {
    patterns: ["mimo-v2.5-pro"],
    contextWindow: 1_048_576,
    outputReserve: 8_000,
  },
  {
    patterns: ["mimo-v2.5"],
    contextWindow: 1_048_576,
    outputReserve: 8_000,
  },
  {
    patterns: ["mimo-v2-flash"],
    contextWindow: 262_144,
    outputReserve: 8_000,
  },
] as const

export const ALL_RULES: readonly ModelContextRule[] = [
  ...DEEPSEEK_MODELS,
  ...CLAUDE_MODELS,
  ...OPENAI_MODELS,
  ...QWEN_MODELS,
  ...KIMI_MODELS,
  ...GLM_MODELS,
  ...MINIMAX_MODELS,
  ...MIMO_MODELS,
]

const UNKNOWN_MODEL_CONTEXT: ModelContextRule = {
  patterns: [],
  contextWindow: 128_000,
  outputReserve: 8_000,
}

export function getModelContextWindow(model: string): ModelContextWindow {
  const normalized = model.trim().toLowerCase()
  for (const rule of ALL_RULES) {
    if (rule.patterns.some((pattern) => normalized.includes(pattern))) {
      return {
        contextWindow: rule.contextWindow,
        outputReserve: rule.outputReserve,
        effectiveInput: rule.contextWindow - rule.outputReserve,
      }
    }
  }

  return {
    contextWindow: UNKNOWN_MODEL_CONTEXT.contextWindow,
    outputReserve: UNKNOWN_MODEL_CONTEXT.outputReserve,
    effectiveInput: UNKNOWN_MODEL_CONTEXT.contextWindow - UNKNOWN_MODEL_CONTEXT.outputReserve,
  }
}
