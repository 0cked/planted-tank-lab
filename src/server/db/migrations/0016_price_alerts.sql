create table if not exists public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  target_price integer not null check (target_price > 0),
  active boolean not null default true,
  last_notified_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint price_alerts_user_product_unique unique (user_id, product_id)
);
--> statement-breakpoint
create index if not exists idx_price_alerts_user_active on public.price_alerts (user_id, active);
--> statement-breakpoint
create index if not exists idx_price_alerts_product_active on public.price_alerts (product_id, active);
--> statement-breakpoint
create index if not exists idx_price_alerts_check on public.price_alerts (active, last_notified_at);
--> statement-breakpoint
alter table if exists public.price_alerts enable row level security;
