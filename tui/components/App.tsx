import { useState, useEffect, useRef } from "react";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { theme } from "../theme";
import type {
  ConversationEntry,
  ContextStats,
  SessionInfo,
  CommandPaletteItem,
  TodoItem,
  AgentMode,
} from "../types";
import { Sidebar } from "./Sidebar";
import { UserMessage } from "./UserMessage";
import { AssistantMessage } from "./AssistantMessage";
import { ThinkingMessage } from "./ThinkingMessage";
import { ToolCallMessage } from "./ToolCallMessage";
import { PermissionDialog } from "./PermissionDialog";
import { InputBar } from "./InputBar";
import { Picker, type PickerItem } from "./Picker";
import { pipe } from "../../core/agent/events.js";
import type {
  AppEvent,
  PermissionPayload,
  QuestionPayload,
} from "../../core/agent/events.js";
import { getDB } from "../../core/database/database.js";
import { listSessions } from "../../core/database/messages.js";
import { SKILL_REGISTRY } from "../../core/skills/skills.js";
import { ICON_NAMES, ICONS } from "../icons/index.js";
import { mcpManager, reloadMCP } from "../../core/mcp/index.js";

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
    case "icon":
      return { type: "cmd:icon" };
    case "plan":
      return { type: "cmd:plan" };
    case "build":
      return { type: "cmd:build" };
    case "compact":
      return { type: "cmd:compact" };
    case "mcp":
      return { type: "cmd:mcp" };
    default:
      return null;
  }
}

export interface AppProps {
  onSubmit: (text: string) => void;
  onStop?: () => void;
  onNew?: () => void;
  onResume?: (sessionId: string) => void;
  onIconChange?: (icon: string) => void;
  onModeChange?: (mode: AgentMode) => void;
  onCompact?: () => Promise<{ before: number; after: number }>;
  initialConversation?: ConversationEntry[];
  initialSessionName?: string;
  initialMode?: AgentMode;
  model?: string;
  icon?: string;
}

export function App({
  onSubmit,
  onNew,
  onResume,
  onIconChange,
  onModeChange,
  onCompact,
  initialConversation,
  initialSessionName,
  initialMode,
  model,
  icon,
}: AppProps) {
  const [conversation, setConversation] = useState<ConversationEntry[]>(
    initialConversation ?? [],
  );
  const [inputFocused, setInputFocused] = useState(true);
  const [running, setRunning] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  const [thinkingMode, setThinkingMode] = useState<"show" | "hide">("hide");
  const [showToolDetails, setShowToolDetails] = useState(true);
  const [mode, setMode] = useState<AgentMode>(initialMode ?? "build");

  const slashCommands: CommandPaletteItem[] = [
    { id: "new", label: "new", description: "开启新对话" },
    { id: "clear", label: "clear", description: "清空对话" },
    { id: "resume", label: "resume", description: "加载历史对话" },
    { id: "skill", label: "skill", description: "查看可用技能" },
    {
      id: "icon",
      label: "icon",
      description: `切换侧栏图标 (当前: ${icon || "crab"})`,
    },
    {
      id: "thinking",
      label: "thinking",
      description:
        thinkingMode === "hide" ? "开启思考过程显示" : "折叠思考过程",
    },
    {
      id: "tool",
      label: "tool",
      description: showToolDetails ? "隐藏工具调用" : "显示工具调用",
    },
    {
      id: "plan",
      label: "plan",
      description: mode === "plan" ? "已在计划模式" : "切换到计划模式 (只读)",
    },
    {
      id: "build",
      label: "build",
      description:
        mode === "build" ? "已在构建模式" : "切换到构建模式 (完整权限)",
    },
    { id: "compact", label: "compact", description: "压缩上下文" },
    { id: "mcp", label: "mcp", description: "管理 MCP 服务器" },
  ].sort((a, b) => a.id.localeCompare(b.id));

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
                        s.description
                          ?.toLowerCase()
                          .includes(query.toLowerCase()),
                    )
                  : allSkills;
                setPicker((prev) =>
                  prev ? { ...prev, items: filtered } : null,
                );
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
              onCancel: () => setPicker(null),
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
                thinkingMode === "hide" ? "思考过程已显示" : "思考过程已隐藏",
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
              lines: [showToolDetails ? "工具调用已隐藏" : "工具调用已显示"],
            },
          ]);
          setInputKey((k) => k + 1);
          return;
        case "cmd:icon": {
          const allIcons = ICON_NAMES.map((name) => ({
            id: name,
            label: name,
            description: ICONS[name]?.description || "",
          }));
          setPicker({
            items: allIcons,
            searchable: true,
            onSearch: (query) => {
              const filtered = query
                ? allIcons.filter(
                    (f) =>
                      f.label.toLowerCase().includes(query.toLowerCase()) ||
                      f.description.toLowerCase().includes(query.toLowerCase()),
                  )
                : allIcons;
              setPicker((prev) => (prev ? { ...prev, items: filtered } : null));
            },
            onSelect: (id) => {
              setPicker(null);
              onIconChange?.(id);
              setInputKey((k) => k + 1);
            },
            onCancel: () => setPicker(null),
          });
          return;
        }
        case "cmd:plan":
          if (mode !== "plan") {
            setMode("plan");
            onModeChange?.("plan");
          }
          setInputKey((k) => k + 1);
          return;
        case "cmd:build":
          if (mode !== "build") {
            setMode("build");
            onModeChange?.("build");
          }
          setInputKey((k) => k + 1);
          return;
        case "cmd:compact": {
          setConversation((prev) => [
            ...prev,
            {
              type: "assistant_message",
              id: crypto.randomUUID(),
              lines: ["[Compact] 正在压缩上下文..."],
            },
          ]);
          setRunning(true);
          onCompact?.()
            .then(({ before, after }) => {
              setConversation((prev) => [
                ...prev,
                {
                  type: "assistant_message",
                  id: crypto.randomUUID(),
                  lines: [
                    `[Compact] ${before.toLocaleString()} → ${after.toLocaleString()} tokens`,
                  ],
                },
              ]);
            })
            .catch((err) => {
              setConversation((prev) => [
                ...prev,
                {
                  type: "assistant_message",
                  id: crypto.randomUUID(),
                  lines: [`[Compact] 压缩失败: ${err.message}`],
                },
              ]);
            })
            .finally(() => {
              setRunning(false);
            });
          return;
        }
        case "cmd:mcp": {
          const servers = mcpManager.getStatus();
          if (servers.length === 0) {
            setConversation((prev) => [
              ...prev,
              {
                type: "assistant_message",
                id: crypto.randomUUID(),
                lines: [
                  "没有找到 MCP 服务器配置",
                  "请在 ~/.asukacode/mcp.json 中添加配置",
                  "",
                  '示例: { "servers": { "filesystem": { "command": ["npx", "-y", "@modelcontextprotocol/server-filesystem"] } } }',
                ],
              },
            ]);
            setInputKey((k) => k + 1);
          } else {
            const items = servers.map((s) => ({
              id: s.name,
              label: s.name,
              description: s.connected
                ? `已连接 (${s.tools.length} 个工具)`
                : s.error
                  ? `错误: ${s.error}`
                  : "未连接",
            }));
            setPicker({
              items,
              searchable: true,
              onSearch: (query) => {
                const filtered = query
                  ? items.filter(
                      (i) =>
                        i.label
                          .toLowerCase()
                          .includes(query.toLowerCase()) ||
                        i.description
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                    )
                  : items;
                setPicker((prev) =>
                  prev ? { ...prev, items: filtered } : null,
                );
              },
              onSelect: (id) => {
                setPicker(null);
                setTimeout(() => {
                  const server = servers.find((s) => s.name === id);
                  if (!server) return;

                  const actions = [
                    ...(server.connected
                      ? [
                          {
                            id: "disconnect",
                            label: "断开",
                            description: "断开 MCP 服务器",
                          },
                        ]
                      : [
                          {
                            id: "connect",
                            label: "连接",
                            description: "连接到 MCP 服务器",
                          },
                        ]),
                    {
                      id: "tools",
                      label: "工具列表",
                      description: "查看提供的工具",
                    },
                    {
                      id: "reload",
                      label: "重新加载",
                      description: "重新加载配置文件",
                    },
                  ];

                  setPicker({
                    items: actions,
                    onSelect: async (action) => {
                      setPicker(null);
                      setConversation((prev) => [
                        ...prev,
                        {
                          type: "user_message",
                          id: crypto.randomUUID(),
                          content: `/mcp ${id} ${action}`,
                        },
                      ]);

                      try {
                        switch (action) {
                          case "connect":
                            await mcpManager.connect(id, server.config);
                            const afterConnect = mcpManager.getServer(id);
                            setConversation((prev) => [
                              ...prev,
                              {
                                type: "assistant_message",
                                id: crypto.randomUUID(),
                                lines: [
                                  `[MCP] ${id}: ${afterConnect?.connected ? `已连接 (${afterConnect.tools.length} 个工具)` : `连接失败: ${afterConnect?.error}`}`,
                                ],
                              },
                            ]);
                            break;
                          case "disconnect":
                            await mcpManager.disconnect(id);
                            setConversation((prev) => [
                              ...prev,
                              {
                                type: "assistant_message",
                                id: crypto.randomUUID(),
                                lines: [`[MCP] ${id}: 已断开`],
                              },
                            ]);
                            break;
                          case "tools":
                            const tools = mcpManager.getServer(id)?.tools || [];
                            setConversation((prev) => [
                              ...prev,
                              {
                                type: "assistant_message",
                                id: crypto.randomUUID(),
                                lines:
                                  tools.length > 0
                                    ? [
                                        `[MCP] ${id} 工具列表：`,
                                        ...tools.map(
                                          (t) =>
                                            `  - ${t.name}: ${t.description || ""}`,
                                        ),
                                      ]
                                    : [`[MCP] ${id}: 未连接或无工具`],
                              },
                            ]);
                            break;
                          case "reload":
                            await reloadMCP();
                            setConversation((prev) => [
                              ...prev,
                              {
                                type: "assistant_message",
                                id: crypto.randomUUID(),
                                lines: ["[MCP] 配置已重新加载"],
                              },
                            ]);
                            break;
                        }
                      } catch (err) {
                        setConversation((prev) => [
                          ...prev,
                          {
                            type: "assistant_message",
                            id: crypto.randomUUID(),
                            lines: [
                              `[MCP] 操作失败: ${err instanceof Error ? err.message : String(err)}`,
                            ],
                          },
                        ]);
                      }
                      setInputKey((k) => k + 1);
                    },
                    onCancel: () => setPicker(null),
                  });
                }, 0);
              },
              onCancel: () => setPicker(null),
            });
          }
          return;
        }
        case "mode_changed":
          setMode(ev.mode);
          break;
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
                        s.description
                          ?.toLowerCase()
                          .includes(query.toLowerCase()),
                    )
                  : allSessions;
                setPicker((prev) =>
                  prev ? { ...prev, items: filtered } : null,
                );
              },
              onSelect: (id) => {
                onResume?.(id);
                setPicker(null);
              },
              onCancel: () => setPicker(null),
            });
          }
          return;

        case "assistant_delta":
          setConversation((prev) => {
            const last = prev[prev.length - 1];
            if (last?.type === "assistant_message") {
              const newLines = [...last.lines];
              const lastLine = newLines.pop() || "";
              newLines.push(lastLine + ev.content);
              return [...prev.slice(0, -1), { ...last, lines: newLines }];
            }
            return [
              ...prev,
              {
                type: "assistant_message",
                id: crypto.randomUUID(),
                lines: [ev.content],
              },
            ];
          });
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
                  status: (ev.denied ? "denied" : "completed") as
                    | "denied"
                    | "completed",
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
          const { question, options, resolve, allowCustom } = ev.payload;
          const hasCustom = allowCustom ?? false;
          setPicker({
            question: question,
            items: options.map((o, i) => ({
              id: String(i),
              label: o.label,
              description: o.description,
            })),
            showInput: hasCustom,
            onSelect: (id) => {
              setPicker(null);
              resolve(options[Number(id)]?.label ?? id);
            },
            onCancel: () => {
              setPicker(null);
              resolve("(user cancelled)");
            },
            onInputSubmit: hasCustom
              ? (value: string) => {
                  setPicker(null);
                  resolve(value);
                }
              : undefined,
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
    question?: string;
    items: PickerItem[];
    onSelect: (id: string) => void;
    onCancel?: () => void;
    searchable?: boolean;
    onSearch?: (query: string) => void;
    showInput?: boolean;
    onInputSubmit?: (value: string) => void;
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
            <box flexDirection="column" paddingTop={2} marginBottom={1}>
              <ascii-font
                text="ASUKACODE"
                font="block"
                color={theme.color.pinkBright}
              />
              <text fg={theme.color.textMuted} marginTop={1}>
                Terminal AI Coding Assistant
              </text>
            </box>
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
                return <ToolCallMessage key={entry.id} entry={entry} />;
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
              question={picker.question}
              items={picker.items}
              onSelect={(id) => {
                picker.onSelect(id);
                setInputKey((k) => k + 1);
              }}
              onCancel={() => {
                picker.onCancel?.();
                setInputKey((k) => k + 1);
              }}
              searchable={picker.searchable}
              onSearch={picker.onSearch}
              showInput={picker.showInput}
              onInputSubmit={picker.onInputSubmit}
            />
          )}

          <InputBar
            key={inputKey}
            onSubmit={handleSubmit}
            onModeToggle={() => {
              const newMode = mode === "build" ? "plan" : "build";
              setMode(newMode);
              onModeChange?.(newMode);
            }}
            busy={running || !!picker}
            focused={inputFocused && !permission && !picker}
            mode={mode}
            running={running}
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
            icon={icon}
            flexShrink={1}
          />
        )}
      </box>
    </box>
  );
}
