#!/usr/bin/env node
/**
 * Scrapes the Art You Can Feel catalog off the live Wix Stores site into a
 * version-controlled JSON snapshot at data/wix-catalog.json.
 *
 *   node scripts/scrape-wix.mjs
 *
 * How it works: Wix server-renders each page with a `<!-- warmup data -->`
 * script block holding the exact JSON its widgets hydrate from. That gives us
 * the real catalog objects — no headless browser, no API key, no HTML parsing.
 *
 *   - Product URLs come from /store-products-sitemap.xml. The category page
 *     only server-renders the first 24 of 114 and paginates client-side, so
 *     the sitemap is the only reliable enumerator.
 *   - Category id -> name/slug mapping comes from the all-products category
 *     page; products themselves carry only bare `categoryIds` UUIDs.
 *
 * Images are NOT downloaded. We record static.wixstatic.com URLs and hotlink
 * them. Swapping to self-hosted later only means walking `media[]` and
 * rewriting `originalUrl` — every source URL is preserved in the snapshot.
 */

import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'data/wix-catalog.json')

const SITE = 'https://www.artyoucanfeel.com'
const PRODUCT_SITEMAP = `${SITE}/store-products-sitemap.xml`
const CATEGORY_SOURCE = `${SITE}/category/all-products`
const IMAGE_CDN = 'https://static.wixstatic.com/media'
const VIDEO_CDN = 'https://video.wixstatic.com'

/** Be a polite guest on a site we own: low concurrency, small gap between hits. */
const CONCURRENCY = 4
const DELAY_MS = 120
const RETRIES = 3

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36 (+aycf-catalog-migration)'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchText(url, attempt = 1) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } catch (err) {
    if (attempt >= RETRIES) throw new Error(`${url} failed after ${RETRIES} tries: ${err.message}`)
    await sleep(500 * attempt)
    return fetchText(url, attempt + 1)
  }
}

/**
 * Reads one complete JSON value out of `text` starting at the first `{` or `[`
 * at/after `from`.
 *
 * A plain brace counter is not safe here: product descriptions are HTML and
 * SEO blobs are escaped JSON, both of which contain braces and quotes inside
 * string literals. So this tracks string state and backslash escapes.
 */
function readJsonValue(text, from) {
  let i = from
  while (i < text.length && text[i] !== '{' && text[i] !== '[') i++
  if (i >= text.length) return null

  const open = text[i]
  const close = open === '{' ? '}' : ']'
  let depth = 0
  let inString = false
  let escaped = false

  for (let j = i; j < text.length; j++) {
    const c = text[j]
    if (inString) {
      if (escaped) escaped = false
      else if (c === '\\') escaped = true
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') inString = true
    else if (c === open) depth++
    else if (c === close) {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(i, j + 1))
        } catch {
          return null
        }
      }
    }
  }
  return null
}

/** Finds `"<key>":` then parses the value that follows it. */
function extractByKey(html, key, { last = false } = {}) {
  const needle = `"${key}":`
  const at = last ? html.lastIndexOf(needle) : html.indexOf(needle)
  if (at === -1) return null
  return readJsonValue(html, at + needle.length)
}

// --- normalization ---------------------------------------------------------

/** Wix prices are decimal numbers (350, 514.5). Store integer cents. */
const toCents = (n) =>
  typeof n === 'number' && Number.isFinite(n) ? Math.round(n * 100) : null

/** Strips tags and decodes the few entities Wix actually emits. */
function htmlToText(html) {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Builds hotlink URLs for one media item.
 *
 * `originalUrl` (no transform segment) serves the untouched upload — full
 * resolution, but also 5-8MB and carrying camera EXIF including GPS. Use
 * `displayUrl`/`thumbnailUrl` for anything user-facing.
 */
function normalizeMedia(item, index) {
  const isVideo = item.mediaType === 'VIDEO'
  const width = item.width ?? null
  const height = item.height ?? null

  const media = {
    kind: isVideo ? 'video' : 'photo',
    position: item.index ?? index,
    width,
    height,
    altText: item.altText ?? null,
    mediaId: item.url ?? null,
    originalUrl: item.url ? `${IMAGE_CDN}/${item.url}` : null,
    displayUrl: item.url
      ? `${IMAGE_CDN}/${item.url}/v1/fit/w_1600,h_1600,q_90/file.jpg`
      : null,
    thumbnailUrl: item.url
      ? `${IMAGE_CDN}/${item.url}/v1/fit/w_400,h_400,q_90/file.jpg`
      : null,
  }

  if (isVideo) {
    // The image URLs above remain valid — they resolve to the poster frame.
    media.videoFiles = (item.videoFiles ?? []).map((v) => ({
      url: `${VIDEO_CDN}/${v.url}`,
      width: v.width ?? null,
      height: v.height ?? null,
      format: v.format ?? null,
      quality: v.quality ?? null,
    }))
  }

  return media
}

function normalizeProduct(raw, url, categoriesById) {
  const categoryIds = raw.categoryIds ?? []

  return {
    wixId: raw.id,
    slug: raw.urlPart,
    url,
    name: (raw.name ?? '').trim(),
    sku: raw.sku || null,

    descriptionHtml: raw.description || null,
    descriptionText: htmlToText(raw.description),

    priceCents: toCents(raw.price),
    comparePriceCents: raw.comparePrice ? toCents(raw.comparePrice) : null,
    currency: raw.currency ?? 'USD',
    formattedPrice: raw.formattedPrice ?? null,

    inStock: raw.isInStock ?? null,
    inventoryStatus: raw.inventory?.status ?? null,
    inventoryQuantity: raw.inventory?.quantity ?? null,
    isTrackingInventory: raw.isTrackingInventory ?? null,
    isVisible: raw.isVisible ?? null,

    productType: raw.productType ?? null,
    ribbon: raw.ribbon || null,
    weight: raw.weight ?? null,
    brand: raw.brand ?? null,

    seoTitle: raw.seoTitle ?? null,
    seoDescription: raw.seoDescription ?? null,

    categoryIds,
    categorySlugs: categoryIds.map((id) => categoriesById.get(id)?.slug).filter(Boolean),
    mainCategoryId: raw.mainCategoryId ?? null,

    options: (raw.options ?? []).map((o) => ({
      id: o.id,
      title: o.title ?? o.key,
      key: o.key,
      type: o.optionType ?? null,
      selections: (o.selections ?? []).map((s) => ({
        id: s.id,
        key: s.key,
        value: s.value,
        description: s.description ?? null,
      })),
    })),

    variants: (raw.productItems ?? []).map((v) => ({
      wixId: v.id,
      sku: v.sku || null,
      priceCents: toCents(v.price),
      comparePriceCents: v.comparePrice ? toCents(v.comparePrice) : null,
      inStock: v.inventory?.status === 'in_stock',
      quantity: v.inventory?.quantity ?? null,
      weight: v.weight ?? null,
      isVisible: v.isVisible ?? null,
      optionsSelections: v.optionsSelections ?? [],
    })),

    media: (raw.media ?? []).map(normalizeMedia),

    // Wix ships boilerplate placeholder copy in these tabs ("I'm a product
    // detail..."). Captured for completeness; review before surfacing.
    additionalInfo: (raw.additionalInfo ?? []).map((a) => ({
      title: a.title,
      description: a.description,
      index: a.index ?? null,
    })),

    raw,
  }
}

// --- steps -----------------------------------------------------------------

async function getProductUrls() {
  const xml = await fetchText(PRODUCT_SITEMAP)
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim())
  return [...new Set(urls)]
}

async function getCategories() {
  const html = await fetchText(CATEGORY_SOURCE)

  // Lives at catalog.categories.list on the category page. Anchor on the
  // wrapper rather than a bare "categories" key — products carry an empty
  // `categories` array of their own that would otherwise match first.
  const marker = '"categories":{"list":'
  const at = html.indexOf(marker)
  const list = at === -1 ? null : readJsonValue(html, at + marker.length)

  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('Could not extract the category list — Wix page shape may have changed.')
  }
  return list.map((c) => ({
    wixId: c.id,
    name: c.name,
    slug: c.slug,
    visible: c.visible ?? null,
    parentCategoryId: c.parentCategoryId ?? null,
  }))
}

async function scrapeProduct(url, categoriesById) {
  const html = await fetchText(url)

  // The product page carries several "product" keys; the warmup block at the
  // end of the document is the complete one, so search from the back.
  const raw = extractByKey(html, 'product', { last: true })
  if (!raw?.id || !raw?.urlPart) {
    throw new Error('no product object found')
  }
  return normalizeProduct(raw, url, categoriesById)
}

/** Runs `worker` over `items` with a fixed number of parallel lanes. */
async function pooled(items, limit, worker) {
  const results = new Array(items.length)
  let cursor = 0

  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++
      results[i] = await worker(items[i], i)
      await sleep(DELAY_MS)
    }
  })

  await Promise.all(lanes)
  return results
}

async function main() {
  console.log('Art You Can Feel — Wix catalog scrape\n')

  const [categories, productUrls] = await Promise.all([getCategories(), getProductUrls()])
  const categoriesById = new Map(categories.map((c) => [c.wixId, c]))

  console.log(`  categories : ${categories.length}`)
  console.log(`  products   : ${productUrls.length} URLs from sitemap\n`)

  const failures = []
  let done = 0

  const settled = await pooled(productUrls, CONCURRENCY, async (url) => {
    try {
      const product = await scrapeProduct(url, categoriesById)
      done++
      process.stdout.write(`\r  scraped ${done}/${productUrls.length}`)
      return product
    } catch (err) {
      done++
      failures.push({ url, error: err.message })
      process.stdout.write(`\r  scraped ${done}/${productUrls.length}`)
      return null
    }
  })

  const products = settled.filter(Boolean)
  products.sort((a, b) => a.name.localeCompare(b.name))

  // Attach product counts so the category list is useful on its own.
  const countBySlug = new Map()
  for (const p of products) {
    for (const slug of p.categorySlugs) {
      countBySlug.set(slug, (countBySlug.get(slug) ?? 0) + 1)
    }
  }

  const snapshot = {
    source: SITE,
    scrapedAt: new Date().toISOString(),
    imageStrategy: 'hotlink',
    counts: {
      productsExpected: productUrls.length,
      productsScraped: products.length,
      failed: failures.length,
      categories: categories.length,
      media: products.reduce((n, p) => n + p.media.length, 0),
    },
    failures,
    categories: categories.map((c) => ({ ...c, productCount: countBySlug.get(c.slug) ?? 0 })),
    products,
  }

  await mkdir(dirname(OUT), { recursive: true })
  await writeFile(OUT, JSON.stringify(snapshot, null, 2) + '\n')

  console.log(`\n\n  wrote ${OUT}`)
  console.log(`  ${products.length}/${productUrls.length} products, ${snapshot.counts.media} media items`)
  if (failures.length) {
    console.log(`\n  ${failures.length} FAILED:`)
    for (const f of failures) console.log(`    ${f.url} — ${f.error}`)
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error('\nScrape failed:', err)
  process.exit(1)
})
