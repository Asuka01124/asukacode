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
    ...taskHandlers,
};
