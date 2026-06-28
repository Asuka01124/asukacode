import matter from "gray-matter";

export function safeMatter(content: string): ReturnType<typeof matter> {
    try {
        return matter(content);
    } catch {
        return matter(sanitize(content));
    }
}

function sanitize(content: string): string {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const frontmatter = match?.[1] || "";

    const fixed = frontmatter.split(/\r?\n/).map((line) => {
        const entry = line.match(/^([a-zA-Z_][\w]*)\s*:\s*(.*)$/);
        if (!entry) return line;

        const [, key, value] = entry;
        if (!value.includes(":")) return line;

        return `${key}: |\n  ${value}`;
    });

    return content.replace(frontmatter, fixed.join("\n"));
}
