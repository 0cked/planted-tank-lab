create table if not exists public.build_votes (
  build_id uuid not null references public.builds(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  primary key (build_id, user_id)
);
--> statement-breakpoint
create index if not exists idx_build_votes_build on public.build_votes (build_id);
--> statement-breakpoint
create index if not exists idx_build_votes_user on public.build_votes (user_id);
