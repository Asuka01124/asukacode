# AsukaCode 更新路线图

> 最后更新：2026-06-29

---

## 优先级总览

| 优先级 | 模块 | 状态 | 预计耗时 |
|:---:|------|:---:|:---:|
| P0 | UI / UX 重构 | 🔴 规划中 | 大 |
| P0 | MCP 协议支持 | 🔴 规划中 | 大 |
| P1 | LLM API 统一调用层 | 🟡 调研中 | 中 |
| P2 | 记忆系统调研与增强 | 🟢 基础完善 | 小 |
| - | Multi-Agent | ⚪ 暂缓 | — |

---

## 一、UI / UX 重构（P0）

### 现状问题

- UI 框架参考 [OpenCode](https://github.com/anthropics/opencode)，当前复刻程度不够完善
- 对 OpenTUI/React 组件组合不够熟练，需要深入研究 OpenCode 的布局和交互模式
- 部分组件已存在但未接入（`StatusBar`、`CommandEcho`）
- 侧栏面板信息密度低，Token 用量展示不够直观
- 整体视觉风格和 OpenCode 原版还有差距

### 计划方向

#### 1.1 参考与学习
- [ ] 深入分析 [OpenCode](https://github.com/anthropics/opencode) 的 UI 源码：
  - 布局结构（主对话区、侧栏、底部状态栏的分割方式）
  - 消息渲染（用户消息 / assistant 消息 / 工具调用卡片 的样式）
  - 输入交互（多行输入、命令面板、自动补全）
  - Diff 展示（文件编辑的前后对比 UI）
  - 流式渲染（Delta 事件的逐字更新动画）
- [ ] 研究 [OpenTUI](https://github.com/opentui/opentui) 官方示例和最佳实践
- [ ] 可选参考其他 TUI 工具的设计亮点：
  - Aider 的 diff 确认交互
  - Lazygit 的面板切换和快捷键体系
- [ ] 整理一份 OpenCode UI 拆解笔记

#### 1.2 布局优化
- [ ] 重新设计主布局：左侧对话 + 右侧信息栏的黄金比例
- [ ] 接入 `StatusBar`：底部常驻状态栏（当前模型、session、token 用量）
- [ ] 接入 `CommandEcho`：命令回显，让用户清楚看到斜杠命令的执行反馈
- [ ] 对话区域优化：消息间距、颜色区分、代码块高亮

#### 1.3 交互体验
- [ ] `/` 命令面板：分类展示 + 快捷键提示
- [ ] 工具执行状态：实时流式展示 `tool_start` → `tool_end`
- [ ] Diff 确认：编辑操作前后对比展示（类似 Aider 的 diff view）
- [ ] Picker 弹窗美化：技能列表、会话列表、权限确认的 UI 统一
- [ ] 多行输入优化：支持 Shift+Enter 换行，粘贴大段代码不卡顿

#### 1.4 主题系统
- [ ] 亮色 / 暗色主题切换
- [ ] 用户可自定义配色（`~/.asukacode/theme.json`）
- [ ] 语法高亮配色与主题联动

---

## 二、MCP 协议支持（P0）

### 背景

[MCP (Model Context Protocol)](https://modelcontextprotocol.io) 是 Anthropic 推出的开放协议，允许 AI 助手安全地连接外部数据源和工具。支持 MCP 可以让 AsukaCode 接入丰富的第三方工具生态。

### 计划

#### 2.1 协议层
- [ ] 调研 MCP 规范（transport、tool listing、资源暴露）
- [ ] 实现 MCP Client：
  - `StdioTransport`（子进程通信）
  - `SSETransport`（HTTP SSE，可选）
- [ ] MCP Server 发现与注册：
  - 扫描 `~/.asukacode/mcp-servers/` 目录
  - 读取 `mcp.json` 配置（兼容 Claude Code 格式）

#### 2.2 工具集成
- [ ] MCP 工具 → AsukaCode `ToolDefinition` 的自动转换
- [ ] 工具权限：MCP 工具的权限检查统一走现有三级权限系统
- [ ] 工具执行：MCP 工具结果纳入压缩预算和上下文管理

#### 2.3 UI 展示
- [ ] 侧栏新增 `MCPServersPanel`：展示已连接的 MCP Server 及状态
- [ ] 工具调用日志中标记 MCP 来源（如 `[MCP:filesystem] read_file`）

#### 2.4 兼容性
- [ ] 兼容主流 MCP Server（filesystem、github、postgres、playwright 等）
- [ ] 支持 Claude Code 格式的 `mcp.json` 配置直接复用

---

## 三、LLM API 统一调用层（P1）

### 背景

当前 Agent 循环直接调用 OpenAI 兼容 API。为了支持多种模型提供商（OpenAI、Anthropic、DeepSeek、Groq、本地模型等），需要一个统一的接口抽象层。

### 计划

#### 3.1 调研
- [ ] 调研现有方案：
  - [Vercel AI SDK](https://sdk.vercel.ai/)（TypeScript 原生，支持多 Provider）
  - [LiteLLM](https://github.com/BerriAI/litellm)（Python，但可参考其接口设计）
  - [OpenRouter](https://openrouter.ai/)（统一 API 网关，直接调用）
- [ ] 评估各方案的优缺点：包大小、支持模型数量、流式支持、工具调用兼容性

#### 3.2 接口设计
- [ ] 定义 `LLMProvider` 抽象接口：
  ```typescript
  interface LLMProvider {
    chat(messages: Message[], tools: Tool[]): AsyncGenerator<DeltaEvent>
    supports(model: string): boolean
  }
  ```
- [ ] 实现各 Provider：
  - `OpenAIProvider` — OpenAI / 兼容 API（Groq、DeepSeek、vLLM）
  - `AnthropicProvider` — Anthropic Messages API
  - `OpenRouterProvider` — 可选，作为一个聚合入口

#### 3.3 配置
- [ ] `config.json` 增加 `provider` 字段：
  ```json
  {
    "provider": "openai",
    "providers": {
      "openai": { "apiKey": "...", "baseURL": "..." },
      "anthropic": { "apiKey": "...", "baseURL": "..." }
    }
  }
  ```
- [ ] `/model` 命令：运行时切换模型 / Provider

#### 3.4 与现有架构的整合
- [ ] 替换 `core/agent/loop.ts` 中的直接 API 调用为 Provider 调用
- [ ] 保持流式 Delta 事件结构不变（通过适配器转换各 Provider 的输出格式）
- [ ] Token 估算适配多模型（不同模型的 tokenizer 不同）

---

## 四、记忆系统调研与增强（P2）

### 现状

`core/memory/` 已有较完整的实现：
- `extract.ts` — 从对话中提取结构化记忆
- `consolidate.ts` — 记忆去重、合并相似条目
- `select.ts` — 基于相似度的记忆召回
- `storage.ts` — 文件系统持久化（`~/.asukacode/memory/`）

### 计划

#### 4.1 竞品调研
- [ ] 研究 OpenClaw 的记忆系统设计：
  - 记忆的存储格式和组织方式
  - 记忆召回的策略（关键词 vs 向量 vs 混合）
  - 记忆的生命周期管理（创建、更新、过期、遗忘）
- [ ] 研究其他 Agent 的记忆方案：
  - Claude Code 的 Memory 机制（`MEMORY.md` + 文件级记忆）
  - Mem0 / MemGPT / Letta 的记忆架构
  - LangChain Memory 模块的设计模式

#### 4.2 可能的增强方向
- [ ] 记忆分层：短期（会话内）→ 中期（项目级）→ 长期（用户级）
- [ ] 记忆权重衰减：旧记忆未复用则降低权重，模拟遗忘曲线
- [ ] 记忆关联图谱：用 `[[wikilink]]` 连接相关记忆（参考 Claude Code 的方式）
- [ ] 向量化召回：嵌入模型做语义相似度匹配（当前是关键词匹配）
- [ ] 记忆导出/导入：跨设备同步记忆

---

## 五、暂缓：Multi-Agent

### 暂缓原因

- 多 Agent 协作的实际效果在业界仍有争议
- 单 Agent + 工具调用已覆盖大部分使用场景
- Token 消耗和延迟的性价比不高
- 优先打磨好单 Agent 体验

### 未来可能的触发条件
- 社区对 multi-agent 的反馈趋于正面
- 发现明确适用于 multi-agent 的场景（如并行代码审查 + 测试生成）
- 基础架构稳定后作为实验性功能

---

## 六、里程碑

| 版本 | 内容 | 目标 |
|------|------|------|
| v0.3 | UI/UX 第一轮重构 + StatusBar/CommandEcho 接入 | 交互体验明显提升 |
| v0.4 | MCP Client 基础实现 + 5+ 常用 Server 适配 | 工具生态扩展 |
| v0.5 | LLM Provider 抽象层 + 3 个 Provider | 多模型支持 |
| v0.6 | UI/UX 第二轮（Diff 展示、主题系统） | 接近 OpenCode 原版体验 |
| v0.7 | 记忆系统增强（向量化、关联图谱） | 智能记忆 |

---

## 附录：参考资源

- [Model Context Protocol 规范](https://modelcontextprotocol.io)
- [OpenCode](https://github.com/anthropics/opencode) — UI 设计的主要参考对象
- [OpenTUI](https://github.com/opentui/opentui) — 底层 TUI 框架
- [Vercel AI SDK](https://sdk.vercel.ai/) — LLM Provider 统一封装的参考方案
- [Claude Code Memory 设计](https://docs.anthropic.com/en/docs/claude-code/memory) — 记忆系统的参考设计
