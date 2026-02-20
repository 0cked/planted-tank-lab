create table if not exists "build_versions" (
  "build_id" uuid not null references "builds"("id") on delete cascade,
  "version_number" integer not null,
  "canvas_state" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now(),
  primary key ("build_id", "version_number")
);

create index if not exists "idx_build_versions_build"
  on "build_versions" ("build_id");

create index if not exists "idx_build_versions_build_version"
  on "build_versions" ("build_id", "version_number");
