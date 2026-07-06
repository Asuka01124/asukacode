import OpenAI from "openai";
import z from "zod";
import { SKILL_REGISTRY } from "../skills/skills.js";

const LoadSkillArgs = z.object({
    name: z.string(),
});

export const loadSkillDefinition: OpenAI.Chat.Completions.ChatCompletionTool = {
    type: "function",
    function: {
        name: "load_skill",
        description:
            "Load a specialized skill by name. " +
            "You may ONLY call this tool when the user explicitly mentions a skill name in their message. " +
            "Do NOT proactively load skills based on task matching or guessing. " +
            "The skill name must match one from the available skills list in the system context.",
        parameters: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description: "The name of the skill from the available skills list",
                },
            },
            required: ["name"],
        },
    },
};

export async function runLoadSkill(args: unknown): Promise<string> {
    const parsed = LoadSkillArgs.safeParse(args);
    if (!parsed.success) return `Error: ${parsed.error.message}`;
    const skill = SKILL_REGISTRY.get(parsed.data.name);
    if (!skill) return `Skill not found: ${parsed.data.name}`;
    return skill.content;
}
