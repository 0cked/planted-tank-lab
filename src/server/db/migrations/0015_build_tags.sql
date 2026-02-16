create table if not exists public.build_tags (
  build_id uuid not null references public.builds(id) on delete cascade,
  tag_slug varchar(40) not null,
  created_at timestamp with time zone not null default now(),
  primary key (build_id, tag_slug),
  constraint build_tags_slug_check check (
    tag_slug in (
      'iwagumi',
      'dutch',
      'nature',
      'jungle',
      'nano',
      'low-tech',
      'high-tech',
      'shrimp',
      'paludarium'
    )
  )
);
--> statement-breakpoint
create index if not exists idx_build_tags_build on public.build_tags (build_id);
--> statement-breakpoint
create index if not exists idx_build_tags_tag on public.build_tags (tag_slug);
--> statement-breakpoint
alter table if exists public.build_tags enable row level security;
