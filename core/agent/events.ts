export type AgentMode = 'build' | 'plan'

export type AppEvent =

  | { type: 'cmd:new' }
  | { type: 'cmd:clear' }
  | { type: 'cmd:resume'; sessionId?: string }
  | { type: 'cmd:skill' }
  | { type: 'cmd:thinking' }
  | { type: 'cmd:tool' }
  | { type: 'cmd:icon' }
  | { type: 'cmd:plan' }
  | { type: 'cmd:build' }
  | { type: 'cmd:compact' }
  
  | { type: 'task_list'; tasks: Array<{ id: string; text: string; done: boolean }> }

  | { type: 'assistant_delta'; sessionId: string; content: string }
  | { type: 'thinking_start'; sessionId: string }
  | { type: 'thinking_delta'; sessionId: string; content: string }
  | { type: 'thinking_end'; sessionId: string }
  | { type: 'tool_start'; sessionId: string; name: string; input: unknown }
  | { type: 'tool_end'; sessionId: string; name: string; output: string; denied?: boolean }
  | { type: 'finished'; sessionId: string }
  | { type: 'state_changed'; sessionId: string; state: 'running' | 'idle' }
  | { type: 'mode_changed'; mode: AgentMode }
  | { type: 'error'; sessionId: string; error: string }
  | { type: 'context_stats'; totalTokens: number; contextWindow: number; utilization: number }
  | { type: 'question'; payload: QuestionPayload }
  | { type: 'permission'; payload: PermissionPayload }

export interface QuestionPayload {
  question: string
  header: string
  options: { label: string; description: string }[]
  multiple: boolean
  allowCustom?: boolean
  resolve: (answer: string) => void
}

export interface PermissionPayload {
  toolName: string
  args: Record<string, unknown>
  reason: string
  approve: () => void
  deny: () => void
}

type Next = () => Promise<void>
type Middleware<T> = (ev: T, next: Next) => Promise<void> | void

class Pipeline<T> {
  private middlewares: Middleware<T>[] = []

  
  use(mw: Middleware<T>): () => void {
    this.middlewares.push(mw)
    return () => {
      const idx = this.middlewares.indexOf(mw)
      if (idx >= 0) this.middlewares[idx] = undefined as any
    }
  }

  
  async run(ev: T): Promise<void> {
    let i = 0
    const mws = this.middlewares
    const dispatch = async (): Promise<void> => {
      while (i < mws.length) {
        const mw = mws[i++]
        if (mw) await mw(ev, dispatch)
      }
    }
    await dispatch()
  }
}

export const pipe = new Pipeline<AppEvent>()
