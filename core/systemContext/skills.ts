import { make } from "./syscontext.js"
import { register } from "./registry.js"
import { SKILL_REGISTRY } from "../skills/skills.js"

interface SkillSummary {
  name: string
  description: string
}

function renderSkills(skills: SkillSummary[]): string {
  if (skills.length === 0) {
    return "No skills are currently available."
  }

  const lines = [
    "Skills provide specialized instructions and workflows for specific tasks.",
    "Use the skill tool to load a skill when a task matches its description.",
    "<available_skills>",
    ...skills.flatMap((skill) => [
      "  <skill>",
      `    <name>${skill.name}</name>`,
      `    <description>${skill.description}</description>`,
      "  </skill>",
    ]),
    "</available_skills>",
  ]

  return lines.join("\n")
}

const skillGuidanceSource = make<SkillSummary[]>({
  key: "core/skill-guidance",
  load: async () => {

    const skills: SkillSummary[] = []

    for (const [name, skill] of SKILL_REGISTRY) {
      skills.push({
        name,
        description: skill.description || "No description",
      })
    }

    skills.sort((a, b) => a.name.localeCompare(b.name))

    return skills
  },
  baseline: (skills) => renderSkills(skills),
  update: (_previous, current) =>
    `The available skills have changed. This list supersedes the previous available skills list.\n\n${renderSkills(current)}`,
  removed: () => "Skill guidance is no longer available. Do not use any previously listed skill.",
})

export function registerSkillGuidance(): void {
  register({
    key: "core/skill-guidance",
    load: async () => skillGuidanceSource,
  })
}
