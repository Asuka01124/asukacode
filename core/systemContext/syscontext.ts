import { loadAll } from "./registry.js"
import { registerBuiltins } from "./builtins.js"
import { registerInstructions } from "./instructions.js"
import { registerSkillGuidance } from "./skills.js"
import { registerMemoryGuidance } from "./memory.js"

export { register, unregister, loadAll, listKeys, clear } from "./registry.js"
export { registerBuiltins } from "./builtins.js"
export { registerInstructions } from "./instructions.js"
export { registerSkillGuidance } from "./skills.js"
export { registerMemoryGuidance } from "./memory.js"

export type ContextKey = string

export const UNAVAILABLE = Symbol("Unavailable")
export type Unavailable = typeof UNAVAILABLE

export interface ContextSource<A> {
  readonly key: ContextKey
  readonly load: () => Promise<A | Unavailable>
  readonly baseline: (current: A) => string
  readonly update: (previous: A, current: A) => string
  readonly removed?: (previous: A) => string
}

export interface SourceSnapshot {
  value: unknown
  removed?: string
}

export type ContextSnapshot = Record<ContextKey, SourceSnapshot>

export interface Generation {
  readonly baseline: string
  readonly snapshot: ContextSnapshot
}

export interface Updated {
  readonly _tag: "Updated"
  readonly text: string
  readonly snapshot: ContextSnapshot
}

export interface ReplacementReady {
  readonly _tag: "ReplacementReady"
  readonly generation: Generation
}

export interface ReplacementBlocked {
  readonly _tag: "ReplacementBlocked"
}

export type ReplacementResult = ReplacementReady | ReplacementBlocked

export type ReconcileResult = { _tag: "Unchanged" } | Updated | ReplacementResult

export function initSystemContext(): void {
  registerBuiltins()
  registerInstructions()
  registerSkillGuidance()
  registerMemoryGuidance()
}

export class SystemContextSession {
  private lastSnapshot: ContextSnapshot | null = null

  async getPrompt(): Promise<string | null> {
    const context = await loadAll()

    if (!this.lastSnapshot) {
      const generation = await initialize(context)
      this.lastSnapshot = generation.snapshot
      return generation.baseline
    }

    const result = await reconcile(context, this.lastSnapshot)

    if (result._tag === "Unchanged") return null

    if (result._tag === "Updated") {
      this.lastSnapshot = result.snapshot
      return result.text
    }

    if (result._tag === "ReplacementReady") {
      this.lastSnapshot = result.generation.snapshot
      return result.generation.baseline
    }

    return null
  }

  reset(): void {
    this.lastSnapshot = null
  }

  async getFullBaseline(): Promise<string> {
    const context = await loadAll()
    const generation = await initialize(context)
    this.lastSnapshot = generation.snapshot
    return generation.baseline
  }
}

interface PackedSource {
  readonly key: ContextKey
  readonly load: () => Promise<Loaded | Unavailable>
}

interface Loaded {
  readonly baseline: () => Rendered
  readonly compare: (previous: unknown) => Compared
}

interface Rendered {
  readonly text: string
  readonly snapshot: SourceSnapshot
}

type Compared =
  | { _tag: "Incompatible" }
  | { _tag: "Unchanged" }
  | { _tag: "Updated"; render: () => Rendered }

type Entry =
  | { _tag: "Available"; key: ContextKey } & Loaded
  | { _tag: "Unavailable"; key: ContextKey }

function isUnavailable(value: unknown): value is Unavailable {
  return value === UNAVAILABLE
}

function requireText(key: ContextKey, kind: string, text: string): string {
  if (text.length === 0) {
    throw new Error(`SystemContext source ${key} rendered an empty ${kind}`)
  }
  return text
}

function render(parts: string[]): string {
  return parts.join("\n\n")
}

function getSnapshot(snapshot: ContextSnapshot, key: ContextKey): SourceSnapshot | undefined {
  return Object.hasOwn(snapshot, key) ? snapshot[key] : undefined
}

function assertUniqueKeys(keys: ContextKey[]): void {
  const seen = new Set<ContextKey>()
  for (const key of keys) {
    if (seen.has(key)) {
      throw new Error(`Duplicate SystemContext key: ${key}`)
    }
    seen.add(key)
  }
}

export const EMPTY_CONTEXT: SystemContext = { sources: [] }

export function make<A>(source: ContextSource<A>): SystemContext {
  return {
    sources: [
      {
        key: source.key,
        load: async () => {
          const value = await source.load()
          if (isUnavailable(value)) return value

          const snapshot = (): SourceSnapshot => ({
            value,
            ...(source.removed ? { removed: requireText(source.key, "removal", source.removed(value)) } : {}),
          })

          return {
            baseline: (): Rendered => ({
              text: requireText(source.key, "baseline", source.baseline(value)),
              snapshot: snapshot(),
            }),
            compare: (previous): Compared => {
              const prevJson = JSON.stringify(previous)
              const currJson = JSON.stringify(value)

              if (prevJson === currJson) {
                return { _tag: "Unchanged" }
              }

              return {
                _tag: "Updated",
                render: () => ({
                  text: requireText(source.key, "update", source.update(previous as A, value)),
                  snapshot: snapshot(),
                }),
              }
            },
          }
        },
      },
    ],
  }
}

export function combine(contexts: SystemContext[]): SystemContext {
  const sources = contexts.flatMap((ctx) => ctx.sources)
  assertUniqueKeys(sources.map((s) => s.key))
  return { sources }
}

export async function initialize(ctx: SystemContext): Promise<Generation> {
  const entries = await observe(ctx)

  const unavailable = entries.filter((e) => e._tag === "Unavailable")
  if (unavailable.length > 0) {
    throw new Error(`Cannot initialize: sources unavailable: ${unavailable.map((e) => e.key).join(", ")}`)
  }

  return initializeObservation(entries as (Entry & { _tag: "Available" })[])
}

export async function reconcile(ctx: SystemContext, previous: ContextSnapshot): Promise<ReconcileResult> {
  const entries = await observe(ctx)

  const replaceResult = replaceObservation(entries, previous)
  if (replaceResult._tag === "ReplacementReady") {
    return replaceResult
  }

  const snapshot: Record<ContextKey, SourceSnapshot> = {}
  const updates: string[] = []

  for (const entry of entries) {
    const stored = getSnapshot(previous, entry.key)

    if (entry._tag === "Unavailable") {
      if (stored) snapshot[entry.key] = stored
      continue
    }

    if (!stored) {
      const rendered = entry.baseline()
      updates.push(rendered.text)
      snapshot[entry.key] = rendered.snapshot
      continue
    }

    const compared = entry.compare(stored.value)

    if (compared._tag === "Incompatible") {
      return replaceObservation(entries, previous)
    }

    if (compared._tag === "Unchanged") {
      snapshot[entry.key] = stored
      continue
    }

    const rendered = compared.render()
    updates.push(rendered.text)
    snapshot[entry.key] = rendered.snapshot
  }

  const currentKeys = new Set(entries.map((e) => e.key))
  for (const key of Object.keys(previous).sort()) {
    if (currentKeys.has(key)) continue
    const removed = previous[key].removed
    if (removed === undefined) {
      return replaceObservation(entries, previous)
    }
    updates.push(removed)
  }

  if (updates.length === 0) {
    return { _tag: "Unchanged" }
  }

  return { _tag: "Updated", text: render(updates), snapshot }
}

export async function replace(ctx: SystemContext, previous: ContextSnapshot): Promise<ReplacementResult> {
  const entries = await observe(ctx)
  return replaceObservation(entries, previous)
}

export interface SystemContext {
  readonly sources: PackedSource[]
}

async function observe(ctx: SystemContext): Promise<Entry[]> {
  const results = await Promise.all(
    ctx.sources.map(async (source): Promise<Entry> => {
      const result = await source.load()
      if (isUnavailable(result)) {
        return { _tag: "Unavailable", key: source.key }
      }
      return { _tag: "Available", key: source.key, ...result }
    })
  )
  return results
}

function initializeObservation(entries: (Entry & { _tag: "Available" })[]): Generation {
  const rendered = entries.map((entry) => [entry.key, entry.baseline()] as const)
  return {
    baseline: render(rendered.map(([, r]) => r.text)),
    snapshot: Object.fromEntries(rendered.map(([key, r]) => [key, r.snapshot])),
  }
}

function replaceObservation(entries: Entry[], previous: ContextSnapshot): ReplacementResult {
  for (const entry of entries) {
    if (entry._tag === "Unavailable" && getSnapshot(previous, entry.key) !== undefined) {
      return { _tag: "ReplacementBlocked" }
    }
  }
  return { _tag: "ReplacementReady", generation: initializeObservation(entries as any[]) }
}
