import type { Database as DatabaseSync } from "bun:sqlite"

export interface MessageRow {
    id: number;
    session_id: string;
    seq: number;
    role: string;
    content: string | null;
    tool_call_id: string | null;
    tool_calls: string | null;
    compact_type: string | null;
    compact_path: string | null;
    compact_preview: string | null;
    compact_summary: string | null;
    usage_total_tokens: number | null;
    project_dir: string | null;
    created_at: number;
}

export type CompactType = "placeholder" | "persisted" | "snipped" | "summarized";

export function initMessagesTable(db: DatabaseSync): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id      TEXT NOT NULL,
            seq             INTEGER NOT NULL,
            role            TEXT NOT NULL,
            content         TEXT,
            tool_call_id    TEXT,
            tool_calls      TEXT,
            compact_type    TEXT,
            compact_path    TEXT,
            compact_preview TEXT,
            compact_summary TEXT,
            usage_total_tokens INTEGER,
            created_at      INTEGER DEFAULT (unixepoch())
        )
    `);
    db.exec("CREATE INDEX IF NOT EXISTS idx_session_seq ON messages(session_id, seq)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_tool_call ON messages(tool_call_id)");

    try {
        db.exec("ALTER TABLE messages ADD COLUMN usage_total_tokens INTEGER")
    } catch {
    }
    try {
        db.exec("ALTER TABLE messages ADD COLUMN project_dir TEXT")
    } catch {
    }
}

export function insertMessage(
    db: DatabaseSync,
    sessionId: string,
    seq: number,
    role: string,
    content: string | null,
    toolCallId: string | null = null,
    toolCalls: string | null = null,
    usageTotalTokens: number | null = null,
): number {
    const stmt = db.prepare(
        `INSERT INTO messages (session_id, seq, role, content, tool_call_id, tool_calls, usage_total_tokens, project_dir)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    stmt.run(sessionId, seq, role, content, toolCallId, toolCalls, usageTotalTokens, process.cwd());
    return Number(db.query("SELECT last_insert_rowid()").get());
}

export function markCompactByToolCall(
    db: DatabaseSync,
    toolCallId: string,
    type: CompactType,
    opts?: { path?: string; preview?: string; summary?: string },
): void {
    const stmt = db.prepare(
        `UPDATE messages
         SET compact_type = ?,
             compact_path = ?,
             compact_preview = ?,
             compact_summary = ?
         WHERE tool_call_id = ?`,
    );
    stmt.run(type, opts?.path ?? null, opts?.preview ?? null, opts?.summary ?? null, toolCallId);
}

export function markCompactById(
    db: DatabaseSync,
    id: number,
    type: CompactType,
    opts?: { path?: string; preview?: string; summary?: string },
): void {
    const stmt = db.prepare(
        `UPDATE messages
         SET compact_type = ?,
             compact_path = ?,
             compact_preview = ?,
             compact_summary = ?
         WHERE id = ?`,
    );
    stmt.run(type, opts?.path ?? null, opts?.preview ?? null, opts?.summary ?? null, id);
}

export function markSnipped(
    db: DatabaseSync,
    sessionId: string,
    fromSeq: number,
    toSeq: number,
): void {
    const stmt = db.prepare(
        `UPDATE messages
         SET compact_type = 'snipped'
         WHERE session_id = ? AND seq >= ? AND seq < ?`,
    );
    stmt.run(sessionId, fromSeq, toSeq);
}

export function markSummarized(
    db: DatabaseSync,
    sessionId: string,
    summary: string,
): void {
    const stmt = db.prepare(
        `UPDATE messages
         SET compact_type = 'summarized',
             compact_summary = ?
         WHERE session_id = ?`,
    );
    stmt.run(summary, sessionId);
}

export function getMessages(
    db: DatabaseSync,
    sessionId: string,
): MessageRow[] {
    const stmt = db.prepare(
        `SELECT * FROM messages WHERE session_id = ? ORDER BY seq`,
    );
    return stmt.all(sessionId) as unknown as MessageRow[];
}

export function getMaxSeq(
    db: DatabaseSync,
    sessionId: string,
): number {
    const stmt = db.prepare(
        `SELECT COALESCE(MAX(seq), -1) as max_seq FROM messages WHERE session_id = ?`,
    );
    const result = stmt.get(sessionId) as unknown as { max_seq: number } | undefined;
    return result?.max_seq ?? -1;
}

export interface SessionListItem {
    sessionId: string
    firstAt: number
    lastAt: number
    preview: string
}

export function listSessions(db: DatabaseSync, limit = 10): SessionListItem[] {
    const cwd = process.cwd()
    const rows = db.query(`
        SELECT session_id, MIN(created_at) as first_at, MAX(created_at) as last_at
        FROM messages
        WHERE project_dir = ?
        GROUP BY session_id
        ORDER BY last_at DESC
        LIMIT ?
    `).all(cwd, limit) as Array<{ session_id: string; first_at: number; last_at: number }>

    return rows.map(r => {
        const firstMsg = db.query(
            `SELECT content FROM messages WHERE session_id = ? AND role = 'user' ORDER BY seq LIMIT 1`
        ).get(r.session_id) as { content: string } | undefined
        return {
            sessionId: r.session_id,
            firstAt: r.first_at,
            lastAt: r.last_at,
            preview: firstMsg?.content?.slice(0, 60) ?? "(empty)",
        }
    })
}
