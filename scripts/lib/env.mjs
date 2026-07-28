/**
 * Minimal .env.local reader for the migration scripts.
 *
 * Next.js loads .env.local automatically, but these scripts run under bare
 * `node`, which does not. Reading the file directly keeps them dependency-free
 * (no dotenv) and avoids a second source of truth for credentials.
 *
 * Real environment variables always win, so CI and one-off overrides like
 * `SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-catalog.mjs` still work.
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

export function loadEnv(file = '.env.local') {
  try {
    const text = readFileSync(resolve(ROOT, file), 'utf8')
    for (const line of text.split('\n')) {
      if (/^\s*#/.test(line)) continue
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
      }
    }
  } catch {
    // No .env.local — fall back to the ambient environment.
  }
}

/** True for the scaffold placeholders shipped in .env.example. */
export const isPlaceholder = (v) =>
  !v || /your-|your_|sk_test_your|pk_test_your|whsec_your/.test(v)

/** Exits with a readable message when required credentials are missing. */
export function requireEnv(vars, hint) {
  const missing = Object.entries(vars)
    .filter(([, v]) => isPlaceholder(v))
    .map(([k]) => k)

  if (missing.length) {
    console.error(
      `\nMissing real credentials in .env.local:\n` +
        missing.map((k) => `  ${k}`).join('\n') +
        (hint ? `\n\n${hint}\n` : '\n')
    )
    process.exit(1)
  }
}
