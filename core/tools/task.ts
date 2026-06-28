import OpenAI from "openai";
import z from "zod";
import { SUB_TOOLS, TOOL_HANDLERS } from "./tools.js";
import { checkToolPermission } from "../permission/permission.js";

const TaskArgs = z.object({
    description: z.string(),
});

export const taskDefinition: OpenAI.Chat.Completions.ChatCompletionTool = {
    type: "function",
    function: {
        name: "task",
        description:
            "Launch a subagent to handle a complex, multi-step task autonomously. " +
            "The subagent has independent context and access to all tools. " +
            "Returns only the final conclusion — intermediate steps are hidden. " +
            "Use this for parallel work or to isolate complex sub-tasks without polluting the main context.",
        parameters: {
            type: "object",
            properties: {
                description: {
                    type: "string",
                    description: "Detailed task description for the subagent to complete",
                },
            },
            required: ["description"],
        },
    },
};

let _client: OpenAI | null = null;
let _model = "";

export function setSubagentConfig(client: OpenAI, model: string): void {
    _client = client;
    _model = model;
}

const SUB_SYSTEM = `You are a coding sub-agent. Complete the task you were given, then return a concise summary. Do NOT explain your reasoning. Do not delegate further.`;

const SUB_MAX_TURNS = 30;

const SUB_ASK = async () => "n";

async function subAgentLoop(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
): Promise<string> {
    if (!_client) throw new Error("Subagent not configured");
    for (let turn = 0; turn < SUB_MAX_TURNS; turn++) {
        const response = await _client.chat.completions.create({
            model: _model,
            messages: [
                { role: "system", content: SUB_SYSTEM },
                ...messages,
            ],
            tools: SUB_TOOLS,
        });

        const assistant = response.choices[0].message;
        messages.push(assistant);

        if (!assistant.tool_calls?.length) {
            return (assistant.content as string) || "(no output)";
        }

        for (const call of assistant.tool_calls) {
            if (call.type !== "function") continue;

            const name = call.function.name;
            const args = JSON.parse(call.function.arguments);

            const block = { name, input: args };

            const denied = await checkToolPermission(block);
            let output: string;

            if (denied) {
                output = denied;
            } else {
                const handler = TOOL_HANDLERS[name];
                output = handler ? await handler(block.input) : `Unknown tool: ${name}`;
            }

            messages.push({
                role: "tool",
                tool_call_id: call.id,
                content: output,
            });
        }
    }

    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "assistant" && messages[i].content) {
            return messages[i].content as string;
        }
    }
    return "Subagent stopped after 30 turns without final answer.";
}

export async function spawnSubagent(args: unknown): Promise<string> {
    const parsed = TaskArgs.safeParse(args);
    if (!parsed.success) return `Error: ${parsed.error.message}`;
  const { description } = parsed.data;
  const result = await subAgentLoop([
        { role: "user", content: description },
  ]);
  return result;
}
