# 使用指南

## 首次配置

首次运行 `asukacode` 自动进入终端配置向导：

```
Welcome to Asuka Code!
Let's set up your configuration.

? API Key: sk-xxx
? Model: deepseek-v4-flash
? Base URL: https://api.deepseek.com
✓ Configuration saved
```

配置保存在 `~/.asukacode/config.json`。后续启动直接进入 TUI。

## 终端界面

```
┌─ AsukaCode ──────────────────────────────────────────┐
│  [Sidebar]                                          │
│                                                     │
│  > Write a script to sort CSV files                 │
│                                                     │
│  AI: I'll create a script using...                  │
│      tool: read_file(path="data.csv")               │
│      tool: write_file(path="sort.py", content=...)  │
│                                                     │
│  > submit                                           │
└─────────────────────────────────────────────────────┘
```

## 内置工具

| 工具 | 用途 | 示例 |
|------|------|------|
| `bash` | 执行 shell 命令 | `bash(command="ls -la")` |
| `read_file` | 读取文件 | `read_file(path="src/main.ts")` |
| `write_file` | 写入文件 | `write_file(path="new.ts", content="...")` |
| `edit_file` | 精确文本替换 | `edit_file(path="a.ts", old="foo", new="bar")` |
| `glob` | 文件模式匹配 | `glob(pattern="**/*.ts")` |
| `grep` | 正则内容搜索 | `grep(pattern="TODO", path="src/")` |
| `webfetch` | HTTP 内容获取 | `webfetch(url="https://...")` |
| `question` | 用户交互提问 | `question(questions=[...])` |
| `task` | 子代理 | `task(description="Refactor auth module")` |
| `todowrite` | 任务管理 | `todowrite(tasks=[...])` |
| `load_skill` | 加载技能 | `load_skill(name="docx")` |
| `compact` | 手动压缩上下文 | `compact()` |

## 技能系统

技能文件为 `SKILL.md`，存放位置（按优先级）：

1. `.asukacode/skills/<name>/SKILL.md` — 项目级
2. `~/.asukacode/skills/<name>/SKILL.md` — 用户级

模型可调用 `load_skill` 工具按需加载。同名技能按优先级解决冲突。

## 上下文压缩

| 级别 | 利用率 | 机制 |
|------|--------|------|
| L2 Micro | ≥ 50% | 旧工具结果替换为占位符 |
| L1 Snip | ≥ 70% | 截断中间安全段 |
| L3 Budget | ≥ 75% | 超大输出落盘替换 |
| L4 Auto | ≥ 85% | LLM 摘要整个会话 |

无需手动干预，每轮自动判断。

## 权限控制

| 层级 | 触发 | 效果 |
|------|------|------|
| Gate 1 | 命令含 `rm -rf /`、`sudo`、`mkfs` 等 | 硬拒绝 |
| Gate 2 | 命令含 `rm `、`chmod 777` 等破坏性操作 | TUI 确认弹窗 |
| Gate 3 | 文件写入/编辑超出当前目录 | TUI 确认弹窗 |

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+C` | 停止当前任务 |
| `/new` | 新建会话 |
| `/compact` | 手动压缩上下文 |
| `/help` | 查看帮助 |
| `/resume` | 加载历史会话 |
| `Esc` | 取消当前输入 |

## 长期记忆

记忆自动从对话中提取/合并，存放在 `~/.asukacode/projects/<slug>/memory/`。

- **提取** — 每轮结束后 LLM 从对话中提取新记忆
- **合并** — 超阈值时 LLM 去重合并
- **注入** — 每轮开始时选择相关记忆注入上下文
