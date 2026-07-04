import { make, combine, type SystemContext } from "./syscontext.js"
import { register } from "./registry.js"

function getEnvironment(): string {
  const parts = [
    "<env>",
    `  Working directory: ${process.cwd()}`,
    `  Platform: ${process.platform}`,
    `  Node version: ${process.version}`,
    "</env>",
  ]
  return parts.join("\n")
}

const environmentSource: SystemContext = make({
  key: "core/environment",
  load: async () => getEnvironment(),
  baseline: (env) =>
    ["Here is some useful information about the environment you are running in:", env].join("\n"),
  update: (_previous, env) =>
    ["The environment you are running in is now:", env].join("\n"),
})

function getCurrentDate(): string {
  return new Date().toDateString()
}

const dateSource: SystemContext = make({
  key: "core/date",
  load: async () => getCurrentDate(),
  baseline: (date) => `Today's date: ${date}`,
  update: (_previous, date) => `Today's date is now: ${date}`,
})

const IDENTITY = "You are AsukaCode, a terminal-based coding assistant. Use the available tools to complete tasks step by step. After each tool result, decide the next action. Return a concise summary when the task is complete."

const identitySource: SystemContext = make({
  key: "core/identity",
  load: async () => IDENTITY,
  baseline: (identity) => identity,
  update: (_previous, identity) => identity,
})

export const builtinsContext: SystemContext = combine([
  identitySource,
  environmentSource,
  dateSource,
])

export function registerBuiltins(): void {
  register({
    key: "core/builtins",
    load: async () => builtinsContext,
  })
}
