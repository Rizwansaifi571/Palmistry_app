import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const rootDist = resolve('dist')
const frontendDist = resolve('frontend', 'dist')

if (!existsSync(frontendDist)) {
  throw new Error(`Frontend build output not found at ${frontendDist}`)
}

rmSync(rootDist, { recursive: true, force: true })
mkdirSync(rootDist, { recursive: true })
cpSync(frontendDist, rootDist, { recursive: true })
