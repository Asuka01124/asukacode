import path from "node:path";

const WORKDIR = process.cwd();

export function safePath(p: string): string {
    const resolved = path.resolve(WORKDIR, p);
    if (!resolved.startsWith(WORKDIR)) {
        throw new Error(`Path escapes workspace: ${p}`);
    }
    return resolved;
}
