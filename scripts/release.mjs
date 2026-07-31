#!/usr/bin/env node
/**
 * Release wrapper. Loads .env.local (gitignored) into process.env, then runs
 * the build + publish pipeline. This is what `npm run release` calls so any
 * shell can produce a published release without having to set environment
 * variables manually.
 *
 * .env.local should contain at minimum:
 *   GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxx
 *
 * Plus the existing Google OAuth keys (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
 * that the main bundle picks up via Vite's loadEnv at build time.
 */

import { readFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const envFile = resolve(projectRoot, '.env.local')

// --- Load .env.local into process.env -------------------------------------

if (existsSync(envFile)) {
  const raw = readFileSync(envFile, 'utf-8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    // Strip surrounding quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    // Don't clobber values that were explicitly set on the command line
    if (process.env[key] === undefined) process.env[key] = value
  }
} else {
  console.warn(`[release] No .env.local found at ${envFile}`)
}

if (!process.env.GH_TOKEN) {
  console.error(
    '[release] GH_TOKEN is not set. Add `GH_TOKEN=ghp_xxx…` to .env.local\n' +
      '          or export it in your shell before running `npm run release`.'
  )
  process.exit(1)
}

// --- Run the build pipeline ------------------------------------------------

function run(cmd, args) {
  console.log(`[release] $ ${cmd} ${args.join(' ')}`)
  const result = spawnSync(cmd, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true,
    env: process.env
  })
  if (result.status !== 0) {
    console.error(`[release] ${cmd} exited with code ${result.status}`)
    process.exit(result.status ?? 1)
  }
}

// Rewrite @shinyoshiaki/binary-data's nested node_modules before packaging —
// electron-builder prunes it and ring-client-api dies at runtime otherwise.
run('node', ['./scripts/patch-binary-data.mjs'])
run('electron-vite', ['build'])
run('electron-builder', [
  '--win',
  '--config',
  'electron-builder.yml',
  '--publish',
  'always'
])

console.log('[release] Done. Check GitHub for the draft release.')
