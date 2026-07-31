#!/usr/bin/env node
/**
 * Packaging fix for @shinyoshiaki/binary-data (pulled in by
 * ring-client-api -> werift).
 *
 * That package addresses its own internal modules with BARE specifiers —
 * `require('lib/binary-stream')`, `require('types/buffer')` etc. — and makes
 * them resolve by shipping a `src/node_modules/` folder inside the package,
 * relying on Node walking up for bare specifiers.
 *
 * electron-builder prunes node_modules directories nested inside packages, so
 * in a packaged build those files simply aren't there and the app dies with
 * "Cannot find module 'lib/binary-stream'" the moment ring-client-api loads.
 * It only breaks when packaged — in dev, node_modules is intact.
 *
 * Fix: rename `src/node_modules` -> `src/_modules` (a name electron-builder
 * has no special behaviour for) and rewrite every bare `lib|types|internal`
 * require into a relative path. Idempotent, so it's safe to run on every
 * install and before every build.
 */

import { existsSync, renameSync, readdirSync, statSync, readFileSync, writeFileSync } from 'fs'
import { join, relative, dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkgSrc = join(projectRoot, 'node_modules', '@shinyoshiaki', 'binary-data', 'src')

const OLD_DIR = join(pkgSrc, 'node_modules')
const NEW_DIR = join(pkgSrc, '_modules')
/** Bare specifier roots the package uses for its own internals. */
const ROOTS = ['lib', 'types', 'internal']

if (!existsSync(pkgSrc)) {
  console.log('[patch-binary-data] package not installed — nothing to do')
  process.exit(0)
}

// 1. Move the nested node_modules out of harm's way (idempotent)
if (existsSync(OLD_DIR)) {
  if (existsSync(NEW_DIR)) {
    console.log('[patch-binary-data] both dirs present — leaving as-is')
  } else {
    renameSync(OLD_DIR, NEW_DIR)
    console.log('[patch-binary-data] moved src/node_modules -> src/_modules')
  }
}

if (!existsSync(NEW_DIR)) {
  console.log('[patch-binary-data] nothing to patch')
  process.exit(0)
}

// 2. Rewrite bare requires to relative paths
function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (full.endsWith('.js')) out.push(full)
  }
  return out
}

/** Node wants './x' or '../x' — a plain 'x' would be a bare specifier again. */
function toRelativeSpecifier(fromFile, targetPath) {
  let rel = relative(dirname(fromFile), targetPath).split('\\').join('/')
  if (!rel.startsWith('.')) rel = './' + rel
  return rel
}

let patchedFiles = 0
let patchedRequires = 0

for (const file of walk(pkgSrc)) {
  const original = readFileSync(file, 'utf-8')
  const updated = original.replace(
    // require('lib/foo') / require("types/bar") — capture root + module name
    /require\(\s*['"](lib|types|internal)\/([A-Za-z0-9_-]+)['"]\s*\)/g,
    (_match, root, name) => {
      patchedRequires++
      const target = join(NEW_DIR, root, name)
      return `require('${toRelativeSpecifier(file, target)}')`
    }
  )
  if (updated !== original) {
    writeFileSync(file, updated, 'utf-8')
    patchedFiles++
  }
}

console.log(
  patchedRequires === 0
    ? '[patch-binary-data] already patched'
    : `[patch-binary-data] rewrote ${patchedRequires} bare require(s) across ${patchedFiles} file(s)`
)
