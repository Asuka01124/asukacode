export type Effect = "allow" | "deny" | "ask"

export interface Rule {
  action: string
  resource: string
  effect: Effect
}

export type Ruleset = Rule[]
