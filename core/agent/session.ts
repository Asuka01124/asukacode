import OpenAI from "openai";
import { getDB, insertMessage, getMessages, getMaxSeq } from "../database/database.js";
import { runLoop } from "./loop.js";
import { initSystemContext, SystemContextSession } from "../systemContext/syscontext.js";
import { pipe } from "./events.js";
import type { Config } from "../config/manager.js";
import { setSubagentConfig } from "../tools/task.js";

let initialized = false;

export class AgentSession {
  readonly sessionId: string;
  private client: OpenAI;
  private model: string;
  private db: ReturnType<typeof getDB>;
  private abortController: AbortController | null = null;
  private ctx = new SystemContextSession();
  private systemPrompt = "";

  constructor(config: Config, resumeSessionId?: string) {
    this.sessionId = resumeSessionId ?? `session_${Date.now()}`;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
    this.model = config.model;
    this.db = getDB();
    setSubagentConfig(this.client, this.model);
  }

  async ask(text: string) {
    if (!initialized) {
      initSystemContext();
      initialized = true;
    }
    if (!this.systemPrompt) {
      this.ctx.reset();
      this.systemPrompt = await this.ctx.getFullBaseline();
    }

    insertMessage(
      this.db,
      this.sessionId,
      getMaxSeq(this.db, this.sessionId) + 1,
      "user",
      text,
    );

    pipe.run({ type: 'state_changed', sessionId: this.sessionId, state: "running" });

    try {
      await runLoop(this.sessionId, this.client, this.model, this.systemPrompt, this.ctx);
    } catch (err) {
      pipe.run({ type: 'error', sessionId: this.sessionId, error: String(err) });
    }

    pipe.run({ type: 'state_changed', sessionId: this.sessionId, state: "idle" });
    pipe.run({ type: 'finished', sessionId: this.sessionId });
  }

  stop() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    pipe.run({ type: 'state_changed', sessionId: this.sessionId, state: "idle" });
  }

  getMessages() {
    return getMessages(this.db, this.sessionId);
  }
}
