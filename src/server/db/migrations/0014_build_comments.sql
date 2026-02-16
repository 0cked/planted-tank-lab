create table if not exists public.build_comments (
  id uuid primary key default gen_random_uuid(),
  build_id uuid not null references public.builds(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  parent_id uuid references public.build_comments(id) on delete cascade,
  created_at timestamp with time zone not null default now()
);
--> statement-breakpoint
create index if not exists idx_build_comments_build_created on public.build_comments (build_id, created_at);
--> statement-breakpoint
create index if not exists idx_build_comments_parent_created on public.build_comments (parent_id, created_at);
--> statement-breakpoint
alter table if exists public.build_comments enable row level security;
