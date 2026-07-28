#!/usr/bin/env node
/**
 * Imports data/wix-catalog.json into Supabase: uploads artwork to the
 * `product-media` storage bucket and upserts the catalog tables.
 *
 *   node scripts/fetch-media.mjs        # first — puts the masters on disk
 *   node scripts/import-catalog.mjs     # then — optimize, upload, upsert
 *
 * Flags:
 *   --dry-run            report what would happen; touch nothing
 *   --skip-media         rows only, no uploads (fast re-import after edits)
 *   --originals          also upload the full-resolution masters (~700 MB)
 *   --only=slug,slug     limit to specific products
 *
 * Every image is re-encoded to WebP, which strips the camera EXIF that came
 * with these files — the originals carry iPhone GPS coordinates that should
 * not be republished.
 *
 * Idempotent: keyed on wix_id everywhere, so re-running updates in place
 * rather than duplicating. Safe to run repeatedly while the Wix store is
 * still live.
 */

import { readFile, readdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { loadEnv, requireEnv } from './lib/env.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CATALOG = resolve(ROOT, 'data/wix-catalog.json')
const ORIGINALS_DIR = resolve(ROOT, 'data/media/originals')
const BUCKET = 'product-media'

const DRY_RUN = process.argv.includes('--dry-run')
const SKIP_MEDIA = process.argv.includes('--skip-media')
const UPLOAD_ORIGINALS = process.argv.includes('--originals')
const ONLY = process.argv
  .find((a) => a.startsWith('--only='))
  ?.slice('--only='.length)
  .split(',')
  .filter(Boolean)

/** Storefront render size — big enough for a full-bleed hero on a 2x display. */
const DISPLAY = { width: 2000, quality: 82 }
/** Grid and card size. */
const THUMB = { width: 600, quality: 80 }

// --- env -------------------------------------------------------------------

loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const assertCredentials = () =>
  requireEnv(
    { NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY },
    'Find both under Dashboard → Project Settings → API.\n' +
      'The service role key bypasses RLS — server-side only, never in the browser.'
  )

// --- helpers ---------------------------------------------------------------

const mb = (b) => (b / 1024 / 1024).toFixed(1)

/** Locates the downloaded master for a media item, if fetch-media.mjs ran. */
function findOriginal(files, product, media) {
  const prefix = `${product.slug}__${String(media.position).padStart(2, '0')}__`
  return files.find((f) => f.startsWith(prefix))
}

/** Fails loudly rather than silently importing a product with no image. */
function check(error, what) {
  if (error) throw new Error(`${what}: ${error.message}`)
}

async function main() {
  if (!DRY_RUN) assertCredentials()

  const catalog = JSON.parse(await readFile(CATALOG, 'utf8'))
  let products = catalog.products
  if (ONLY) products = products.filter((p) => ONLY.includes(p.slug))

  console.log('Art You Can Feel — Supabase import')
  console.log(`  ${products.length} products, ${catalog.categories.length} categories`)
  if (DRY_RUN) console.log('  DRY RUN — nothing will be written\n')
  else console.log(`  target: ${SUPABASE_URL}\n`)

  const db = DRY_RUN
    ? null
    : createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  let originals = []
  if (!SKIP_MEDIA) {
    try {
      originals = await readdir(ORIGINALS_DIR)
    } catch {
      console.error(
        `No masters found at ${ORIGINALS_DIR}.\n` +
          'Run `node scripts/fetch-media.mjs` first, or pass --skip-media to import rows only.\n'
      )
      process.exit(1)
    }
  }

  // --- categories ----------------------------------------------------------
  const categoryIdByWixId = new Map()

  for (const [i, c] of catalog.categories.entries()) {
    if (DRY_RUN) {
      categoryIdByWixId.set(c.wixId, `dry-${i}`)
      continue
    }
    const { data, error } = await db
      .from('categories')
      .upsert(
        {
          wix_id: c.wixId,
          slug: c.slug,
          name: c.name,
          visible: c.visible ?? true,
          parent_wix_id: c.parentCategoryId,
          position: i,
        },
        { onConflict: 'wix_id' }
      )
      .select('id')
      .single()
    check(error, `category ${c.slug}`)
    categoryIdByWixId.set(c.wixId, data.id)
  }
  console.log(`  categories: ${catalog.categories.length} upserted`)

  // --- products ------------------------------------------------------------
  let uploaded = 0
  let uploadedBytes = 0
  const failures = []

  for (const [i, p] of products.entries()) {
    const label = `${String(i + 1).padStart(3)}/${products.length}  ${p.name}`

    try {
      let productId = `dry-${p.slug}`

      if (!DRY_RUN) {
        const { data, error } = await db
          .from('products')
          .upsert(
            {
              wix_id: p.wixId,
              slug: p.slug,
              name: p.name,
              sku: p.sku,
              description_html: p.descriptionHtml,
              description_text: p.descriptionText || null,
              price_cents: p.priceCents,
              compare_at_price_cents: p.comparePriceCents,
              currency: (p.currency ?? 'USD').toLowerCase(),
              in_stock: p.inStock ?? true,
              inventory_status: p.inventoryStatus,
              inventory_quantity: p.inventoryQuantity,
              product_type: p.productType,
              ribbon: p.ribbon,
              weight: p.weight,
              brand: p.brand,
              seo_title: p.seoTitle,
              seo_description: p.seoDescription,
              source_url: p.url,
              options: p.options ?? [],
              raw: p.raw,
              active: p.isVisible !== false,
            },
            { onConflict: 'wix_id' }
          )
          .select('id')
          .single()
        check(error, `product ${p.slug}`)
        productId = data.id

        // Category links. Replace wholesale so removals on Wix propagate.
        await db.from('product_categories').delete().eq('product_id', productId)
        const links = p.categoryIds
          .map((wixId) => categoryIdByWixId.get(wixId))
          .filter(Boolean)
          .map((category_id) => ({ product_id: productId, category_id }))
        if (links.length) {
          const { error: linkErr } = await db.from('product_categories').insert(links)
          check(linkErr, `category links for ${p.slug}`)
        }

        // Variants.
        for (const v of p.variants) {
          const { error: vErr } = await db.from('product_variants').upsert(
            {
              product_id: productId,
              wix_id: v.wixId,
              sku: v.sku,
              price_cents: v.priceCents,
              compare_at_price_cents: v.comparePriceCents,
              in_stock: v.inStock ?? true,
              quantity: v.quantity,
              weight: v.weight,
              options: Object.fromEntries(
                (v.optionsSelections ?? []).map((s, n) => [s.key ?? `option_${n}`, s.value ?? s])
              ),
            },
            { onConflict: 'product_id,wix_id' }
          )
          check(vErr, `variant for ${p.slug}`)
        }
      }

      // --- media -----------------------------------------------------------
      if (!SKIP_MEDIA) {
        for (const m of p.media) {
          const file = findOriginal(originals, p, m)
          if (!file) {
            failures.push({ product: p.name, error: `no local master for position ${m.position}` })
            continue
          }

          const buf = await readFile(resolve(ORIGINALS_DIR, file))
          const base = `${p.slug}/${String(m.position).padStart(2, '0')}`

          // Re-encoding to WebP also drops EXIF (these carry iPhone GPS).
          const display = await sharp(buf)
            .rotate()
            .resize({ width: DISPLAY.width, withoutEnlargement: true })
            .webp({ quality: DISPLAY.quality })
            .toBuffer()

          const thumb = await sharp(buf)
            .rotate()
            .resize({ width: THUMB.width, withoutEnlargement: true })
            .webp({ quality: THUMB.quality })
            .toBuffer()

          const displayPath = `${base}.webp`
          const thumbPath = `${base}-thumb.webp`
          let originalPath = null

          if (!DRY_RUN) {
            const up = async (path, body, contentType) => {
              const { error } = await db.storage
                .from(BUCKET)
                .upload(path, body, { contentType, upsert: true })
              check(error, `upload ${path}`)
            }

            await up(displayPath, display, 'image/webp')
            await up(thumbPath, thumb, 'image/webp')

            if (UPLOAD_ORIGINALS) {
              originalPath = `${base}-original${file.match(/\.\w+$/)?.[0] ?? '.jpg'}`
              await up(originalPath, buf, 'image/jpeg')
              uploadedBytes += buf.length
            }
          }

          uploaded++
          uploadedBytes += display.length + thumb.length

          if (!DRY_RUN) {
            const url = (path) =>
              path ? db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : null

            const meta = await sharp(display).metadata()
            const { error: mErr } = await db.from('product_media').upsert(
              {
                product_id: productId,
                wix_media_id: m.mediaId,
                kind: m.kind,
                position: m.position,
                storage_path: displayPath,
                public_url: url(displayPath),
                thumb_path: thumbPath,
                thumb_url: url(thumbPath),
                original_path: originalPath,
                original_url: url(originalPath),
                width: meta.width ?? m.width,
                height: meta.height ?? m.height,
                alt_text: m.altText ?? p.name,
                source_url: m.originalUrl,
              },
              { onConflict: 'product_id,wix_media_id' }
            )
            check(mErr, `media row for ${p.slug}`)
          }
        }
      }

      process.stdout.write(`\r  ${label.padEnd(60).slice(0, 60)}`)
    } catch (err) {
      failures.push({ product: p.name, error: err.message })
    }
  }

  console.log(`\n\n  products: ${products.length - new Set(failures.map((f) => f.product)).size} imported`)
  if (!SKIP_MEDIA) console.log(`  media:    ${uploaded} files, ${mb(uploadedBytes)} MB`)

  if (failures.length) {
    console.log(`\n  ${failures.length} problem(s):`)
    for (const f of failures) console.log(`    ${f.product} — ${f.error}`)
    process.exitCode = 1
  } else if (!DRY_RUN) {
    console.log('\n  Done. Next: node scripts/sync-stripe.mjs')
  }
}

main().catch((err) => {
  console.error('\nImport failed:', err)
  process.exit(1)
})
