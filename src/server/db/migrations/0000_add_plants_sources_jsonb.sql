CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"website_url" varchar(500),
	"logo_url" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "build_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"build_id" uuid NOT NULL,
	"rule_id" uuid,
	"severity" varchar(20) NOT NULL,
	"message" text NOT NULL,
	"triggered_items" jsonb,
	"evaluated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "build_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"build_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"product_id" uuid,
	"plant_id" uuid,
	"quantity" integer DEFAULT 1 NOT NULL,
	"notes" varchar(500),
	"selected_offer_id" uuid,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "build_items_product_xor_plant" CHECK ((
        ("build_items"."product_id" is not null and "build_items"."plant_id" is null)
        or
        ("build_items"."product_id" is null and "build_items"."plant_id" is not null)
      ))
);
--> statement-breakpoint
CREATE TABLE "builds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" varchar(300) DEFAULT 'Untitled Build' NOT NULL,
	"description" text,
	"share_slug" varchar(20),
	"style" varchar(50),
	"is_public" boolean DEFAULT false NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"cover_image_url" varchar(500),
	"total_price_cents" integer DEFAULT 0 NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"compatibility_score" integer,
	"warnings_count" integer DEFAULT 0 NOT NULL,
	"errors_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_order" integer NOT NULL,
	"icon" varchar(50),
	"builder_required" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compatibility_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(300) NOT NULL,
	"description" text,
	"severity" varchar(20) NOT NULL,
	"categories_involved" varchar(50)[] NOT NULL,
	"condition_logic" jsonb NOT NULL,
	"message_template" text NOT NULL,
	"fix_suggestion" text,
	"active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offer_clicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"retailer_id" uuid NOT NULL,
	"ip_hash" varchar(64),
	"user_agent" varchar(500),
	"referer" varchar(1000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"retailer_id" uuid NOT NULL,
	"price_cents" integer,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"url" varchar(1000) NOT NULL,
	"affiliate_url" varchar(1500),
	"in_stock" boolean DEFAULT true NOT NULL,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"common_name" varchar(300) NOT NULL,
	"scientific_name" varchar(300),
	"slug" varchar(300) NOT NULL,
	"family" varchar(200),
	"description" text,
	"image_url" varchar(500),
	"image_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"difficulty" varchar(20) NOT NULL,
	"light_demand" varchar(20) NOT NULL,
	"co2_demand" varchar(20) NOT NULL,
	"growth_rate" varchar(20),
	"placement" varchar(30) NOT NULL,
	"temp_min_f" numeric(5, 1),
	"temp_max_f" numeric(5, 1),
	"ph_min" numeric(3, 1),
	"ph_max" numeric(3, 1),
	"gh_min" integer,
	"gh_max" integer,
	"kh_min" integer,
	"kh_max" integer,
	"max_height_in" numeric(5, 1),
	"propagation" varchar(200),
	"substrate_type" varchar(30),
	"shrimp_safe" boolean DEFAULT true NOT NULL,
	"beginner_friendly" boolean DEFAULT false NOT NULL,
	"native_region" varchar(200),
	"notes" text,
	"verified" boolean DEFAULT false NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"price_cents" integer NOT NULL,
	"in_stock" boolean NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"brand_id" uuid,
	"name" varchar(500) NOT NULL,
	"slug" varchar(500) NOT NULL,
	"description" text,
	"image_url" varchar(500),
	"image_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"specs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"source" varchar(50),
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retailers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"website_url" varchar(500),
	"logo_url" varchar(500),
	"affiliate_network" varchar(100),
	"affiliate_tag" varchar(200),
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spec_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"key" varchar(100) NOT NULL,
	"label" varchar(200) NOT NULL,
	"data_type" varchar(20) NOT NULL,
	"unit" varchar(50),
	"enum_values" jsonb,
	"filterable" boolean DEFAULT false NOT NULL,
	"filter_type" varchar(20),
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_favorites" (
	"user_id" uuid NOT NULL,
	"product_id" uuid,
	"plant_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_favorites_product_xor_plant" CHECK ((
        ("user_favorites"."product_id" is not null and "user_favorites"."plant_id" is null)
        or
        ("user_favorites"."product_id" is null and "user_favorites"."plant_id" is not null)
      ))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(300) NOT NULL,
	"display_name" varchar(100),
	"avatar_url" varchar(500),
	"auth_provider" varchar(50) DEFAULT 'email' NOT NULL,
	"auth_provider_id" varchar(300),
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "build_evaluations" ADD CONSTRAINT "build_evaluations_build_id_builds_id_fk" FOREIGN KEY ("build_id") REFERENCES "public"."builds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "build_evaluations" ADD CONSTRAINT "build_evaluations_rule_id_compatibility_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."compatibility_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "build_items" ADD CONSTRAINT "build_items_build_id_builds_id_fk" FOREIGN KEY ("build_id") REFERENCES "public"."builds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "build_items" ADD CONSTRAINT "build_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "build_items" ADD CONSTRAINT "build_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "build_items" ADD CONSTRAINT "build_items_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "build_items" ADD CONSTRAINT "build_items_selected_offer_id_offers_id_fk" FOREIGN KEY ("selected_offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "builds" ADD CONSTRAINT "builds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_clicks" ADD CONSTRAINT "offer_clicks_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_clicks" ADD CONSTRAINT "offer_clicks_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_clicks" ADD CONSTRAINT "offer_clicks_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."retailers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."retailers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spec_definitions" ADD CONSTRAINT "spec_definitions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "brands_slug_unique" ON "brands" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_build_items_build" ON "build_items" USING btree ("build_id");--> statement-breakpoint
CREATE UNIQUE INDEX "builds_share_slug_unique" ON "builds" USING btree ("share_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_unique" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "compatibility_rules_code_unique" ON "compatibility_rules" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_offer_clicks_offer" ON "offer_clicks" USING btree ("offer_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_offer_clicks_product" ON "offer_clicks" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_offers_product" ON "offers" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plants_slug_unique" ON "plants" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_plants_difficulty" ON "plants" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "idx_plants_light" ON "plants" USING btree ("light_demand");--> statement-breakpoint
CREATE INDEX "idx_plants_placement" ON "plants" USING btree ("placement");--> statement-breakpoint
CREATE INDEX "idx_price_history_offer" ON "price_history" USING btree ("offer_id","recorded_at");--> statement-breakpoint
CREATE INDEX "idx_products_category" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_unique" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_products_specs" ON "products" USING gin ("specs");--> statement-breakpoint
CREATE UNIQUE INDEX "retailers_slug_unique" ON "retailers" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "spec_definitions_category_key_unique" ON "spec_definitions" USING btree ("category_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "user_favorites_user_product_unique" ON "user_favorites" USING btree ("user_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_favorites_user_plant_unique" ON "user_favorites" USING btree ("user_id","plant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");