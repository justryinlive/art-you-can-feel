import { createClient } from '@/lib/supabase/server'

/**
 * Read access to the migrated Art You Can Feel catalog.
 *
 * These run through the anon key, so RLS applies: only rows the storefront
 * policies expose (active products and their media) are ever returned.
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

const PRODUCT_FIELDS = `
  id, slug, name, sku, description_text, description_html,
  price_cents, compare_at_price_cents, currency, in_stock, ribbon,
  stripe_price_id,
  product_media (kind, position, public_url, thumb_url, width, height, alt_text)
`

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

export async function getProducts(options: { category?: string; limit?: number } = {}) {
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

export async function getProduct(slug: string) {
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

export async function getCategories() {
  const db = await createClient()

  const { data, error } = await db
    .from('categories')
    .select('id, slug, name, position')
    .eq('visible', true)
    .order('position')

  if (error) throw new Error(`Failed to load categories: ${error.message}`)

  // "All Products" is Wix's implicit catch-all and carries no memberships —
  // the storefront lists everything by default instead.
  return (data ?? []).filter((c) => c.slug !== 'all-products') as Category[]
}
