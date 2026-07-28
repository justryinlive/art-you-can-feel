-- ---------------------------------------------------------------------------
-- Art You Can Feel — catalog schema.
--
-- Run in the Supabase SQL Editor (Dashboard → SQL Editor → New query), or via
-- the Supabase CLI: `supabase db push`.
--
-- Models the catalog migrated off Wix Stores by scripts/scrape-wix.mjs:
-- products, their media, the collections they belong to, and variants.
--
-- Every table has Row Level Security ON. Storefront data is world-readable;
-- all writes go through the service role key (which bypasses RLS) from the
-- import scripts and server-side routes. Never expose that key to the browser.
--
-- Safe to re-run: everything is `if not exists` / `or replace`.
-- ---------------------------------------------------------------------------

-- Keeps updated_at honest without the app having to remember.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Categories ----------------------------------------------------------------
-- The 11 Wix collections (Acrylic Pour, Glow in the Dark, Large, …).
create table if not exists public.categories (
  id             uuid primary key default gen_random_uuid(),
  -- Natural key from Wix. Makes the import idempotent across re-runs.
  wix_id         text not null unique,
  slug           text not null unique,
  name           text not null,
  visible        boolean not null default true,
  parent_wix_id  text,
  position       integer,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Products ------------------------------------------------------------------
create table if not exists public.products (
  id                     uuid primary key default gen_random_uuid(),
  wix_id                 text not null unique,
  slug                   text not null unique,
  name                   text not null,
  sku                    text,

  description_html       text,
  description_text       text,

  -- Money is integer cents throughout, never floats.
  price_cents            integer not null check (price_cents >= 0),
  compare_at_price_cents integer check (compare_at_price_cents >= 0),
  currency               text not null default 'usd',

  in_stock               boolean not null default true,
  inventory_status       text,
  inventory_quantity     integer,

  product_type           text,
  ribbon                 text,
  weight                 numeric,
  brand                  text,

  seo_title              text,
  seo_description        text,

  -- Where this row came from, so provenance survives the migration.
  source_url             text,

  -- Populated by scripts/sync-stripe.mjs.
  stripe_product_id      text unique,
  stripe_price_id        text,

  -- Option definitions (e.g. a Size dropdown). Only 6 products use these and
  -- none currently resolve to multiple priced variants, so they live as jsonb
  -- rather than their own table.
  options                jsonb not null default '[]'::jsonb,

  -- Untouched Wix payload. Lets us recover any field the normalizer skipped
  -- without re-scraping the live site.
  raw                    jsonb,

  active                 boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists products_active_idx   on public.products (active);
create index if not exists products_slug_idx     on public.products (slug);
create index if not exists products_price_idx    on public.products (price_cents);

-- Product media -------------------------------------------------------------
-- One row per photo or video. Files live in the `product-media` storage
-- bucket; `source_url` keeps the original Wix CDN location for provenance.
create table if not exists public.product_media (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id) on delete cascade,
  wix_media_id   text,

  kind           text not null default 'photo' check (kind in ('photo', 'video')),
  position       integer not null default 0,

  -- Web-optimized derivative that the storefront actually renders.
  storage_path   text,
  public_url     text,
  -- Smaller square-ish crop for grids and cards.
  thumb_path     text,
  thumb_url      text,
  -- Full-resolution master, uploaded only when IMPORT_ORIGINALS=1.
  original_path  text,
  original_url   text,

  width          integer,
  height         integer,
  alt_text       text,
  source_url     text,

  created_at     timestamptz not null default now(),

  unique (product_id, wix_media_id)
);

create index if not exists product_media_product_idx
  on public.product_media (product_id, position);

-- Product ↔ category --------------------------------------------------------
create table if not exists public.product_categories (
  product_id  uuid not null references public.products (id)   on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  primary key (product_id, category_id)
);

create index if not exists product_categories_category_idx
  on public.product_categories (category_id);

-- Variants ------------------------------------------------------------------
-- Wix always emits at least one product item, even for single-variant goods.
create table if not exists public.product_variants (
  id                     uuid primary key default gen_random_uuid(),
  product_id             uuid not null references public.products (id) on delete cascade,
  wix_id                 text,
  sku                    text,
  price_cents            integer check (price_cents >= 0),
  compare_at_price_cents integer check (compare_at_price_cents >= 0),
  in_stock               boolean not null default true,
  quantity               integer,
  weight                 numeric,
  -- The selected option values for this variant, e.g. {"Size": "Large"}.
  options                jsonb not null default '{}'::jsonb,
  stripe_price_id        text,
  created_at             timestamptz not null default now(),

  unique (product_id, wix_id)
);

create index if not exists product_variants_product_idx
  on public.product_variants (product_id);

-- Orders --------------------------------------------------------------------
create table if not exists public.orders (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users (id),
  stripe_session_id   text unique,
  status              text not null default 'pending', -- pending | paid | fulfilled | cancelled
  amount_total_cents  integer,
  currency            text default 'usd',
  email               text,
  created_at          timestamptz not null default now()
);

-- Line items, captured at purchase time so historical orders keep their prices
-- even if the product is later repriced or deleted.
create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  product_id    uuid references public.products (id) on delete set null,
  name_snapshot text not null,
  price_cents   integer not null check (price_cents >= 0),
  quantity      integer not null default 1 check (quantity > 0),
  created_at    timestamptz not null default now()
);

create index if not exists order_items_order_idx on public.order_items (order_id);

-- Triggers ------------------------------------------------------------------
drop trigger if exists categories_touch on public.categories;
create trigger categories_touch before update on public.categories
  for each row execute function public.touch_updated_at();

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- Row Level Security --------------------------------------------------------
alter table public.categories         enable row level security;
alter table public.products           enable row level security;
alter table public.product_media      enable row level security;
alter table public.product_categories enable row level security;
alter table public.product_variants   enable row level security;
alter table public.orders             enable row level security;
alter table public.order_items        enable row level security;

-- Storefront reads. No insert/update/delete policies exist anywhere below,
-- so the anon key can only ever read — writes require the service role.
drop policy if exists "Categories are public" on public.categories;
create policy "Categories are public"
  on public.categories for select using (visible = true);

drop policy if exists "Active products are public" on public.products;
create policy "Active products are public"
  on public.products for select using (active = true);

-- Media, category links, and variants are readable only for products that are
-- themselves publicly visible.
drop policy if exists "Media of active products is public" on public.product_media;
create policy "Media of active products is public"
  on public.product_media for select using (
    exists (select 1 from public.products p where p.id = product_id and p.active)
  );

drop policy if exists "Category links of active products are public" on public.product_categories;
create policy "Category links of active products are public"
  on public.product_categories for select using (
    exists (select 1 from public.products p where p.id = product_id and p.active)
  );

drop policy if exists "Variants of active products are public" on public.product_variants;
create policy "Variants of active products are public"
  on public.product_variants for select using (
    exists (select 1 from public.products p where p.id = product_id and p.active)
  );

-- A signed-in user may read only their own orders.
drop policy if exists "Users can view their own orders" on public.orders;
create policy "Users can view their own orders"
  on public.orders for select using (auth.uid() = user_id);

drop policy if exists "Users can view their own order items" on public.order_items;
create policy "Users can view their own order items"
  on public.order_items for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

-- Storage -------------------------------------------------------------------
-- Public bucket for artwork. Uploads happen server-side with the service role.
insert into storage.buckets (id, name, public)
values ('product-media', 'product-media', true)
on conflict (id) do nothing;

drop policy if exists "Product media is publicly readable" on storage.objects;
create policy "Product media is publicly readable"
  on storage.objects for select using (bucket_id = 'product-media');
