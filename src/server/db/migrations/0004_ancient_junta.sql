ALTER TABLE "retailers" ADD COLUMN "logo_asset_path" varchar(500);--> statement-breakpoint
ALTER TABLE "retailers" ADD COLUMN "priority" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "retailers" ADD COLUMN "affiliate_tag_param" varchar(50) DEFAULT 'tag' NOT NULL;--> statement-breakpoint
ALTER TABLE "retailers" ADD COLUMN "affiliate_deeplink_template" varchar(1500);--> statement-breakpoint
ALTER TABLE "retailers" ADD COLUMN "allowed_hosts" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "retailers" ADD COLUMN "meta" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_retailers_priority" ON "retailers" USING btree ("priority");