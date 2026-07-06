import path from "node:path";
import fs from "node:fs";
import os from "node:os";

export interface PathCheckResult {
  safe: boolean;
  reason?: "relative_escape" | "location_escape" | "external";
  resolved?: string;
}

const ALLOWED_EXTERNAL_PATHS = [path.join(os.homedir(), ".asukacode")];

export function checkPath(
  filepath: string,
  workdir: string,
  projectDir: string,
): PathCheckResult {
  const resolved = path.resolve(workdir, filepath);

  for (const allowedPath of ALLOWED_EXTERNAL_PATHS) {
    if (
      resolved.startsWith(allowedPath + path.sep) ||
      resolved === allowedPath
    ) {
      return { safe: true, resolved };
    }
  }

  const lexicallyInternal =
    resolved.startsWith(projectDir + path.sep) || resolved === projectDir;

  if (!path.isAbsolute(filepath) && !lexicallyInternal) {
    return { safe: false, reason: "relative_escape", resolved };
  }

  try {
    const real = fs.realpathSync(resolved);
    if (!real.startsWith(projectDir + path.sep) && real !== projectDir) {
      for (const allowedPath of ALLOWED_EXTERNAL_PATHS) {
        if (real.startsWith(allowedPath + path.sep) || real === allowedPath) {
          return { safe: true, resolved: real };
        }
      }
      return { safe: false, reason: "location_escape", resolved: real };
    }
  } catch {
    if (!lexicallyInternal) {
      return { safe: false, reason: "external", resolved };
    }
  }

  return { safe: true, resolved };
}

export function containsPath(filepath: string, projectDir: string): boolean {
  const resolved = path.resolve(projectDir, filepath);
  return resolved.startsWith(projectDir + path.sep) || resolved === projectDir;
}
