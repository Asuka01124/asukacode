import { SystemContext, ContextKey, combine, EMPTY_CONTEXT } from "./syscontext.js"

export interface RegistryEntry {
  
  readonly key: ContextKey
  
  readonly load: () => Promise<SystemContext>
}

const entries: RegistryEntry[] = []

export function register(entry: RegistryEntry): void {

  if (entries.some((e) => e.key === entry.key)) {
    throw new Error(`Duplicate SystemContext registry key: ${entry.key}`)
  }
  entries.push(entry)
}

export function unregister(key: ContextKey): void {
  const index = entries.findIndex((e) => e.key === key)
  if (index !== -1) {
    entries.splice(index, 1)
  }
}

export async function loadAll(): Promise<SystemContext> {
  if (entries.length === 0) return EMPTY_CONTEXT

  const sorted = [...entries].sort((a, b) => a.key.localeCompare(b.key))

  const contexts = await Promise.all(sorted.map((entry) => entry.load()))

  return combine(contexts)
}

export function listKeys(): ContextKey[] {
  return entries.map((e) => e.key)
}

export function clear(): void {
  entries.length = 0
}
