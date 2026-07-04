import { useState, useEffect, useRef } from "react";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { theme } from "../theme";
import type {
  ConversationEntry,
  ContextStats,
  SessionInfo,
  CommandPaletteItem,
  TodoItem,
} from "../types";
import { Sidebar } from "./Sidebar";
import { UserMessage } from "./UserMessage";
import { AssistantMessage } from "./AssistantMessage";
import { ThinkingMessage } from "./ThinkingMessage";
import { ToolCallMessage } from "./ToolCallMessage";
import { PermissionDialog } from "./PermissionDialog";
import { InputBar } from "./InputBar";
import { Picker, type PickerItem } from "./Picker";
import { pipe } from "../../../core/agent/events.js";
import type {
  AppEvent,
  PermissionPayload,
  QuestionPayload,
} from "../../../core/agent/events.js";
import { getDB } from "../../../core/database/database.js";
import { listSessions } from "../../../core/database/messages.js";
import { SKILL_REGISTRY } from "../../../core/skills/skills.js";

const SIDEBAR_MIN_TERM_WIDTH = 80;

const MENTION_ITEMS: CommandPaletteItem[] = [];

function parseSlashCommand(text: string): AppEvent | null {
  if (!text.startsWith("/")) return null;
  const space = text.indexOf(" ");
  const cmd = space === -1 ? text.slice(1) : text.slice(1, space);
  const args = space === -1 ? "" : text.slice(space + 1).trim();
  switch (cmd) {
    case "new":
      return { type: "cmd:new" };
    case "clear":
      return { type: "cmd:clear" };
    case "resume":
      return { type: "cmd:resume", sessionId: args || undefined };
    case "skill":
      return { type: "cmd:skill" };
    case "thinking":
      return { type: "cmd:thinking" };
    case "tool":
      return { type: "cmd:tool" };
    case "help":
      return { type: "cmd:help" };
    default:
      return null;
  }
}

export interface AppProps {
  onSubmit: (text: string) => void;
  onStop?: () => void;
  onNew?: () => void;
  onResume?: (sessionId: string) => void;
  initialConversation?: ConversationEntry[];
  initialSessionName?: string;
  model?: string;
}

export function App({
  onSubmit,
  onStop,
  onNew,
  onResume,
  initialConversation,
  initialSessionName,
  model,
}: AppProps) {
  const [conversation, setConversation] = useState<ConversationEntry[]>(
    initialConversation ?? [],
  );
  const [inputFocused, setInputFocused] = useState(true);
  const [running, setRunning] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  const [thinkingMode, setThinkingMode] = useState<"show" | "hide">("hide");
  const [showToolDetails, setShowToolDetails] = useState(true);

  const slashCommands: CommandPaletteItem[] = [
    { id: "new", label: "new", description: "开启新对话" },
    { id: "clear", label: "clear", description: "清空对话" },
    { id: "resume", label: "resume", description: "加载历史对话" },
    { id: "skill", label: "skill", description: "查看可用技能" },
    { id: "thinking", label: "thinking", description: thinkingMode === "hide" ? "开启思考过程显示" : "折叠思考过程" },
    { id: "tool", label: "tool", description: showToolDetails ? "隐藏工具调用" : "显示工具调用" },
    { id: "help", label: "help", description: "查看帮助" },
  ];

  const [context, setContext] = useState<ContextStats>({
    tokens: 0,
    tokenLimit: 200_000,
    costUsd: 0,
  });

  const [session, setSession] = useState<SessionInfo>({
    id: "",
    name: initialSessionName ?? "",
    elapsedSeconds: 0,
  });

  useEffect(() => {
    return pipe.use((ev: AppEvent, next) => {
      switch (ev.type) {
        case "cmd:clear":
          setConversation([]);
          setInputKey((k) => k + 1);
          return;
        case "cmd:new":
          setConversation([]);
          setInputKey((k) => k + 1);
          setRunning(false);
          onNew?.();
          return;
        case "cmd:help":
          setConversation((prev) => [
            ...prev,
            {
              type: "assistant_message",
              id: crypto.randomUUID(),
              heading: "帮助",
              lines: [
                "/new       — 开启新对话",
                "/clear     — 清空当前对话",
                "/resume    — 加载历史对话",
                "/skill     — 查看可用技能",
                "/thinking  — 切换思考过程显示",
                "/tool      — 切换工具调用显示",
                "/help      — 显示此帮助",
                "Ctrl+C     — 双击退出",
              ],
            },
          ]);
          setInputKey((k) => k + 1);
          return;
        case "cmd:skill": {
          const skills = [...SKILL_REGISTRY.values()];
          if (skills.length === 0) {
            setConversation((prev) => [
              ...prev,
              {
                type: "assistant_message",
                id: crypto.randomUUID(),
                lines: ["没有找到任何技能"],
              },
            ]);
          } else {
            const allSkills = skills.map((s) => ({
              id: s.name,
              label: s.name,
              description:
                s.description.length > 50
                  ? s.description.slice(0, 50) + "..."
                  : s.description,
            }));
            setPicker({
              items: allSkills,
              searchable: true,
              onSearch: (query) => {
                const filtered = query
                  ? allSkills.filter(
                      (s) =>
                        s.label.toLowerCase().includes(query.toLowerCase()) ||
                        s.description?.toLowerCase().includes(query.toLowerCase()),
                    )
                  : allSkills;
                setPicker((prev) => (prev ? { ...prev, items: filtered } : null));
              },
              onSelect: (id) => {
                setPicker(null);
                setTimeout(() => {
                  const skill = SKILL_REGISTRY.get(id);
                  const text = skill ? `/load_skill ${id}` : id;
                  setConversation((prev) => [
                    ...prev,
                    {
                      type: "user_message",
                      id: crypto.randomUUID(),
                      content: `加载技能: ${id}`,
                    },
                  ]);
                  setRunning(true);
                  onSubmit(text);
                }, 0);
              },
            });
          }
          return;
        }
        case "cmd:thinking":
          setThinkingMode((prev) => (prev === "hide" ? "show" : "hide"));
          setConversation((prev) => [
            ...prev,
            {
              type: "assistant_message",
              id: crypto.randomUUID(),
              lines: [
                thinkingMode === "hide"
                  ? "思考过程已显示"
                  : "思考过程已隐藏",
              ],
            },
          ]);
          setInputKey((k) => k + 1);
          return;
        case "cmd:tool":
          setShowToolDetails((prev) => !prev);
          setConversation((prev) => [
            ...prev,
            {
              type: "assistant_message",
              id: crypto.randomUUID(),
              lines: [
                showToolDetails
                  ? "工具调用已隐藏"
                  : "工具调用已显示",
              ],
            },
          ]);
          setInputKey((k) => k + 1);
          return;
        case "cmd:resume":
          if (ev.sessionId) {
            onResume?.(ev.sessionId);
            setPicker(null);
            setInputKey((k) => k + 1);
          } else {
            const sessions = listSessions(getDB(), 20);
            const allSessions = sessions.map((s) => ({
              id: s.sessionId,
              label: new Date(s.lastAt * 1000).toLocaleString(),
              description: s.preview,
            }));
            setPicker({
              items: allSessions,
              searchable: true,
              onSearch: (query) => {
                const filtered = query
                  ? allSessions.filter(
                      (s) =>
                        s.label.toLowerCase().includes(query.toLowerCase()) ||
                        s.description?.toLowerCase().includes(query.toLowerCase()),
                    )
                  : allSessions;
                setPicker((prev) => (prev ? { ...prev, items: filtered } : null));
              },
              onSelect: (id) => {
                onResume?.(id);
                setPicker(null);
              },
            });
          }
          return;

        case "assistant_delta":
          setConversation((prev) => [
            ...prev,
            {
              type: "assistant_message",
              id: crypto.randomUUID(),
              lines: [ev.content],
            },
          ]);
          break;
        case "thinking_start":
          setConversation((prev) => [
            ...prev,
            {
              type: "thinking",
              id: crypto.randomUUID(),
              lines: [],
            },
          ]);
          break;
        case "thinking_delta":
          setConversation((prev) => {
            const last = prev[prev.length - 1];
            if (last?.type === "thinking") {
              return [
                ...prev.slice(0, -1),
                { ...last, lines: [...last.lines, ev.content] },
              ];
            }
            return prev;
          });
          break;
        case "thinking_end":
          break;
        case "tool_start":
          setConversation((prev) => [
            ...prev,
            {
              type: "tool_call",
              id: crypto.randomUUID(),
              name: ev.name,
              input: ev.input,
              status: "running" as const,
              startTime: Date.now(),
            },
          ]);
          break;
        case "tool_end":
          setConversation((prev) => {
            const last = prev[prev.length - 1];
            if (last?.type === "tool_call" && last.name === ev.name) {
              return [
                ...prev.slice(0, -1),
                {
                  ...last,
                  output: ev.output,
                  status: (ev.denied ? "denied" : "completed") as "denied" | "completed",
                  endTime: Date.now(),
                },
              ];
            }
            return prev;
          });
          break;
        case "finished":
          setRunning(false);
          break;
        case "error":
          setConversation((prev) => [
            ...prev,
            {
              type: "assistant_message",
              id: crypto.randomUUID(),
              lines: [`Error: ${ev.error}`],
            },
          ]);
          setRunning(false);
          break;
        case "task_list":
          setTodos(ev.tasks);
          break;
        case "state_changed":
          setSession((prev) => ({
            ...prev,
            id: ev.sessionId,
          }));
          break;
        case "context_stats":
          setContext({
            tokens: ev.totalTokens,
            tokenLimit: ev.contextWindow,
            costUsd: 0,
          });
          break;
        case "question": {
          const { question, options, resolve } = ev.payload;
          setPicker({
            items: options.map((o, i) => ({
              id: String(i),
              label: o.label,
              description: o.description,
            })),
            onSelect: (id) => {
              setPicker(null);
              resolve(options[Number(id)]?.label ?? id);
            },
          });
          return;
        }
        case "permission":
          setPermission(ev.payload);
          return;
      }
      next();
    });
  }, []);

  const [permission, setPermission] = useState<PermissionPayload | null>(null);
  const [picker, setPicker] = useState<{
    items: PickerItem[];
    onSelect: (id: string) => void;
    searchable?: boolean;
    onSearch?: (query: string) => void;
  } | null>(null);
  const [todos, setTodos] = useState<TodoItem[]>([]);

  useEffect(() => {
    if (!running) return;
    const start = Date.now();
    const timer = setInterval(() => {
      setSession((prev) => ({
        ...prev,
        elapsedSeconds: Math.floor((Date.now() - start) / 1000),
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, [running]);

  const handleSubmit = (value: string) => {
    if (running) return;
    const cmd = parseSlashCommand(value);
    if (cmd) {
      pipe.run(cmd);
      return;
    }

    setConversation((prev) => [
      ...prev,
      {
        type: "user_message",
        id: crypto.randomUUID(),
        content: value,
      },
    ]);
    setSession((prev) =>
      prev.name ? prev : { ...prev, name: value.slice(0, 50) },
    );
    setRunning(true);
    setInputKey((k) => k + 1);
    onSubmit(value);
  };

  const lastCtrlC = useRef(0);

  useKeyboard((key) => {
    if (key.ctrl && key.name === "c") {
      const now = Date.now();
      if (now - lastCtrlC.current < 1000) {
        process.exit(0);
      }
      lastCtrlC.current = now;
      return;
    }
  });

  const { width: termWidth } = useTerminalDimensions();

  return (
    <box
      width="100%"
      height="100%"
      flexDirection="column"
      backgroundColor={theme.color.appBg}
    >
      <box flexDirection="row" flexGrow={1} overflow="hidden">
        <box flexDirection="column" flexGrow={1} overflow="hidden">
          <scrollbox
            flexDirection="column"
            flexGrow={1}
            gap={theme.space.md}
            scrollY
            stickyScroll
            stickyStart="bottom"
            verticalScrollbarOptions={{ visible: false }}
            scrollAcceleration={{ tick: () => 3, reset: () => {} }}
            marginLeft={2}
            marginBottom={2}
            focusable={false}
          >
            {conversation.map((entry) => {
              if (entry.type === "user_message")
                return <UserMessage key={entry.id} content={entry.content} />;
              if (entry.type === "assistant_message")
                return <AssistantMessage key={entry.id} entry={entry} />;
              if (entry.type === "thinking")
                return (
                  <ThinkingMessage
                    key={entry.id}
                    entry={entry}
                    expanded={thinkingMode === "show"}
                  />
                );
              if (entry.type === "tool_call")
                return (
                  <ToolCallMessage
                    key={entry.id}
                    entry={entry}
                  />
                );
              return null;
            })}
          </scrollbox>

          {permission && (
            <PermissionDialog
              payload={{
                ...permission,
                approve: () => {
                  permission.approve();
                  setPermission(null);
                },
                deny: () => {
                  permission.deny();
                  setPermission(null);
                },
              }}
            />
          )}

          {picker && (
            <Picker
              items={picker.items}
              onSelect={(id) => {
                picker.onSelect(id);
                setInputKey((k) => k + 1);
              }}
              onCancel={() => {
                setPicker(null);
                setInputKey((k) => k + 1);
              }}
              searchable={picker.searchable}
              onSearch={picker.onSearch}
            />
          )}

          <InputBar
            key={inputKey}
            onSubmit={handleSubmit}
            busy={running || !!picker}
            focused={inputFocused && !permission && !picker}
            mode={running ? "running" : "idle"}
            model={model || "unknown"}
            placeholder=""
            slashItems={slashCommands}
            mentionItems={MENTION_ITEMS}
          />
        </box>

        {termWidth >= SIDEBAR_MIN_TERM_WIDTH && (
          <Sidebar
            context={context}
            session={session}
            todos={todos}
            flexShrink={1}
          />
        )}
      </box>
    </box>
  );
}
