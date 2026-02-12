alter table if exists public.builds
  add column if not exists tank_id uuid references public.products(id) on delete set null;
--> statement-breakpoint
alter table if exists public.builds
  add column if not exists canvas_state jsonb not null default '{}'::jsonb;
--> statement-breakpoint
create index if not exists idx_builds_tank on public.builds (tank_id);
