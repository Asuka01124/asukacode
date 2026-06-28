import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { safeMatter } from "../utils/matter.js";
import type { Skill } from "./types.js";

const SKILLS_DIRS = [
    path.join(os.homedir(), ".agents", "skills"),
    path.join(os.homedir(), ".claude", "skills"),
];

function scanDir(dirPath: string, registry: Map<string, Skill>): void {
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) return

    const dirs = fs
        .readdirSync(dirPath, { withFileTypes: true })
        .filter((d) => d.isDirectory() || d.isSymbolicLink())
        .sort((a, b) => a.name.localeCompare(b.name));

    for (const dir of dirs) {
        const manifest = path.join(dirPath, dir.name, "SKILL.md");
        if (!fs.existsSync(manifest)) continue;

        const raw = fs.readFileSync(manifest, "utf-8");
        const { data, content } = safeMatter(raw);

        const name = data.name || dir.name;
        if (registry.has(name)) continue;

        const description =
            data.description ||
            raw.split("\n")[0].replace(/^#\s*/, "").trim();

        registry.set(name, { name, description, content: raw });
    }
}

export function scanSkills(): Map<string, Skill> {
    const registry = new Map<string, Skill>();
    for (const dir of SKILLS_DIRS) {
        scanDir(dir, registry);
    }
    return registry;
}
