import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { App } from "./components/App.js"
import { AgentSession } from "../../core/agent/session.js"
import { loadOrInitConfig } from "../../core/config/manager.js"
import { getDB } from "../../core/database/database.js"
import { getMessages } from "../../core/database/messages.js"
import type { ConversationEntry } from "./types.js"

process.stdout.write("\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1006l")

const config = await loadOrInitConfig()
if (!config) {
  console.error("Configuration is required. Exiting.")
  process.exit(1)
}

let session = new AgentSession(config)

const renderer = await createCliRenderer({ exitOnCtrlC: false })
const root = createRoot(renderer)

function resetTerminal() {
  process.stdout.write('\x1b[?1049l')
  process.stdout.write('\x1b[?25h')
  process.stdout.write('\x1b[?1000l')
  process.stdout.write('\x1b[?1006l')
  process.stdout.write('\x1b[?1003l')
  process.stdout.write('\x1b[?1002l')
  process.stdout.write('\x1b[0m')
  process.stdout.write('\x1b[2J')
}

function cleanup() {
  try { renderer.destroy() } catch {}
  resetTerminal()
  process.exit(0)
}

process.on('exit', resetTerminal)
process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
process.on('uncaughtException', (err) => {
  try { renderer.destroy() } catch {}
  resetTerminal()
  console.error('Fatal:', err.message || err)
  process.exit(1)
})
process.on('unhandledRejection', (_reason) => {
  try { renderer.destroy() } catch {}
  resetTerminal()
  process.exit(1)
})

function loadConversation(sessionId: string): { entries: ConversationEntry[]; name: string } {
  const rows = getMessages(getDB(), sessionId)
  const firstUser = rows.find(r => r.role === 'user')
  const entries = rows
    .filter(r => r.role === 'user' || r.role === 'assistant')
    .map(r => {
      if (r.role === 'user') {
        return { type: 'user_message' as const, id: String(r.id), content: r.content ?? '' }
      }
      return { type: 'assistant_message' as const, id: String(r.id), lines: [r.content ?? ''] }
    })
  return { entries, name: firstUser?.content?.slice(0, 50) ?? '' }
}

function render(initialConversation?: ConversationEntry[], sessionName?: string) {
  root.render(
    <App
      key={session.sessionId}
      initialConversation={initialConversation}
      initialSessionName={sessionName}
      model={config.model}
      onSubmit={(text) => session.ask(text)}
      onStop={() => session.stop()}
      onNew={() => {
        session = new AgentSession(config)
        render()
      }}
      onResume={(sessionId) => {
        session = new AgentSession(config, sessionId)
        const { entries, name } = loadConversation(sessionId)
        render(entries, name)
      }}
    />
  )
}

try {
  render()
} catch (err) {
  try { renderer.destroy() } catch {}
  resetTerminal()
  console.error('Startup failed:', err instanceof Error ? err.message : err)
  process.exit(1)
}
