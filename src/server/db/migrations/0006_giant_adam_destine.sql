CREATE TABLE "admin_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"action" varchar(80) NOT NULL,
	"target_type" varchar(50) NOT NULL,
	"target_id" varchar(80),
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "build_reports" ADD COLUMN "resolved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "build_reports" ADD COLUMN "resolved_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "build_reports" ADD COLUMN "resolution" varchar(20);--> statement-breakpoint
ALTER TABLE "build_reports" ADD COLUMN "resolution_note" text;--> statement-breakpoint
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_admin_logs_created" ON "admin_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_admin_logs_actor" ON "admin_logs" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_admin_logs_target" ON "admin_logs" USING btree ("target_type","target_id","created_at");--> statement-breakpoint
ALTER TABLE "build_reports" ADD CONSTRAINT "build_reports_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_build_reports_open" ON "build_reports" USING btree ("resolved_at","created_at");