-- Security hardening for Supabase-hosted Postgres:
-- Supabase exposes schemas like `public` through PostgREST. We do not use the
-- PostgREST API for app data access (we query Postgres directly from the web app),
-- so enable RLS on all application tables to prevent accidental public exposure
-- if anon/authenticated roles have broad grants.

-- Use IF EXISTS to make this migration resilient if a dev/prod DB is missing a
-- table due to a partial migration history.
alter table if exists public.admin_logs enable row level security;
alter table if exists public.analytics_events enable row level security;
alter table if exists public.auth_accounts enable row level security;
alter table if exists public.auth_sessions enable row level security;
alter table if exists public.auth_verification_tokens enable row level security;
alter table if exists public.brands enable row level security;
alter table if exists public.build_evaluations enable row level security;
alter table if exists public.build_items enable row level security;
alter table if exists public.build_reports enable row level security;
alter table if exists public.builds enable row level security;
alter table if exists public.canonical_entity_mappings enable row level security;
alter table if exists public.categories enable row level security;
alter table if exists public.compatibility_rules enable row level security;
alter table if exists public.ingestion_entities enable row level security;
alter table if exists public.ingestion_entity_snapshots enable row level security;
alter table if exists public.ingestion_jobs enable row level security;
alter table if exists public.ingestion_runs enable row level security;
alter table if exists public.ingestion_sources enable row level security;
alter table if exists public.normalization_overrides enable row level security;
alter table if exists public.offer_clicks enable row level security;
alter table if exists public.offers enable row level security;
alter table if exists public.plants enable row level security;
alter table if exists public.price_history enable row level security;
alter table if exists public.problem_reports enable row level security;
alter table if exists public.products enable row level security;
alter table if exists public.retailers enable row level security;
alter table if exists public.spec_definitions enable row level security;
alter table if exists public.user_favorites enable row level security;
alter table if exists public.users enable row level security;
