import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/**
 * Read access to the Art You Can Feel catalog.
 *
 * Two sources, one shape. Once Supabase holds real credentials these read from
 * Postgres through the anon key, so RLS applies and only rows the storefront
 * policies expose come back. Until then they fall back to the committed Wix
 * snapshot in data/wix-catalog.json, so the gallery renders real work instead
 * of an empty grid while the migration is still in progress.
 *
 * Callers never need to know which source answered.
 */

export type ProductMedia = {
  kind: 'photo' | 'video'
  position: number
  public_url: string | null
  thumb_url: string | null
  width: number | null
  height: number | null
  alt_text: string | null
}

export type Category = {
  id: string
  slug: string
  name: string
  position: number | null
}

export type Product = {
  id: string
  slug: string
  name: string
  sku: string | null
  description_text: string | null
  description_html: string | null
  price_cents: number
  compare_at_price_cents: number | null
  currency: string
  in_stock: boolean
  ribbon: string | null
  stripe_price_id: string | null
  product_media: ProductMedia[]
  categories?: Category[]
}

// Wix's implicit catch-all. It carries no memberships, so offering it as a
// filter would return nothing — the storefront lists everything by default.
const ALL_PRODUCTS = 'all-products'

const PRODUCT_FIELDS = `
  id, slug, name, sku, description_text, description_html,
  price_cents, compare_at_price_cents, currency, in_stock, ribbon,
  stripe_price_id,
  product_media (kind, position, public_url, thumb_url, width, height, alt_text)
`

/**
 * True once the environment holds a real Supabase project rather than the
 * placeholders shipped in .env.example. Deploys without credentials still
 * render — they just read the snapshot.
 */
export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const placeholder = /your-|your_/
  return Boolean(url && key && !placeholder.test(url) && !placeholder.test(key))
}

/** Formats integer cents for display: 35000 -> "$350.00". */
export function formatPrice(cents: number, currency = 'usd') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

/** The image a card or grid tile should show. */
export function primaryImage(product: Pick<Product, 'product_media'>) {
  const photos = (product.product_media ?? [])
    .filter((m) => m.kind === 'photo')
    .sort((a, b) => a.position - b.position)
  return photos[0] ?? null
}

// --- Snapshot source -------------------------------------------------------
// Mirrors the scraper's output shape (scripts/scrape-wix.mjs). Only the fields
// the storefront actually renders are typed here.

type SnapshotMedia = {
  kind: 'photo' | 'video'
  position: number
  width: number | null
  height: number | null
  altText: string | null
  displayUrl: string | null
  thumbnailUrl: string | null
}

type SnapshotProduct = {
  wixId: string
  slug: string
  name: string
  sku: string | null
  descriptionHtml: string | null
  descriptionText: string | null
  priceCents: number
  comparePriceCents: number | null
  currency: string
  inStock: boolean
  isVisible: boolean
  ribbon: string | null
  categorySlugs: string[]
  media: SnapshotMedia[]
}

type SnapshotCategory = {
  wixId: string
  name: string
  slug: string
  visible: boolean
}

type Snapshot = { categories: SnapshotCategory[]; products: SnapshotProduct[] }

// Read at request time rather than imported, so TypeScript never has to infer a
// type for 700 KB of JSON. next.config.ts traces the file into the deployment.
const SNAPSHOT_PATH = path.join(process.cwd(), 'data', 'wix-catalog.json')

const loadSnapshot = cache(async (): Promise<Snapshot> => {
  const raw = await readFile(SNAPSHOT_PATH, 'utf8')
  return JSON.parse(raw) as Snapshot
})

function snapshotCategories(snapshot: Snapshot): Category[] {
  return snapshot.categories
    .filter((c) => c.visible && c.slug !== ALL_PRODUCTS)
    .map((c, i) => ({ id: c.wixId, slug: c.slug, name: c.name, position: i }))
}

function toProduct(p: SnapshotProduct, bySlug: Map<string, Category>): Product {
  return {
    id: p.wixId,
    slug: p.slug,
    name: p.name,
    sku: p.sku ?? null,
    description_text: p.descriptionText || null,
    description_html: p.descriptionHtml || null,
    price_cents: p.priceCents,
    compare_at_price_cents: p.comparePriceCents,
    currency: (p.currency || 'usd').toLowerCase(),
    in_stock: p.inStock,
    ribbon: p.ribbon || null,
    // Stripe prices only exist after `npm run catalog:stripe` writes them back
    // to Supabase, so the snapshot never carries one.
    stripe_price_id: null,
    product_media: p.media.map((m) => ({
      kind: m.kind,
      position: m.position,
      // The snapshot hotlinks the Wix CDN; Supabase Storage takes over on import.
      public_url: m.displayUrl,
      thumb_url: m.thumbnailUrl,
      width: m.width,
      height: m.height,
      alt_text: m.altText ?? p.name,
    })),
    categories: p.categorySlugs
      .map((slug) => bySlug.get(slug))
      .filter((c): c is Category => Boolean(c)),
  }
}

// --- Public API ------------------------------------------------------------

export async function getProducts(
  options: { category?: string; limit?: number } = {}
): Promise<Product[]> {
  if (!isSupabaseConfigured()) {
    const snapshot = await loadSnapshot()
    const bySlug = new Map(snapshotCategories(snapshot).map((c) => [c.slug, c]))

    let products = snapshot.products
      .filter((p) => p.isVisible)
      .map((p) => toProduct(p, bySlug))
      .sort((a, b) => a.name.localeCompare(b.name))

    if (options.category && options.category !== ALL_PRODUCTS) {
      products = products.filter((p) =>
        p.categories?.some((c) => c.slug === options.category)
      )
    }

    return options.limit ? products.slice(0, options.limit) : products
  }

  const db = await createClient()

  // Filtering by category goes through the join table, so it needs an inner
  // join — a plain select would return every product with an empty array.
  let query = options.category
    ? db
        .from('products')
        .select(`${PRODUCT_FIELDS}, product_categories!inner (categories!inner (slug))`)
        .eq('product_categories.categories.slug', options.category)
    : db.from('products').select(PRODUCT_FIELDS)

  query = query.eq('active', true).order('name')
  if (options.limit) query = query.limit(options.limit)

  const { data, error } = await query
  if (error) throw new Error(`Failed to load products: ${error.message}`)

  return (data ?? []) as unknown as Product[]
}

export async function getProduct(slug: string): Promise<Product | null> {
  if (!isSupabaseConfigured()) {
    const snapshot = await loadSnapshot()
    const bySlug = new Map(snapshotCategories(snapshot).map((c) => [c.slug, c]))
    const match = snapshot.products.find((p) => p.slug === slug && p.isVisible)
    return match ? toProduct(match, bySlug) : null
  }

  const db = await createClient()

  const { data, error } = await db
    .from('products')
    .select(`${PRODUCT_FIELDS}, product_categories (categories (id, slug, name, position))`)
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle()

  if (error) throw new Error(`Failed to load product ${slug}: ${error.message}`)
  return (data as unknown as Product) ?? null
}

export async function getCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured()) {
    const snapshot = await loadSnapshot()
    return snapshotCategories(snapshot)
  }

  const db = await createClient()

  const { data, error } = await db
    .from('categories')
    .select('id, slug, name, position')
    .eq('visible', true)
    .order('position')

  if (error) throw new Error(`Failed to load categories: ${error.message}`)

  return (data ?? []).filter((c) => c.slug !== ALL_PRODUCTS) as Category[]
}
