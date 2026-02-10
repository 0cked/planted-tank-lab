CREATE TABLE "canonical_entity_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"canonical_type" varchar(30) NOT NULL,
	"canonical_id" uuid NOT NULL,
	"match_method" varchar(50) NOT NULL,
	"confidence" integer DEFAULT 100 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"entity_type" varchar(30) NOT NULL,
	"source_entity_id" varchar(200) NOT NULL,
	"url" varchar(1500),
	"active" boolean DEFAULT true NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_entity_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"run_id" uuid,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"http_status" integer,
	"content_type" varchar(200),
	"raw_text" text,
	"raw_json" jsonb,
	"extracted" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"trust" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" varchar(80) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"idempotency_key" varchar(200),
	"priority" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"run_after" timestamp with time zone DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" varchar(80),
	"last_error" text,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"status" varchar(20) NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"stats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(80) NOT NULL,
	"name" varchar(200) NOT NULL,
	"kind" varchar(50) NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"schedule_every_minutes" integer,
	"active" boolean DEFAULT true NOT NULL,
	"default_trust" varchar(30) DEFAULT 'unknown' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "normalization_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_type" varchar(30) NOT NULL,
	"canonical_id" uuid NOT NULL,
	"field_path" varchar(200) NOT NULL,
	"value" jsonb NOT NULL,
	"reason" text,
	"actor_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "canonical_entity_mappings" ADD CONSTRAINT "canonical_entity_mappings_entity_id_ingestion_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."ingestion_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_entities" ADD CONSTRAINT "ingestion_entities_source_id_ingestion_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."ingestion_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_entity_snapshots" ADD CONSTRAINT "ingestion_entity_snapshots_entity_id_ingestion_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."ingestion_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_entity_snapshots" ADD CONSTRAINT "ingestion_entity_snapshots_run_id_ingestion_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ingestion_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_runs" ADD CONSTRAINT "ingestion_runs_source_id_ingestion_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."ingestion_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normalization_overrides" ADD CONSTRAINT "normalization_overrides_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "canonical_entity_mappings_entity_unique" ON "canonical_entity_mappings" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "idx_canonical_entity_mappings_canonical" ON "canonical_entity_mappings" USING btree ("canonical_type","canonical_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ingestion_entities_source_type_entity_unique" ON "ingestion_entities" USING btree ("source_id","entity_type","source_entity_id");--> statement-breakpoint
CREATE INDEX "idx_ingestion_entities_type" ON "ingestion_entities" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "idx_ingestion_entities_active" ON "ingestion_entities" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX "ingestion_entity_snapshots_entity_hash_unique" ON "ingestion_entity_snapshots" USING btree ("entity_id","content_hash");--> statement-breakpoint
CREATE INDEX "idx_ingestion_entity_snapshots_entity_fetched" ON "ingestion_entity_snapshots" USING btree ("entity_id","fetched_at");--> statement-breakpoint
CREATE INDEX "idx_ingestion_entity_snapshots_run" ON "ingestion_entity_snapshots" USING btree ("run_id","fetched_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ingestion_jobs_idempotency_key_unique" ON "ingestion_jobs" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_ingestion_jobs_status_run_after" ON "ingestion_jobs" USING btree ("status","run_after");--> statement-breakpoint
CREATE INDEX "idx_ingestion_jobs_kind_status" ON "ingestion_jobs" USING btree ("kind","status","run_after");--> statement-breakpoint
CREATE INDEX "idx_ingestion_runs_source_started" ON "ingestion_runs" USING btree ("source_id","started_at");--> statement-breakpoint
CREATE INDEX "idx_ingestion_runs_status_started" ON "ingestion_runs" USING btree ("status","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ingestion_sources_slug_unique" ON "ingestion_sources" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_ingestion_sources_active" ON "ingestion_sources" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX "normalization_overrides_entity_field_unique" ON "normalization_overrides" USING btree ("canonical_type","canonical_id","field_path");--> statement-breakpoint
CREATE INDEX "idx_normalization_overrides_entity" ON "normalization_overrides" USING btree ("canonical_type","canonical_id");