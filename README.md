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
  A lightweight, fast terminal AI coding agent. Built for speed, designed for simplicity.
</p>

[中文文档](./README.zh-CN.md) | [Guide](./docs/guide.md) | [Development](./docs/dev.md) | [License](./LICENSE)

AsukaCode is a terminal coding agent built with Bun + TypeScript + OpenTUI. Compatible with any OpenAI-compatible API — supports DeepSeek / Claude / GPT-5 / Qwen / GLM and 20+ models.

## Install

### Windows x64

```powershell
irm https://raw.githubusercontent.com/<user>/asukacode/main/scripts/install.ps1 | iex
```

### Linux x64

```bash
curl -fsSL https://raw.githubusercontent.com/<user>/asukacode/main/scripts/install.sh | bash
```

### Other Platforms

Clone and build from source:

```bash
git clone https://github.com/<user>/asukacode
cd asukacode
bun install
bun run compile
```

## Quick Start

```bash
asukacode
```

First run launches an interactive setup wizard: API key → model selection → base URL.

Config saved to `~/.asukacode/config.json`.

## Core Capabilities

- Multi-step tool execution: `model → tool → model` loop
- Fullscreen TUI (OpenTUI React) with scrollback, slash commands, sidebar
- 14 built-in tools: bash / file I/O / search / web / tasks / skills
- 4-level context compaction: Micro → Snip → Budget → Auto
- 3-tier permission system: denylist / destructive prompt / path sandbox
- Long-term memory: auto-extract, consolidate, inject per-turn
- Skill system: load domain expertise via `SKILL.md`
- Incremental System Prompt updates: detect changes, send deltas only
- Multi-session with SQLite persistence + `/resume`
- Single-binary compile via `bun build --compile`

## Keybindings

| Command | Action |
|---------|--------|
| `/new` | New session |
| `/resume` | Load history |
| `/clear` | Clear conversation |
| `/skill` | Browse skills |
| `/help` | Show help |
| `Ctrl+C ×2` | Exit |

## Develop

```bash
bun install
bun run ./tui/src/entry.tsx
```

## Build

```bash
bun run compile               # Current platform
bun run compile:linux-x64     # Linux
bun run compile:darwin-arm64  # macOS Apple Silicon
```

## License

MIT
