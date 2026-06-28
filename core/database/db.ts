import { Database as DatabaseSync } from "bun:sqlite"
import fs from "node:fs"
import { getProjectDBPath, getProjectDir } from "../config/project.js"
import { initMessagesTable } from "./messages.js"

let db: DatabaseSync | null = null

export function getDB(): DatabaseSync {
    if (!db) {
        const dbPath = getProjectDBPath()

        const projectDir = getProjectDir()
        if (!fs.existsSync(projectDir)) {
            fs.mkdirSync(projectDir, { recursive: true })
        }

        db = new DatabaseSync(dbPath)
        db.exec("PRAGMA journal_mode=WAL")
        initMessagesTable(db)
    }
    return db
}

export function closeDB(): void {
    if (db) {
        db.close()
        db = null
    }
}
