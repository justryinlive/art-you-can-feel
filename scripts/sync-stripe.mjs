#!/usr/bin/env node
/**
 * Mirrors the Supabase catalog into Stripe as Products and Prices, then writes
 * the resulting ids back onto public.products.
 *
 *   node scripts/sync-stripe.mjs --dry-run    # report the plan, change nothing
 *   node scripts/sync-stripe.mjs              # apply
 *
 * Supabase stays the source of truth: this only ever pushes Supabase → Stripe,
 * never the reverse.
 *
 * Idempotent. Products are matched by the stripe_product_id already stored on
 * the row, so re-running updates in place. Stripe Prices are immutable, so a
 * price change means creating a new Price, pointing the Product's
 * default_price at it, and deactivating the old one — history is preserved for
 * past orders rather than rewritten.
 */

import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { loadEnv, requireEnv } from './lib/env.mjs'

loadEnv()

const DRY_RUN = process.argv.includes('--dry-run')
const ONLY = process.argv
  .find((a) => a.startsWith('--only='))
  ?.slice('--only='.length)
  .split(',')
  .filter(Boolean)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY

requireEnv(
  {
    NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
    STRIPE_SECRET_KEY: STRIPE_KEY,
  },
  'Supabase keys: Dashboard → Project Settings → API\n' +
    'Stripe key:    Dashboard → Developers → API keys (use sk_test_… first)'
)

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
const stripe = new Stripe(STRIPE_KEY)

const money = (cents) => `$${(cents / 100).toFixed(2)}`

async function main() {
  console.log('Art You Can Feel — Stripe catalog sync')
  console.log(`  mode: ${STRIPE_KEY.startsWith('sk_live') ? 'LIVE' : 'test'}`)
  if (DRY_RUN) console.log('  DRY RUN — nothing will be written\n')
  else console.log('')

  let query = db
    .from('products')
    .select(
      'id, slug, name, description_text, price_cents, currency, active, ' +
        'sku, stripe_product_id, stripe_price_id, product_media(public_url, position)'
    )
    .order('name')

  if (ONLY) query = query.in('slug', ONLY)

  const { data: products, error } = await query
  if (error) throw new Error(`Failed to read products: ${error.message}`)
  if (!products?.length) {
    console.log('  No products found. Run scripts/import-catalog.mjs first.')
    return
  }

  console.log(`  ${products.length} products\n`)

  let created = 0
  let updated = 0
  let repriced = 0
  let unchanged = 0
  const failures = []

  for (const p of products) {
    try {
      // Stripe accepts at most 8 image URLs, and they must be publicly served.
      const images = (p.product_media ?? [])
        .filter((m) => m.public_url)
        .sort((a, b) => a.position - b.position)
        .slice(0, 8)
        .map((m) => m.public_url)

      const fields = {
        name: p.name,
        description: p.description_text || undefined,
        images: images.length ? images : undefined,
        active: p.active,
        metadata: {
          supabase_id: p.id,
          slug: p.slug,
          sku: p.sku ?? '',
        },
      }

      let productId = p.stripe_product_id
      let priceId = p.stripe_price_id

      // --- product ---------------------------------------------------------
      if (productId) {
        if (!DRY_RUN) await stripe.products.update(productId, fields)
        updated++
      } else {
        if (DRY_RUN) {
          productId = 'prod_dryrun'
        } else {
          const sp = await stripe.products.create(fields)
          productId = sp.id
        }
        created++
      }

      // --- price -----------------------------------------------------------
      // Prices are immutable, so only mint a new one when the amount actually
      // moved. Otherwise every sync would orphan a Price object.
      let currentAmount = null
      if (priceId && !DRY_RUN) {
        try {
          const existing = await stripe.prices.retrieve(priceId)
          currentAmount = existing.unit_amount
        } catch {
          priceId = null // price was deleted in the dashboard; recreate below
        }
      }

      const needsPrice = !priceId || currentAmount !== p.price_cents

      if (needsPrice) {
        if (!DRY_RUN) {
          const price = await stripe.prices.create({
            product: productId,
            unit_amount: p.price_cents,
            currency: (p.currency ?? 'usd').toLowerCase(),
          })

          await stripe.products.update(productId, { default_price: price.id })

          // Retire the superseded price so it can't be checked out against.
          if (priceId) await stripe.prices.update(priceId, { active: false })

          priceId = price.id
        } else {
          priceId = 'price_dryrun'
        }
        if (currentAmount !== null) repriced++
      } else {
        unchanged++
      }

      // --- write back ------------------------------------------------------
      if (!DRY_RUN) {
        const { error: upErr } = await db
          .from('products')
          .update({ stripe_product_id: productId, stripe_price_id: priceId })
          .eq('id', p.id)
        if (upErr) throw new Error(upErr.message)
      }

      const tag = needsPrice ? (currentAmount !== null ? 'repriced' : 'priced') : 'ok'
      console.log(`  ${tag.padEnd(9)} ${p.name.padEnd(34).slice(0, 34)} ${money(p.price_cents)}`)
    } catch (err) {
      failures.push({ product: p.name, error: err.message })
      console.log(`  FAILED    ${p.name} — ${err.message}`)
    }
  }

  console.log(
    `\n  created ${created}, updated ${updated}, repriced ${repriced}, price unchanged ${unchanged}`
  )

  if (failures.length) {
    console.log(`\n  ${failures.length} failure(s)`)
    process.exitCode = 1
  } else if (DRY_RUN) {
    console.log('\n  Dry run only. Re-run without --dry-run to apply.')
  }
}

main().catch((err) => {
  console.error('\nStripe sync failed:', err)
  process.exit(1)
})
