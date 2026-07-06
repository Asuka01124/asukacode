import fs from "node:fs";
import path from "node:path";
import type OpenAI from "openai";
import { getProjectDir } from "../config/project.js";
import { pipe } from "../agent/events.js";

interface Task {
    id: string;
    subject: string;
    description: string;
    status: "pending" | "in_progress" | "completed" | "cancelled";
    owner: string | null;
    blockedBy: string[];
    position: number;
}

function tasksDir(): string {
    const dir = path.join(getProjectDir(), "tasks");
    return dir;
}

function ensureDir(): void {
    fs.mkdirSync(tasksDir(), { recursive: true });
}

function taskPath(taskId: string): string {
    return path.join(tasksDir(), `${taskId}.json`);
}

function emitTaskList(): void {
    const tasks = listTasks()
    pipe.run({
        type: 'task_list',
        tasks: tasks.map(t => ({ id: t.id, text: t.subject, done: t.status === 'completed' })),
    })
}

function generateId(): string {
    return `task_${Date.now()}_${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
}

function saveTask(task: Task): void {
    ensureDir();
    fs.writeFileSync(taskPath(task.id), JSON.stringify(task, null, 2));
}

function loadTask(taskId: string): Task {
    return JSON.parse(fs.readFileSync(taskPath(taskId), "utf-8")) as Task;
}

function listTasks(): Task[] {
    ensureDir();
    const files = fs.readdirSync(tasksDir())
        .filter(f => f.startsWith("task_") && f.endsWith(".json"))
        .sort();
    return files.map(f => JSON.parse(fs.readFileSync(path.join(tasksDir(), f), "utf-8")) as Task);
}

function canStart(taskId: string): boolean {
    const task = loadTask(taskId);
    for (const depId of task.blockedBy) {
        if (!fs.existsSync(taskPath(depId))) return false;
        if (loadTask(depId).status !== "completed") return false;
    }
    return true;
}

function findUnblocked(): string[] {
    return listTasks()
        .filter(t => t.status === "pending" && t.blockedBy.length > 0 && canStart(t.id))
        .map(t => t.subject);
}

interface TodoItem {
    content: string;
    status: "pending" | "in_progress" | "completed" | "cancelled";
    blockedBy?: string[];
}

export async function todowrite(args: { todos: TodoItem[] }): Promise<string> {
    const { todos } = args;
    const existing = listTasks();

    const contentMap = new Map<string, Task>();
    for (const t of existing) {
        contentMap.set(t.subject, t);
    }

    const icons: Record<string, string> = { pending: "○", in_progress: "●", completed: "✓", cancelled: "✗" };
    const lines: string[] = [];

    for (let i = 0; i < todos.length; i++) {
        const item = todos[i];
        const existingTask = contentMap.get(item.content);

        if (existingTask) {

            contentMap.delete(item.content);
            if (existingTask.status !== item.status ||
                JSON.stringify(existingTask.blockedBy) !== JSON.stringify(item.blockedBy || [])) {
                existingTask.status = item.status;
                existingTask.blockedBy = item.blockedBy || [];
                existingTask.position = i;
                saveTask(existingTask);
            }
        } else {

            const task: Task = {
                id: generateId(),
                subject: item.content,
                description: "",
                status: item.status,
                owner: item.status === "in_progress" ? "agent" : null,
                blockedBy: item.blockedBy || [],
                position: i,
            };
            saveTask(task);
            contentMap.delete(item.content); // just to be safe
        }
    }

    for (const removed of contentMap.values()) {
        fs.unlinkSync(taskPath(removed.id));
    }

    const current = listTasks().sort((a, b) => a.position - b.position);
    for (const t of current) {
        const icon = icons[t.status] || "?";
        const deps = t.blockedBy.length > 0 ? ` \x1b[90m(blockedBy: ${t.blockedBy.join(", ")})\x1b[0m` : "";
        lines.push(`  [${icon}] ${t.subject}${deps}`);
    }

    emitTaskList()
    return `Updated ${current.length} tasks.`;
}

export async function createTask(args: { subject: string; description?: string; blockedBy?: string[] }): Promise<string> {
    const existing = listTasks();
    const task: Task = {
        id: generateId(),
        subject: args.subject,
        description: args.description || "",
        status: "pending",
        owner: null,
        blockedBy: args.blockedBy || [],
        position: existing.length,
    };
    saveTask(task);
    emitTaskList()
    const deps = task.blockedBy.length > 0 ? ` (blockedBy: ${task.blockedBy.join(", ")})` : "";
    return `Created ${task.id}: ${task.subject}${deps}`;
}

export async function listAllTasks(): Promise<string> {
    const tasks = listTasks();
    if (tasks.length === 0) return "No tasks. Use create_task to add some.";
    const icons: Record<string, string> = { pending: "○", in_progress: "●", completed: "✓", cancelled: "✗" };
    return tasks.map(t => {
        const icon = icons[t.status] || "?";
        const deps = t.blockedBy.length > 0 ? ` (blockedBy: ${t.blockedBy.join(", ")})` : "";
        const owner = t.owner ? ` [${t.owner}]` : "";
        return `  ${icon} ${t.id}: ${t.subject} [${t.status}]${owner}${deps}`;
    }).join("\n");
}

export async function getTask(taskId: string): Promise<string> {
    try {
        return JSON.stringify(loadTask(taskId), null, 2);
    } catch {
        return `Error: Task ${taskId} not found`;
    }
}

export async function claimTask(taskId: string): Promise<string> {
    let task: Task;
    try {
        task = loadTask(taskId);
    } catch {
        return `Error: Task ${taskId} not found`;
    }
    if (task.status !== "pending") return `Task ${taskId} is ${task.status}, cannot claim`;
    if (!canStart(taskId)) {
        const blocked = task.blockedBy.filter(depId => {
            if (!fs.existsSync(taskPath(depId))) return true;
            return loadTask(depId).status !== "completed";
        });
        return `Blocked by: ${blocked.join(", ")}`;
    }
    task.owner = "agent";
    task.status = "in_progress";
    saveTask(task);
    emitTaskList()
    return `Claimed ${task.id} (${task.subject})`;
}

export async function completeTask(taskId: string): Promise<string> {
    let task: Task;
    try {
        task = loadTask(taskId);
    } catch {
        return `Error: Task ${taskId} not found`;
    }
    if (task.status !== "in_progress") return `Task ${taskId} is ${task.status}, cannot complete`;
    task.status = "completed";
    saveTask(task);
    emitTaskList()
    let msg = `Completed ${task.id} (${task.subject})`;
    const unblocked = findUnblocked();
    if (unblocked.length > 0) {
        msg += `\nUnblocked: ${unblocked.join(", ")}`;
    }
    return msg;
}

function taskDef(name: string, desc: string, props: Record<string, unknown>, required: string[] = []): OpenAI.Chat.Completions.ChatCompletionTool {
    return {
        type: "function",
        function: { name, description: desc, parameters: { type: "object", properties: props, required, additionalProperties: false } },
    };
}

export const taskToolDefinitions: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    taskDef("todowrite",
        "Create and maintain a structured task list for the current coding session. " +
        "Pass the full list of all tasks with their current statuses each time. " +
        "Supports task dependencies via blockedBy: list task IDs that must be completed first. " +
        "Only one task should be in_progress at a time. " +
        "Statuses: pending → in_progress → completed/cancelled.",
        {
            todos: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        content: { type: "string", description: "Brief description of the task" },
                        status: { type: "string", enum: ["pending", "in_progress", "completed", "cancelled"], description: "Current status of the task" },
                        blockedBy: { type: "array", items: { type: "string" }, description: "Task IDs that must be completed before this task can start" },
                    },
                    required: ["content", "status"],
                },
            },
        },
        ["todos"]),
    taskDef("create_task",
        "Create a new task with optional blockedBy dependencies. " +
        "Use this when you need to add a single task with specific dependency requirements. " +
        "BlockedBy lists task IDs that must be completed before this task can be claimed.",
        { subject: { type: "string", description: "Short task name" }, description: { type: "string", description: "Detailed task description" }, blockedBy: { type: "array", items: { type: "string" }, description: "Task IDs that block this task" } },
        ["subject"]),
    taskDef("list_tasks",
        "List all tasks with status, owner, and dependencies. " +
        "Returns a formatted table showing task IDs, subjects, statuses, and blockedBy relationships.",
        {}, []),
    taskDef("get_task",
        "Get full details of a specific task by ID. " +
        "Returns JSON with id, subject, description, status, owner, blockedBy.",
        { task_id: { type: "string", description: "The task ID to retrieve" } }, ["task_id"]),
    taskDef("claim_task",
        "Claim a pending task to indicate you are working on it. " +
        "Sets owner to agent and status to in_progress. " +
        "Fails if the task is blocked by incomplete dependencies. " +
        "Only one task should be in_progress at a time.",
        { task_id: { type: "string", description: "The task ID to claim" } }, ["task_id"]),
    taskDef("complete_task",
        "Complete an in_progress task. " +
        "Changes status to completed and reports any downstream tasks that became unblocked. " +
        "Unblocked tasks should be checked and claimed if appropriate.",
        { task_id: { type: "string", description: "The task ID to complete" } }, ["task_id"]),
];

export const taskHandlers: Record<string, (args: unknown) => Promise<string>> = {
    todowrite: (a) => todowrite(a as { todos: TodoItem[] }),
    create_task: (a) => createTask(a as { subject: string; description?: string; blockedBy?: string[] }),
    list_tasks: () => listAllTasks(),
    get_task: (a) => getTask((a as { task_id: string }).task_id),
    claim_task: (a) => claimTask((a as { task_id: string }).task_id),
    complete_task: (a) => completeTask((a as { task_id: string }).task_id),
};
