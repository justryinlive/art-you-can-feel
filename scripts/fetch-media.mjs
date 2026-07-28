#!/usr/bin/env node
/**
 * Downloads every original image and video referenced by data/wix-catalog.json
 * from the Wix CDN into data/media/ so the artwork lives on disk rather than
 * behind someone else's subscription.
 *
 *   node scripts/fetch-media.mjs            # images only (default)
 *   node scripts/fetch-media.mjs --video    # images + the 19 product videos
 *
 * These are the masters — full resolution, several MB each. They are
 * gitignored. scripts/import-catalog.mjs reads from here to build the
 * web-sized derivatives it uploads to Supabase Storage.
 *
 * Re-running skips files already on disk, so an interrupted run resumes.
 */

import { createWriteStream } from 'node:fs'
import { mkdir, readFile, stat, unlink } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CATALOG = resolve(ROOT, 'data/wix-catalog.json')
const MEDIA_DIR = resolve(ROOT, 'data/media')

const WITH_VIDEO = process.argv.includes('--video')
const CONCURRENCY = 4
const RETRIES = 3

const UA = 'aycf-catalog-migration/1.0'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1)

async function exists(path) {
  try {
    const s = await stat(path)
    return s.size > 0
  } catch {
    return false
  }
}

/** Streams a URL to disk. Cleans up the partial file if anything fails. */
async function download(url, dest, attempt = 1) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    if (!res.body) throw new Error('empty body')

    await mkdir(dirname(dest), { recursive: true })
    await pipeline(Readable.fromWeb(res.body), createWriteStream(dest))

    const s = await stat(dest)
    if (s.size === 0) throw new Error('wrote 0 bytes')
    return s.size
  } catch (err) {
    await unlink(dest).catch(() => {})
    if (attempt >= RETRIES) throw err
    await sleep(750 * attempt)
    return download(url, dest, attempt + 1)
  }
}

/** Runs `worker` over `items` with a fixed number of parallel lanes. */
async function pooled(items, limit, worker) {
  let cursor = 0
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++
      await worker(items[i], i)
    }
  })
  await Promise.all(lanes)
}

/** Filename that stays stable across runs and is safe on every filesystem. */
function localName(product, media, ext) {
  const id = (media.mediaId ?? '').split('/').pop()?.replace(/[^\w.~-]/g, '_')
  return `${product.slug}__${String(media.position).padStart(2, '0')}__${id || 'media'}${ext}`
}

async function main() {
  const catalog = JSON.parse(await readFile(CATALOG, 'utf8'))

  /** @type {{url:string,dest:string,label:string}[]} */
  const jobs = []

  for (const product of catalog.products) {
    for (const media of product.media) {
      if (media.originalUrl) {
        // Wix serves the untouched upload when no transform segment is present.
        const ext = (media.mediaId?.match(/\.\w+$/)?.[0] ?? '.jpg').toLowerCase()
        jobs.push({
          url: media.originalUrl,
          dest: resolve(MEDIA_DIR, 'originals', localName(product, media, ext)),
          label: `${product.name} [${media.kind}]`,
        })
      }

      if (WITH_VIDEO && media.kind === 'video') {
        // Highest quality rendition Wix exposes for this clip.
        const best = [...(media.videoFiles ?? [])].sort(
          (a, b) => (b.width ?? 0) * (b.height ?? 0) - (a.width ?? 0) * (a.height ?? 0)
        )[0]
        if (best) {
          jobs.push({
            url: best.url,
            dest: resolve(MEDIA_DIR, 'video', localName(product, media, `.${best.format ?? 'mp4'}`)),
            label: `${product.name} [video ${best.quality}]`,
          })
        }
      }
    }
  }

  console.log(`Art You Can Feel — media download`)
  console.log(`  ${jobs.length} files${WITH_VIDEO ? ' (including video)' : ' (images only; pass --video for clips)'}\n`)

  let done = 0
  let bytes = 0
  let skipped = 0
  const failures = []

  await pooled(jobs, CONCURRENCY, async (job) => {
    if (await exists(job.dest)) {
      skipped++
      done++
      process.stdout.write(`\r  ${done}/${jobs.length}  (${mb(bytes)} MB, ${skipped} cached)`)
      return
    }
    try {
      bytes += await download(job.url, job.dest)
    } catch (err) {
      failures.push({ label: job.label, url: job.url, error: err.message })
    }
    done++
    process.stdout.write(`\r  ${done}/${jobs.length}  (${mb(bytes)} MB, ${skipped} cached)`)
  })

  console.log(`\n\n  downloaded ${mb(bytes)} MB into ${MEDIA_DIR}`)
  if (skipped) console.log(`  ${skipped} already present`)

  if (failures.length) {
    console.log(`\n  ${failures.length} FAILED:`)
    for (const f of failures) console.log(`    ${f.label} — ${f.error}`)
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error('\nDownload failed:', err)
  process.exit(1)
})
