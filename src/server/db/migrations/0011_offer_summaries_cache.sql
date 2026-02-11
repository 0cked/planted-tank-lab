CREATE TABLE "offer_summaries" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"min_price_cents" integer,
	"in_stock_count" integer DEFAULT 0 NOT NULL,
	"stale_flag" boolean DEFAULT true NOT NULL,
	"checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "offer_summaries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "offer_summaries" ADD CONSTRAINT "offer_summaries_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_offer_summaries_stale_checked" ON "offer_summaries" USING btree ("stale_flag","checked_at");