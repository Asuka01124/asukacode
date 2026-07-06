import OpenAI from "openai";
import { pipe } from "../agent/index.js";

export const planEnterDefinition: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "plan_enter",
    description:
      "Switch to plan mode (read-only). Use when the user's request would benefit from planning before implementation. In plan mode, file edits and shell commands are disabled. Only read_file, glob, grep, webfetch, question, and load_skill are allowed.",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "Why switching to plan mode is recommended",
        },
      },
      required: [],
    },
  },
};

export const planExitDefinition: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "plan_exit",
    description:
      "Exit plan mode and switch back to build mode. Call this after the plan is complete and ready for implementation.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
};

export function runPlanEnter(
  input: unknown,
): Promise<string> {
  const args = input as Record<string, unknown>;
  const reason = args.reason ? String(args.reason) : "Planning phase";
  pipe.run({ type: "cmd:plan" });
  return Promise.resolve(`Switched to plan mode. ${reason}`);
}

export function runPlanExit(): Promise<string> {
  pipe.run({ type: "cmd:build" });
  return Promise.resolve("Switched to build mode. Ready to implement.");
}
