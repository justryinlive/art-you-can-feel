# ecommerce-store

A Next.js 16 (App Router) storefront scaffold, wired for **Supabase** (database + auth),
**Stripe** (payments), and **Vercel** (deployment). The storefront UI itself is not built
yet — this is the project skeleton and service configuration.

## Stack

| Concern     | Choice                                    |
| ----------- | ----------------------------------------- |
| Framework   | Next.js 16 (App Router) + TypeScript      |
| Styling     | Tailwind CSS v4                            |
| Database    | Supabase (Postgres) via `@supabase/ssr`   |
| Payments    | Stripe (`stripe` + `@stripe/stripe-js`)   |
| Hosting     | Vercel                                     |
| Node        | 22.2.0 (see `.nvmrc`) — matches Vercel     |

## Getting started

```bash
nvm use            # picks up .nvmrc (Node 22.2.0)
npm install
cp .env.example .env.local   # then fill in real values
npm run dev                  # http://localhost:3000
```

> Node 18.18+ is required. The system default here is Node 16, so run `nvm use` first.

## Environment variables

All keys live in `.env.example`. Copy it to `.env.local` for development, and add the
same keys in **Vercel → Project Settings → Environment Variables** for deploys.

| Variable                             | Where to find it                              | Exposed to browser? |
| ------------------------------------ | --------------------------------------------- | ------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`           | Supabase → Settings → API                     | Yes                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`      | Supabase → Settings → API                     | Yes                 |
| `SUPABASE_SERVICE_ROLE_KEY`          | Supabase → Settings → API                     | **No — server only**|
| `STRIPE_SECRET_KEY`                  | Stripe → Developers → API keys                | **No — server only**|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → Developers → API keys                | Yes                 |
| `STRIPE_WEBHOOK_SECRET`              | `stripe listen` output, or webhook settings   | **No — server only**|
| `NEXT_PUBLIC_SITE_URL`               | Your site's base URL                          | Yes                 |

## Project layout

```
app/
  api/stripe/checkout/route.ts   Creates a Stripe Checkout Session (stub)
  api/stripe/webhook/route.ts    Verifies + handles Stripe webhook events (stub)
lib/
  supabase/client.ts             Browser Supabase client (anon key)
  supabase/server.ts             Server Supabase client + admin (service-role) client
  stripe.ts                      Server-side Stripe SDK
  stripe-client.ts               Browser Stripe.js loader (publishable key)
  catalog.ts                     Typed reads of the migrated catalog (RLS-safe)
proxy.ts                         Refreshes the Supabase auth session per request (Next 16 "Proxy")
scripts/
  scrape-wix.mjs                 Pulls the catalog off the live Wix site
  fetch-media.mjs                Downloads full-resolution artwork masters
  import-catalog.mjs             Optimizes + uploads media, upserts Supabase rows
  sync-stripe.mjs                Mirrors the catalog into Stripe Products/Prices
  lib/env.mjs                    Reads .env.local for the bare-node scripts
data/wix-catalog.json            Committed catalog snapshot (114 products)
supabase/migrations/             Schema, applied with `npm run db:push`
supabase/config.toml             Supabase CLI config (project link, local stack)
```

## Catalog migration (Wix → Supabase)

The live catalog at artyoucanfeel.com runs on **Wix Stores**. These scripts move
it into Supabase so the store no longer depends on that subscription.

Wix server-renders each page with a warmup-data block containing the exact JSON
its widgets hydrate from, so extraction needs no API key or headless browser.
Product URLs come from `/store-products-sitemap.xml` — the category page only
renders the first 24 of 114 and paginates client-side.

```bash
npm run catalog:scrape    # live site  → data/wix-catalog.json  (committed)
npm run catalog:media     # Wix CDN    → data/media/  (~700 MB, gitignored)
npm run catalog:import    # disk       → Supabase Storage + tables
npm run catalog:stripe    # Supabase   → Stripe Products/Prices
```

Every step is **idempotent**, keyed on the Wix ids, so re-running updates in
place rather than duplicating. That means you can keep selling on Wix and
re-sync until you're ready to cut over.

Useful flags:

```bash
node scripts/import-catalog.mjs --dry-run       # report, change nothing
node scripts/import-catalog.mjs --skip-media    # rows only, no uploads
node scripts/import-catalog.mjs --originals     # also upload the masters
node scripts/import-catalog.mjs --only=lion     # single product
node scripts/sync-stripe.mjs --dry-run
```

Images are re-encoded to WebP at two sizes (2000px display, 600px thumbnail).
That is deliberate: the originals are 5–8 MB each and carry **iPhone EXIF
including GPS coordinates**, which re-encoding strips. Masters stay on disk and
are only uploaded with `--originals`.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Copy the API URL and keys from **Settings → API** into `.env.local`.
3. Apply the schema with the Supabase CLI:

```bash
npx supabase login                        # once per machine, opens a browser
npm run db:link -- --project-ref <ref>    # once per clone; <ref> is the
                                          # subdomain of NEXT_PUBLIC_SUPABASE_URL
npm run db:push                           # applies supabase/migrations/*.sql
```

`db:push` is **not** automatic — nothing applies migrations on `git push`, and
Vercel deploys only run `next build`. Run it yourself whenever a migration
lands. `npm run db:status` shows which migrations the remote has already
applied; `npm run db:new <name>` scaffolds the next one.

The login token lands in `~/.supabase`, and the linked project ref in
`supabase/.temp/` — both outside the repo, so neither is committed. `db:link`
also prompts for the database password (**Settings → Database**); that is a
different secret from the API keys and is not stored in `.env.local`.

The migration creates the `product-media` storage bucket, all catalog tables,
and RLS policies. Note that **no table has an insert/update/delete policy** —
the anon key can only read. Every write goes through the service role key from
the scripts and server routes.

## Stripe setup

1. Create an account and grab **test-mode** API keys (Developers → API keys).
2. Test webhooks locally with the Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Copy the printed `whsec_…` secret into `STRIPE_WEBHOOK_SECRET`.
3. In production, add `https://your-domain/api/stripe/webhook` as a webhook endpoint
   in the Stripe Dashboard and use that endpoint's signing secret.

## Deploy to Vercel

1. Push this repo to GitHub/GitLab/Bitbucket.
2. Import it at [vercel.com/new](https://vercel.com/new) — Next.js is auto-detected.
3. Add every variable from the table above under **Environment Variables**.
4. Deploy. Then set `NEXT_PUBLIC_SITE_URL` to the production URL and add the
   production Stripe webhook endpoint.

## Next steps (building the store)

- [x] Catalog migrated off Wix (114 products, 11 categories, 133 media items)
- [x] Checkout builds `line_items` from server-side Supabase price lookups
- [ ] Product listing + detail pages (use `lib/catalog.ts`)
- [ ] Cart (client state) posting `{ slug, quantity }` to the checkout route
- [ ] Persist orders + `order_items` in the `checkout.session.completed` handler
- [ ] Supabase Auth (sign in / account / order history)
- [ ] Replace the placeholder artwork on the landing page with real products
