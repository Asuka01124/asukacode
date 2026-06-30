<p align="center">
  <img src="./docs/logo.png" alt="AsukaCode Logo" width="200" />
</p>

<h2 align="center">AsukaCode</h2>

<p align="center">
  <img src="https://img.shields.io/badge/Runtime-Bun-FBF0DF?style=for-the-badge&logo=bun" alt="Runtime: Bun" />
  <img src="https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/UI-OpenTUI-7C3AED?style=for-the-badge" alt="UI: OpenTUI" />
  <img src="https://img.shields.io/badge/Models-26-10B981?style=for-the-badge" alt="26 Models" />
  <img src="https://img.shields.io/badge/Build-Single_Binary-FF6B35?style=for-the-badge" alt="Single Binary" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="MIT License" />
</p>

---

<p align="center">
  一个轻量、高效的终端 AI 编码助手。为速度而生，为简洁而建。
</p>

[English](./docs/README.md) | [使用指南](./docs/guide.md) | [开发指南](./docs/dev.md) | [License](./LICENSE)

AsukaCode 是一个面向本地开发工作流的终端编码助手，基于 Bun + TypeScript + OpenTUI 构建。兼容 OpenAI 兼容 API，支持 DeepSeek / Claude / GPT-5 / Qwen / GLM 等 26 个主流模型。

它用更小的实现体量，提供类 Claude Code 的工作流体验和架构思路，因此很适合学习、实验，以及继续做自己的定制化开发。

## 项目简介

AsukaCode 围绕一个 terminal-first agent loop 构建：

- 接收用户请求
- 加载项目上下文与长期记忆
- 调用工具（bash / 文件操作 / 搜索 / 网络 / 任务管理）
- 权限检查后再执行危险操作
- 上下文超限时自动压缩
- 在同一个终端会话里返回最终结果

整个项目有意保持结构清晰：`core/` 放引擎，`tui/` 放界面，发布时编译为单文件二进制。

## 为什么选择 AsukaCode

AsukaCode 适合你，如果你想要：

- 一个轻量级终端编码助手，而不是庞大的平台
- 一个带全屏 TUI、tool calling、transcript 的交互式工作流
- 一个架构清晰、模块分明的小代码库
- 一个可用于学习 agent 架构的参考实现
- 一个开箱即用的单文件二进制工具

## 核心能力

- 单轮多步工具执行，形成 `model → tool → model` 闭环
- 全屏终端 UI（OpenTUI React），支持输入历史、transcript 滚动、slash 命令
- 14 个内置工具：bash / 文件读写 / 精确编辑 / glob / grep / webfetch / 任务管理 / 技能加载 / 用户提问
- 上下文利用率自动压缩：50% Micro → 70% Snip → 75% Budget → 85% Auto（LLM 摘要）
- Token 发票优先使用 API 返回的实际 usage，精准计算利用率
- 三级权限拦截：denylist 硬拒绝 / 破坏性操作弹窗 / 越界写入弹窗
- 长期记忆：自动从对话提取，超阈值时合并去重，每轮注入相关记忆
- 技能系统：通过 `SKILL.md` 按需加载专业知识
- System Prompt 代数式增量更新：比较快照，仅发送变化部分
- 26 个主流模型开箱配置，模型选择框防止输错
- 编译为单文件二进制（Bun build --compile），无需 Node.js 运行

## 安装

GitHub Releases 提供 Windows x64 预编译二进制。其他平台可自行构建。

### Windows x64

```powershell
irm https://raw.githubusercontent.com/Asuka01124/asukacode/main/scripts/install.ps1 | iex
```

### Linux x64

```bash
curl -fsSL https://raw.githubusercontent.com/Asuka01124/asukacode/main/scripts/install.sh | bash
```

### 其他平台（macOS ARM、Linux ARM、Windows ARM 等）

暂无预编译二进制，可 clone 仓库后自行构建：

```bash
git clone https://github.com/Asuka01124/asukacode
cd asukacode
bun install
bun run compile      # 当前平台
```

构建完成后运行安装脚本或手动加入 PATH，之后任意目录执行 `asukacode` 即可。

## 快速开始

```bash
asukacode
```

首次运行自动进入终端配置向导：

- 输入 API Key
- 从 26 个模型中选择（编号选择，不会输错）
- 输入 Base URL（OpenAI 兼容格式）

配置保存在 `~/.asukacode/config.json`。第二次启动直接进入 TUI。

### 本地开发

```bash
git clone https://github.com/Asuka01124/asukacode
cd asukacode
bun install
bun run ./tui/src/entry.tsx
```

## 常用入口

- `/new` — 新建会话
- `/resume` — 加载历史会话（弹窗选择）
- `/clear` — 清空当前对话
- `/skill` — 查看可用技能
- `/help` — 查看帮助
- `Ctrl+C 双击` — 退出应用

### 已知限制

- **子代理（task）工具已禁用**：`core/tools/task.ts` 中关于多 agent 协作的功能尚未完成改造，临时从工具列表中移除。任务管理（`task_system.ts`）不受影响，LLM 可通过 `todowrite` 等工具创建任务并显示在右侧栏。

## 文档导航

- [使用指南](./docs/guide.md) — 配置 / 工具 / 技能 / 权限 / 快捷键
- [开发指南](./docs/dev.md) — 架构 / 主循环 / 构建 / 发布

## 项目结构

```
asukacode/
├── core/             # 核心引擎
│   ├── agent/        # 会话 + 主循环 + 事件总线
│   ├── compact/      # 四级上下文压缩
│   ├── config/       # 配置管理 + 安装向导
│   ├── database/     # SQLite 消息持久化
│   ├── memory/       # 长期记忆管理
│   ├── permission/   # 三级权限控制
│   ├── recovery/     # API 错误恢复
│   ├── skills/       # 技能系统
│   ├── systemContext/# System Prompt 增量引擎
│   ├── tools/        # 14 个内置工具
│   └── utils/        # token 估算 / 模型窗口
├── scripts/          # 安装脚本 + 图标注入
├── tui/              # 终端 UI (React / OpenTUI)
├── docs/             # 文档
├── bunfig.toml       # JSX 编译配置
└── package.json
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 语言 | TypeScript 6.0 |
| 运行时 | Bun（原生 SQLite + 二进制编译） |
| UI | @opentui/react（终端 React） |
| LLM | OpenAI SDK（兼容 26 个模型） |
| 数据校验 | Zod |
| 发布 | `bun build --compile`（单文件） |

## 构建与发布

```bash
bun run compile               # 当前平台
bun run compile:linux-x64     # Linux x64
bun run compile:darwin-arm64  # macOS ARM
```

## 开发

```bash
bun run ./tui/src/entry.tsx   # 开发模式
npx tsc --noEmit               # 类型检查
```

## 致谢

本项目借鉴了以下优秀开源项目：

- [learn-claude-code](https://github.com/shareAI-lab/learn-claude-code)
- [MiniCode](https://github.com/LiuMengxuan04/MiniCode)
- [OpenCode](https://github.com/anomalyco/opencode)
