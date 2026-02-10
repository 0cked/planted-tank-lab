import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  decimal,
  index,
  integer,
  jsonb,
  primaryKey,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// NOTE: This schema is based on `PLAN.md` Section 3.3 and project conventions in `AGENTS.md`.

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 300 }).notNull(),
    displayName: varchar("display_name", { length: 100 }),
    avatarUrl: varchar("avatar_url", { length: 500 }),
    authProvider: varchar("auth_provider", { length: 50 })
      .notNull()
      .default("email"),
    authProviderId: varchar("auth_provider_id", { length: 300 }),
    role: varchar("role", { length: 20 }).notNull().default("user"),
    preferences: jsonb("preferences").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)],
);

// NextAuth adapter tables (we reuse `users` for the core user record).
export const authAccounts = pgTable(
  "auth_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).notNull(),
    provider: varchar("provider", { length: 50 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 300 }).notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: varchar("token_type", { length: 50 }),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_auth_accounts_user").on(t.userId),
    uniqueIndex("auth_accounts_provider_provider_account_id_unique").on(
      t.provider,
      t.providerAccountId,
    ),
  ],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionToken: varchar("session_token", { length: 300 }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_auth_sessions_user").on(t.userId),
    uniqueIndex("auth_sessions_session_token_unique").on(t.sessionToken),
  ],
);

export const authVerificationTokens = pgTable(
  "auth_verification_tokens",
  {
    identifier: varchar("identifier", { length: 300 }).notNull(),
    token: varchar("token", { length: 300 }).notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.identifier, t.token] }),
    uniqueIndex("auth_verification_tokens_token_unique").on(t.token),
  ],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 50 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    displayOrder: integer("display_order").notNull(),
    icon: varchar("icon", { length: 50 }),
    builderRequired: boolean("builder_required").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("categories_slug_unique").on(t.slug)],
);

export const brands = pgTable(
  "brands",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    websiteUrl: varchar("website_url", { length: 500 }),
    logoUrl: varchar("logo_url", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("brands_slug_unique").on(t.slug)],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    brandId: uuid("brand_id").references(() => brands.id),
    name: varchar("name", { length: 500 }).notNull(),
    slug: varchar("slug", { length: 500 }).notNull(),
    description: text("description"),
    imageUrl: varchar("image_url", { length: 500 }),
    imageUrls: jsonb("image_urls").notNull().default([]),
    specs: jsonb("specs").notNull().default({}),
    meta: jsonb("meta").notNull().default({}),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    source: varchar("source", { length: 50 }),
    verified: boolean("verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_products_category").on(t.categoryId),
    uniqueIndex("products_slug_unique").on(t.slug),
    // GIN index for JSONB specs (parametric filters).
    index("idx_products_specs").using("gin", t.specs),
  ],
);

export const specDefinitions = pgTable(
  "spec_definitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    key: varchar("key", { length: 100 }).notNull(),
    label: varchar("label", { length: 200 }).notNull(),
    dataType: varchar("data_type", { length: 20 }).notNull(),
    unit: varchar("unit", { length: 50 }),
    enumValues: jsonb("enum_values"),
    filterable: boolean("filterable").notNull().default(false),
    filterType: varchar("filter_type", { length: 20 }),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("spec_definitions_category_key_unique").on(t.categoryId, t.key),
  ],
);

export const retailers = pgTable(
  "retailers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    websiteUrl: varchar("website_url", { length: 500 }),
    logoUrl: varchar("logo_url", { length: 500 }),
    // Prefer `logoAssetPath` for consistent rendering (hosted in `public/`).
    // `logoUrl` is allowed for hotlinked logos until we move assets to storage.
    logoAssetPath: varchar("logo_asset_path", { length: 500 }),
    priority: integer("priority").notNull().default(0),

    // Affiliate config:
    // - If `offers.affiliate_url` is present, that always wins.
    // - Else if `affiliateDeeplinkTemplate` is present, we build a deeplink by substituting `{url}`.
    // - Else if `affiliateTag` is present, we append `affiliateTagParam` as a query param.
    affiliateNetwork: varchar("affiliate_network", { length: 100 }),
    affiliateTag: varchar("affiliate_tag", { length: 200 }),
    affiliateTagParam: varchar("affiliate_tag_param", { length: 50 })
      .notNull()
      .default("tag"),
    affiliateDeeplinkTemplate: varchar("affiliate_deeplink_template", {
      length: 1500,
    }),

    // Used later for redirect allow-listing; stored now so we can seed safely.
    allowedHosts: jsonb("allowed_hosts").notNull().default([]),
    meta: jsonb("meta").notNull().default({}),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("retailers_slug_unique").on(t.slug),
    index("idx_retailers_priority").on(t.priority),
  ],
);

export const offers = pgTable(
  "offers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    retailerId: uuid("retailer_id")
      .notNull()
      .references(() => retailers.id),
    priceCents: integer("price_cents"),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    url: varchar("url", { length: 1000 }).notNull(),
    affiliateUrl: varchar("affiliate_url", { length: 1500 }),
    inStock: boolean("in_stock").notNull().default(true),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("idx_offers_product").on(t.productId)],
);

export const offerClicks = pgTable(
  "offer_clicks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    offerId: uuid("offer_id")
      .notNull()
      .references(() => offers.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    retailerId: uuid("retailer_id")
      .notNull()
      .references(() => retailers.id, { onDelete: "cascade" }),

    ipHash: varchar("ip_hash", { length: 64 }),
    userAgent: varchar("user_agent", { length: 500 }),
    referer: varchar("referer", { length: 1000 }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_offer_clicks_offer").on(t.offerId, t.createdAt),
    index("idx_offer_clicks_product").on(t.productId, t.createdAt),
    index("idx_offer_clicks_offer_ip").on(t.offerId, t.ipHash, t.createdAt),
    index("idx_offer_clicks_ip").on(t.ipHash, t.createdAt),
  ],
);


export const priceHistory = pgTable(
  "price_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    offerId: uuid("offer_id")
      .notNull()
      .references(() => offers.id),
    priceCents: integer("price_cents").notNull(),
    inStock: boolean("in_stock").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("idx_price_history_offer").on(t.offerId, t.recordedAt)],
);

export const plants = pgTable(
  "plants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    commonName: varchar("common_name", { length: 300 }).notNull(),
    scientificName: varchar("scientific_name", { length: 300 }),
    slug: varchar("slug", { length: 300 }).notNull(),
    family: varchar("family", { length: 200 }),
    description: text("description"),
    imageUrl: varchar("image_url", { length: 500 }),
    imageUrls: jsonb("image_urls").notNull().default([]),
    sources: jsonb("sources").notNull().default([]),

    difficulty: varchar("difficulty", { length: 20 }).notNull(),
    lightDemand: varchar("light_demand", { length: 20 }).notNull(),
    co2Demand: varchar("co2_demand", { length: 20 }).notNull(),
    growthRate: varchar("growth_rate", { length: 20 }),
    placement: varchar("placement", { length: 30 }).notNull(),

    tempMinF: decimal("temp_min_f", { precision: 5, scale: 1 }),
    tempMaxF: decimal("temp_max_f", { precision: 5, scale: 1 }),
    phMin: decimal("ph_min", { precision: 3, scale: 1 }),
    phMax: decimal("ph_max", { precision: 3, scale: 1 }),
    ghMin: integer("gh_min"),
    ghMax: integer("gh_max"),
    khMin: integer("kh_min"),
    khMax: integer("kh_max"),

    maxHeightIn: decimal("max_height_in", { precision: 5, scale: 1 }),
    propagation: varchar("propagation", { length: 200 }),
    substrateType: varchar("substrate_type", { length: 30 }),
    shrimpSafe: boolean("shrimp_safe").notNull().default(true),
    beginnerFriendly: boolean("beginner_friendly").notNull().default(false),

    nativeRegion: varchar("native_region", { length: 200 }),
    notes: text("notes"),
    verified: boolean("verified").notNull().default(false),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("plants_slug_unique").on(t.slug),
    index("idx_plants_difficulty").on(t.difficulty),
    index("idx_plants_light").on(t.lightDemand),
    index("idx_plants_placement").on(t.placement),
  ],
);

export const builds = pgTable(
  "builds",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id),
    name: varchar("name", { length: 300 }).notNull().default("Untitled Build"),
    description: text("description"),
    shareSlug: varchar("share_slug", { length: 20 }),
    style: varchar("style", { length: 50 }),
    isPublic: boolean("is_public").notNull().default(false),
    isCompleted: boolean("is_completed").notNull().default(false),
    coverImageUrl: varchar("cover_image_url", { length: 500 }),
    flags: jsonb("flags").notNull().default({}),

    totalPriceCents: integer("total_price_cents").notNull().default(0),
    itemCount: integer("item_count").notNull().default(0),
    compatibilityScore: integer("compatibility_score"),
    warningsCount: integer("warnings_count").notNull().default(0),
    errorsCount: integer("errors_count").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("builds_share_slug_unique").on(t.shareSlug)],
);

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    buildId: uuid("build_id").references(() => builds.id, { onDelete: "set null" }),
    meta: jsonb("meta").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_analytics_events_name_created").on(t.name, t.createdAt),
    index("idx_analytics_events_user_created").on(t.userId, t.createdAt),
  ],
);

export const compatibilityRules = pgTable(
  "compatibility_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 20 }).notNull(),
    name: varchar("name", { length: 300 }).notNull(),
    description: text("description"),
    severity: varchar("severity", { length: 20 }).notNull(),
    categoriesInvolved: varchar("categories_involved", { length: 50 })
      .array()
      .notNull(),
    conditionLogic: jsonb("condition_logic").notNull(),
    messageTemplate: text("message_template").notNull(),
    fixSuggestion: text("fix_suggestion"),
    active: boolean("active").notNull().default(true),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("compatibility_rules_code_unique").on(t.code)],
);

export const buildItems = pgTable(
  "build_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    buildId: uuid("build_id")
      .notNull()
      .references(() => builds.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    productId: uuid("product_id").references(() => products.id),
    plantId: uuid("plant_id").references(() => plants.id),
    quantity: integer("quantity").notNull().default(1),
    notes: varchar("notes", { length: 500 }),
    selectedOfferId: uuid("selected_offer_id").references(() => offers.id),
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_build_items_build").on(t.buildId),
    check(
      "build_items_product_xor_plant",
      sql`(
        (${t.productId} is not null and ${t.plantId} is null)
        or
        (${t.productId} is null and ${t.plantId} is not null)
      )`,
    ),
  ],
);

export const buildEvaluations = pgTable(
  "build_evaluations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    buildId: uuid("build_id")
      .notNull()
      .references(() => builds.id, { onDelete: "cascade" }),
    ruleId: uuid("rule_id").references(() => compatibilityRules.id),
    severity: varchar("severity", { length: 20 }).notNull(),
    message: text("message").notNull(),
    triggeredItems: jsonb("triggered_items"),
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const buildReports = pgTable(
  "build_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    buildId: uuid("build_id")
      .notNull()
      .references(() => builds.id, { onDelete: "cascade" }),
    reporterUserId: uuid("reporter_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reason: text("reason"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedByUserId: uuid("resolved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    resolution: varchar("resolution", { length: 20 }),
    resolutionNote: text("resolution_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_build_reports_build").on(t.buildId),
    index("idx_build_reports_open").on(t.resolvedAt, t.createdAt),
  ],
);

export const problemReports = pgTable(
  "problem_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    targetType: varchar("target_type", { length: 50 }).notNull(),
    targetId: uuid("target_id"),
    targetUrl: varchar("target_url", { length: 1200 }),
    message: text("message").notNull(),
    contactEmail: varchar("contact_email", { length: 300 }),
    reporterUserId: uuid("reporter_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedByUserId: uuid("resolved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    resolution: varchar("resolution", { length: 20 }),
    resolutionNote: text("resolution_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_problem_reports_open").on(t.resolvedAt, t.createdAt),
    index("idx_problem_reports_target").on(t.targetType, t.targetId, t.createdAt),
  ],
);

export const adminLogs = pgTable(
  "admin_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 80 }).notNull(),
    targetType: varchar("target_type", { length: 50 }).notNull(),
    targetId: varchar("target_id", { length: 80 }),
    meta: jsonb("meta").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_admin_logs_created").on(t.createdAt),
    index("idx_admin_logs_actor").on(t.actorUserId, t.createdAt),
    index("idx_admin_logs_target").on(t.targetType, t.targetId, t.createdAt),
  ],
);

export const userFavorites = pgTable(
  "user_favorites",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id),
    plantId: uuid("plant_id").references(() => plants.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("user_favorites_user_product_unique").on(t.userId, t.productId),
    uniqueIndex("user_favorites_user_plant_unique").on(t.userId, t.plantId),
    check(
      "user_favorites_product_xor_plant",
      sql`(
        (${t.productId} is not null and ${t.plantId} is null)
        or
        (${t.productId} is null and ${t.plantId} is not null)
      )`,
    ),
  ],
);
