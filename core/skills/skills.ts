import { scanSkills } from "./scan.js";
import type { Skill } from "./types.js";

export type { Skill } from "./types.js";

export const SKILL_REGISTRY: Map<string, Skill> = scanSkills();

export function listSkills(): string {
    if (SKILL_REGISTRY.size === 0) return "(no skills found)";

    return [...SKILL_REGISTRY.values()]
        .map((s) => `- **${s.name}**: ${s.description}`)
        .join("\n");
}
