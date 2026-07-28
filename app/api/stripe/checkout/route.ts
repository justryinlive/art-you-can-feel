import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Creates a Stripe Checkout Session from a cart of product slugs.
 *
 * POST /api/stripe/checkout
 *   { "items": [{ "slug": "lion", "quantity": 1 }] }
 *
 * Prices are looked up in Supabase and never read from the request body — a
 * client that posts its own amount would otherwise be setting its own price.
 * The body carries slugs and quantities only.
 */

type CartItem = { slug: string; quantity?: number }

const MAX_QUANTITY = 20

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL

    const body = await req.json().catch(() => null)
    const items: CartItem[] = Array.isArray(body?.items) ? body.items : []

    if (items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    const slugs = [...new Set(items.map((i) => i.slug).filter(Boolean))]
    if (slugs.length === 0) {
      return NextResponse.json({ error: 'No valid items in cart' }, { status: 400 })
    }

    // Service role: this is a trusted server-side price lookup, and it must see
    // stock state regardless of the storefront's read policies.
    const db = createAdminClient()
    const { data: products, error } = await db
      .from('products')
      .select('id, slug, name, price_cents, currency, in_stock, active, stripe_price_id')
      .in('slug', slugs)
      .eq('active', true)

    if (error) throw new Error(error.message)

    const bySlug = new Map(products?.map((p) => [p.slug, p]) ?? [])

    const line_items = []
    for (const item of items) {
      const product = bySlug.get(item.slug)
      if (!product) {
        return NextResponse.json(
          { error: `Product not available: ${item.slug}` },
          { status: 400 }
        )
      }
      if (!product.in_stock) {
        return NextResponse.json(
          { error: `${product.name} is sold out` },
          { status: 409 }
        )
      }

      const quantity = Math.min(Math.max(Math.floor(item.quantity ?? 1), 1), MAX_QUANTITY)

      // Prefer the synced Stripe Price so dashboard reporting ties back to a
      // real catalog entry; fall back to inline price_data if sync-stripe.mjs
      // has not run yet.
      line_items.push(
        product.stripe_price_id
          ? { price: product.stripe_price_id, quantity }
          : {
              price_data: {
                currency: (product.currency ?? 'usd').toLowerCase(),
                product_data: { name: product.name },
                unit_amount: product.price_cents,
              },
              quantity,
            }
      )
    }

    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
      // Lets the webhook rebuild the order without trusting the client.
      metadata: {
        slugs: slugs.join(','),
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
