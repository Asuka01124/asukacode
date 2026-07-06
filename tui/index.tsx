import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { App } from "./components/App"

const renderer = await createCliRenderer({
  exitOnCtrlC: false,
})

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

process.on('exit', resetTerminal)
process.on('uncaughtException', (_err) => {
  resetTerminal()
  process.exit(1)
})

resetTerminal()
createRoot(renderer).render(
  <App
    onSubmit={() => {}}
    onStop={() => {}}
  />
)