const ARITY: Record<string, number> = {
  git: 2,
  npm: 2,
  "npm run": 3,
  npx: 2,
  yarn: 2,
  pnpm: 2,
  bun: 2,
  node: 2,
  python: 2,
  python3: 2,
  pip: 2,
  pip3: 2,
  cargo: 2,
  go: 2,
  java: 2,
  javac: 2,
  docker: 2,
  "docker-compose": 2,
  kubectl: 2,
  helm: 2,
  make: 2,
  cmake: 2,
  "g++": 2,
  gcc: 2,
  rustc: 2,
  tsc: 2,
  eslint: 2,
  prettier: 2,
  jest: 2,
  vitest: 2,
  pytest: 2,
  mvn: 2,
  gradle: 2,
  ls: 1,
  cat: 1,
  grep: 2,
  find: 2,
  sed: 1,
  awk: 1,
  tar: 1,
  zip: 1,
  unzip: 1,
  curl: 1,
  wget: 1,
  ssh: 1,
  scp: 1,
  rsync: 1,
}

export function getCommandPrefix(tokens: string[]): string {
  if (tokens.length === 0) return ""

  for (let len = Math.min(tokens.length, 3); len >= 1; len--) {
    const prefix = tokens.slice(0, len).join(" ")
    if (ARITY[prefix]) {
      return tokens.slice(0, ARITY[prefix]).join(" ")
    }
  }

  return tokens[0]
}
