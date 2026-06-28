import { rcedit } from 'rcedit'

const [target, icon] = process.argv.slice(2)
await rcedit(target, { icon })
