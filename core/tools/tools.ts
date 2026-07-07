import OpenAI from "openai";

import { bashDefinition, runBash } from "./bash.js";
import { readFileDefinition, runRead } from "./read_file.js";
import { writeFileDefinition, runWrite } from "./write_file.js";
import { editFileDefinition, runEdit } from "./edit_file.js";
import { globDefinition, runGlob } from "./glob.js";
import { grepDefinition, runGrep } from "./grep.js";
import { loadSkillDefinition, runLoadSkill } from "./load_skill.js";
import { compactDefinition } from "./compact.js";
import { questionDefinition, runQuestion } from "./question.js";
import { webfetchDefinition, runWebfetch } from "./webfetch.js";
import { taskToolDefinitions, taskHandlers } from "./task_system.js";
import { planEnterDefinition, planExitDefinition, runPlanEnter, runPlanExit } from "./plan.js";
import { toolRegistry, type ToolCategory } from "./registry.js";

export const SUB_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    bashDefinition,
    readFileDefinition,
    writeFileDefinition,
    editFileDefinition,
    globDefinition,
    grepDefinition,
    loadSkillDefinition,
    compactDefinition,
    questionDefinition,
    webfetchDefinition,
    planEnterDefinition,
    planExitDefinition,
];

export const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    ...SUB_TOOLS,
    ...taskToolDefinitions,
];

type ToolHandler = (args: unknown) => Promise<string>;

export const TOOL_HANDLERS: Record<string, ToolHandler> = {
    bash: runBash,
    read_file: runRead,
    write_file: runWrite,
    edit_file: runEdit,
    glob: runGlob,
    grep: runGrep,
    load_skill: runLoadSkill,
    question: runQuestion,
    webfetch: runWebfetch,
    plan_enter: runPlanEnter,
    plan_exit: runPlanExit,
    ...taskHandlers,
};

export const PLAN_BLOCKED_TOOLS = new Set([
    "bash",
    "write_file",
    "edit_file",
    "plan_exit",
]);

function categorizeTool(name: string): ToolCategory {
    if (name.includes("read") || name.includes("glob") || name.includes("grep") || name.includes("fetch")) {
        return "read";
    }
    if (name.includes("write") || name.includes("edit")) {
        return "write";
    }
    if (name === "bash") {
        return "execute";
    }
    if (name.includes("web") || name.includes("url")) {
        return "network";
    }
    return "write";
}

export function registerBuiltinTools(): void {
    const builtinTools = [
        { name: "bash", definition: bashDefinition, handler: runBash },
        { name: "read_file", definition: readFileDefinition, handler: runRead },
        { name: "write_file", definition: writeFileDefinition, handler: runWrite },
        { name: "edit_file", definition: editFileDefinition, handler: runEdit },
        { name: "glob", definition: globDefinition, handler: runGlob },
        { name: "grep", definition: grepDefinition, handler: runGrep },
        { name: "load_skill", definition: loadSkillDefinition, handler: runLoadSkill },
        { name: "question", definition: questionDefinition, handler: runQuestion },
        { name: "webfetch", definition: webfetchDefinition, handler: runWebfetch },
        { name: "plan_enter", definition: planEnterDefinition, handler: runPlanEnter },
        { name: "plan_exit", definition: planExitDefinition, handler: runPlanExit },
    ];

    for (const tool of builtinTools) {
        const def = tool.definition as any;
        toolRegistry.register({
            name: tool.name,
            description: def.function.description,
            parameters: def.function.parameters,
            metadata: {
                source: "builtin",
                category: categorizeTool(tool.name),
            },
            execute: tool.handler,
        });
    }

    for (const [name, handler] of Object.entries(taskHandlers)) {
        const def = taskToolDefinitions.find(t => (t as any).function.name === name) as any;
        if (def) {
            toolRegistry.register({
                name,
                description: def.function.description,
                parameters: def.function.parameters,
                metadata: {
                    source: "builtin",
                    category: "write",
                },
                execute: handler,
            });
        }
    }
}
