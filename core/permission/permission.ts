import path from "node:path";
import { pipe, PermissionPayload } from "../agent/events.js";

const WORKDIR = process.cwd()

const DENY_LIST = [
  "rm -rf /", "sudo", "shutdown", "reboot", "mkfs",
  "dd if=", "> /dev/sda",
]
const DESTRUCTIVE = [
  "rm ", "del ", "erase ", "rd ", "rmdir ",
  "> /etc/", "chmod 777"
]

export async function checkToolPermission(
  block: { name: string; input: Record<string, unknown> },
): Promise<string | null> {
  const cmd: string = String(block.input.command ?? "")
  const filePath: string = String(block.input.path ?? "")

  if (block.name === "bash") {
    for (const pattern of DENY_LIST) {
      if (cmd.includes(pattern)) {
        return "Permission denied by deny list"
      }
    }
    for (const kw of DESTRUCTIVE) {
      if (cmd.includes(kw)) {
        const result = await askUser(block.name, block.input, "Potentially destructive command")
        if (result === "deny") return "Permission denied by user"
        break
      }
    }
  }

  if (block.name === "write_file" || block.name === "edit_file") {
    const resolved = path.resolve(WORKDIR, filePath)
    if (!resolved.startsWith(WORKDIR)) {
      const result = await askUser(block.name, block.input, "Writing outside workspace")
      if (result === "deny") return "Permission denied by user"
    }
  }

  return null
}

function askUser(
  toolName: string,
  args: Record<string, unknown>,
  reason: string,
): Promise<"allow" | "deny"> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve("deny")
    }, 100_000)

    const payload: PermissionPayload = {
      toolName,
      args,
      reason,
      approve: () => { clearTimeout(timer); resolve("allow") },
      deny: () => { clearTimeout(timer); resolve("deny") },
    }
    pipe.run({ type: 'permission', payload })
  })
}
