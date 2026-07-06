# 开发指南

## 项目结构

```
asukacode/
├── bin/              # npm 入口脚本（平台探测 + 转发二进制）
├── core/             # 核心引擎
│   ├── agent/        # 会话生命周期 + 主循环（session / loop / events）
│   ├── compact/      # 上下文压缩管道（4 层：snip / micro / budget / auto）
│   ├── config/       # 配置管理（加载 / 保存 / 向导）
│   ├── database/     # SQLite 持久化（bun:sqlite + WAL 模式）
│   ├── memory/       # 长期记忆（选择 / 提取 / 合并）
│   ├── permission/   # 权限控制（三级拦截 + TUI 弹窗）
│   ├── recovery/     # API 错误恢复（429 退避 + 529 降级）
│   ├── skills/       # 技能系统（SKILL.md 扫描 + 注册）
│   ├── systemContext/# System Prompt 构建（代数式增量更新）
│   ├── tools/        # 工具实现（12 个内置工具 + MCP 集成）
│   └── utils/        # 工具函数（token 估算 / 模型上下文窗口）
├── tui/              # 终端 UI
│   └── src/
│       ├── entry.tsx         # TUI 启动入口
│       └── components/       # React 组件（App / InputBar / Transcript / ...）
├── docs/             # 文档
├── bunfig.toml       # Bun JSX 编译配置
└── package.json
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 语言 | TypeScript 6.0 |
| 运行时 | Bun (原生 SQLite / 编译) |
| UI | @opentui/react (终端 React) |
| LLM | OpenAI SDK (兼容 DeepSeek / Claude / GPT-5) |
| 校验 | Zod |
| 发布 | bun build --compile (单文件二进制) |

## 开发运行

```bash
# 开发模式（JIT 即时执行）
bun run ./tui/entry.tsx

# TypeScript 类型检查
npx tsc --noEmit
```

## 核心架构

### Agent 主循环

```
用户输入 → Session.ask(text)
  → toModelMessages()           # 从 DB 加载消息
  → computeContextStats()       # 计算 token 利用率
  → runCompactionPipeline()     # 按利用率触发压缩
  → LLM API call                # 发送给模型
  → capture response.usage      # 记录精确 token 消耗
  → 工具调用循环                # 权限检查 → 执行 → 存 DB
  → 记忆提取 / 合并
  → 返回结果
```

### SystemContext 代数

```
Source<A> → make()        # 创建上下文源
         → combine()      # 合并多个源
         → initialize()   # 生成 baseline + 快照
         → reconcile()    # 比较快照，仅发送增量
         → replace()      # 完全替换
```

### 压缩管道

```
runCompactionPipeline()
  ├─ if utilization < 50% → 跳过（无需压缩）
  ├─ if ≥ 50% → microCompact  (旧工具结果 → placeholder)
  ├─ if ≥ 70% → snipCompact   (中间安全段截断)
  ├─ if ≥ 75% → budget        (超大结果落盘)
  └─ if ≥ 85% → autoCompact   (LLM 摘要)
```

## 构建二进制

```bash
# 当前平台
npm run compile

# 三平台
npm run compile:all

# 编译配置: bunfig.toml
# [build]
# jsx = "react-jsx"
# jsxImportSource = "@opentui/react"
```

产物：
- `asukacode-win32-x64.exe` — Windows x64
- `asukacode-linux-x64` — Linux x64
- `asukacode-darwin-arm64` — macOS ARM

## 发布

```bash
# 1. 打版本号
npm version patch          # 1.0.0 → 1.0.1

# 2. 编译三平台二进制
npm run compile:all

# 3. 推送到 npm
npm publish --access public
```

## 测试

```bash
# 运行测试（如已配置）
bun test

# 单文件测试
bun test core/permission/permission.test.ts
```

## 添加新工具

1. 在 `core/tools/` 下创建 `my_tool.ts`
2. 导出 `definition`（OpenAI Tool definition）和 `handler`（执行函数）
3. 在 `core/tools/tools.ts` 注册到 `TOOLS` 和 `TOOL_HANDLERS`
4. 如需要权限检查，在 handler 中调用 `checkToolPermission()`

## 维护模型窗口配置

`core/utils/model-context.ts` 维护 26 个模型的上下文窗口数据。添加新模型时：

1. 在对应厂商的数组中追加条目
2. `patterns` 列出所有匹配该模型的字符串
3. `contextWindow` 和 `outputReserve` 从官方文档获取
