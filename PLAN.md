# PlantedTankLab — Complete Product & Technical Plan

> *"The PCPartPicker for Planted Aquariums"*

Note: This file is a product/spec reference. For current execution status and next steps, see `AUTOPILOT.md`.

## Infrastructure & Hosting

- **Domain**: plantedtanklab.com
- **Hosting**: Vercel (auto-deploys from GitHub `main` branch)
- **Database**: Supabase (PostgreSQL, managed). Connection via transaction pooler.
- **DNS**: Cloudflare (DNS-only mode, CNAME → cname.vercel-dns.com)
- **Repo**: github.com/{owner}/planted-tank-lab
- **Credentials**: stored in `.secrets/` directory (gitignored). See `AGENTS.md` for details.
- **Authenticated CLIs**: `vercel`, `gh` (GitHub CLI), `pnpm`

---

## Preamble: PCPartPicker Behavioral Teardown & Domain Mapping

Before defining PlantedTankLab, we must internalize what makes PCPartPicker *work* — not just its features, but its behavioral mechanics — and map each to the planted aquarium domain.

### PCPartPicker Behaviors → PlantedTankLab Equivalents

| # | PCPartPicker Behavior | How It Works | PlantedTankLab Equivalent |
|---|---|---|---|
| 1 | **Guided Builder Flow** | Sequential category selection (CPU → Mobo → RAM → ...) with each step filtering the next | Sequential aquarium build (Tank → Stand → Light → Filter → CO2 → Substrate → Hardscape → Plants → Ferts → Heater → Test Kit) where each choice constrains downstream options |
| 2 | **Compatibility Filtering** | Selecting an Intel CPU hides AMD motherboards; RAM speed filtered by mobo support | Selecting a 5-gallon nano tank filters out oversized canister filters; choosing low-light plants removes high-PAR-only lights from "recommended"; selecting shrimp hides copper-based ferts |
| 3 | **Hard vs. Soft Warnings** | "Incompatible" (red) vs "potential issue" (yellow) — e.g., PSU wattage too low = hard block; no WiFi on mobo = note | "This filter is rated for 50gal but your tank is 10gal — overpowered" (soft warning) vs "This CO2 regulator requires a paintball tank but you selected a standard CGA-320 cylinder" (hard incompatibility) |
| 4 | **Parametric Filtering** | Filter any category by specs (core count, clock speed, price, TDP) with sliders and checkboxes | Filter lights by PAR output, spectrum, tank length, mounting type; filter plants by difficulty, light demand, CO2 requirement, growth rate, placement zone |
| 5 | **Multi-Vendor Price Comparison** | Same product listed across Newegg, Amazon, B&H with price + stock status | Same Fluval 3.0 listed across Amazon, BucePlant, Aquarium Co-Op, Aqua Forest Aquarium with affiliate links |
| 6 | **Price History Charts** | CamelCamelCamel-style price graphs per product | Price trends for popular equipment (lights, CO2 regulators, ADA substrates) |
| 7 | **Saved/Shared Builds** | Permalink URLs, embed codes, forum BBCode for builds | Shareable build links for Reddit r/PlantedTank, aquascaping forums, Discord servers |
| 8 | **Build Totals** | Running price total, wattage estimate, compatibility summary at top of builder | Running price total, tank parameter summary (light level, CO2 status, difficulty score, stocking compatibility) |
| 9 | **"Complete This Build" Nudges** | Empty categories shown with "Choose a ___" prompts; progress indication | "Your build is missing a light source — plants can't grow without one" or "Consider adding a heater — your selected plants prefer 74–78°F" |
| 10 | **User Accounts & Lists** | Save multiple builds, favorites, price alerts, completed build gallery | Save builds, favorite plants/equipment, "My Tank" profiles, build gallery |
| 11 | **Community Completed Builds** | User-submitted builds with photos, descriptions, ratings | User aquascape galleries with photos, plant lists, equipment lists, growth journals |
| 12 | **Guides & Reviews** | Editorial content, build guides for use cases (budget gaming, workstation) | "Best Beginner 10-Gallon Setup," "High-Tech Iwagumi Guide," "Low-Tech Walstad Method" |
| 13 | **Alternatives/Similar Products** | "Users also considered" and "Similar products" | "Other lights for this tank size" or "Similar plants with lower CO2 demand" |
| 14 | **Benchmarks/Ratings** | UserBenchmark integration, specs tables | PAR data, flow rate tests, user reviews, difficulty ratings |
| 15 | **Admin-Curated Data** | Staff-maintained spec database, not user-generated specs | Curated plant database with verified care parameters; equipment specs from manufacturer data |

---

## 1. Product Definition

### What It Is

PlantedTankLab is a web application that guides aquarists through building a complete planted aquarium setup — from tank and stand through lighting, filtration, CO2, substrate, hardscape, plants, fertilizers, and maintenance tools — while enforcing compatibility rules, surfacing best-practice warnings, comparing prices across retailers, and enabling users to save and share their builds. It is the PCPartPicker of planted aquariums: opinionated enough to prevent mistakes, flexible enough for experts, and monetized through affiliate links to aquarium retailers.

### Target Users

| Segment | Description | Primary Need |
|---|---|---|
| **Beginners** | First planted tank, overwhelmed by choices, prone to buying incompatible gear | Guided build with guardrails, clear explanations, budget awareness |
| **Intermediate Hobbyists** | Have 1–2 tanks, upgrading or starting a new build, know basics but not edge cases | Comparison shopping, compatibility validation, build sharing |
| **Advanced Aquascapers** | Contest-level scapers, high-tech setups, specific requirements | Parametric search, plant database, build documentation/portfolio |
| **Retailers / Content Creators** | Shops recommending builds, YouTubers sharing setups | Embeddable build lists, affiliate revenue sharing (future) |
| **Shrimp / Specialty Keepers** | Neocaridina/Caridina breeders, biotope builders | Shrimp-safe filtering, water parameter matching, specialized substrate needs |

### Core User Journeys

**Journey 1: Guided Beginner Build**
Landing page → "Start Your Build" CTA → Select tank size (or "Help me choose") → System suggests compatible stand → Choose light (filtered to tank size, with PAR ratings explained) → Choose filter (flow rate matched to volume) → CO2 decision (yes/no, with explanation) → Substrate recommendation → Plant picker (filtered by light/CO2 compatibility) → Ferts suggestion → Review build summary (total price, compatibility report, parameter overview) → Save build → Share to Reddit → Click affiliate links to purchase

**Journey 2: Expert Build Assembly**
Landing page → Builder → Manually select specific products across all categories (no hand-holding) → See real-time compatibility warnings → Swap alternatives → Compare two lights side-by-side → Finalize → Export as image/link → Post to build gallery

**Journey 3: Plant Discovery**
Landing page → Browse Plants → Filter by difficulty / light / CO2 / placement → View plant detail (care card, compatible equipment, community photos) → "Add to a Build" → Jump into builder with plant pre-selected, system suggests matching equipment

**Journey 4: Price Research**
Search for "Fluval Plant 3.0 36-inch" → See product detail with specs, price comparison across vendors, price history → Add to build or buy directly

**Journey 5: Community Browse**
Landing page → "Community Builds" → Browse by style (Iwagumi, Dutch, jungle, Walstad, nano) → View a completed build → "Clone this Build" → Modify to personal preferences → Save own version

### Success KPIs

| KPI | Target (6 months) | Measurement |
|---|---|---|
| Monthly Active Users | 5,000 | Analytics |
| Builds Created | 10,000 total | DB count |
| Affiliate Click-Through Rate | 8–12% per build view | Link tracking |
| Affiliate Conversion Revenue | $500–2,000/mo | Affiliate dashboards |
| Avg. Products per Build | ≥ 6 | DB average |
| Build Share Rate | 15% of saved builds shared | Share action tracking |
| Return User Rate | 30% monthly | Cohort analysis |

---

## 2. Feature Set & Roadmap

### MVP (Weeks 1–6) — "It Works and It's Useful"

- **Builder page** with sequential category selection (Tank, Light, Filter, Substrate, Plants)
- **Product database** seeded with ~200 curated items across core categories
- **Plant database** with ~100 common species (care requirements, placement, difficulty)
- **Basic compatibility engine** with 15–20 rules (hard + soft)
- **Price display** with affiliate links to 2–3 retailers (Amazon + 1–2 specialty)
- **Build summary** with total price, parameter overview, warning list
- **Shareable build links** (public URLs)
- **Responsive web UI** (mobile-friendly)
- **No auth required** to create a build (cookie/local storage); optional account to save

### V1 (Weeks 7–12) — "It's a Real Product"

- **User accounts** (email + Google OAuth)
- **Save multiple builds**
- **Parametric filters** across all categories (PAR, flow rate, tank dimensions, etc.)
- **Product comparison** (side-by-side for 2–3 items in same category)
- **Expanded compatibility engine** (30+ rules, including shrimp safety, water params)
- **Build completeness indicator** ("Your build is 70% complete — missing: heater, ferts")
- **Community build gallery** (share completed builds with photos)
- **Guides section** (3–5 editorial guides: beginner low-tech, high-tech CO2, nano tank, etc.)
- **Admin panel** for product/rule management
- **Price comparison** across 3–5 retailers
- **SEO-optimized product and plant pages**

### V2 (Months 4–6) — "Power Features"

- **Price history charts**
- **Price drop alerts** (email)
- **"Clone & Modify" builds** from community gallery
- **Aquascape visual planner** (drag-and-drop 2D tank layout for hardscape/plants)
- **Maintenance scheduler** (water change reminders, fert dosing calendar)
- **Tank profile / journal** (track parameters over time, photo timeline)
- **Advanced plant compatibility matrix** (companion planting, allelopathy warnings)
- **Contributor portal** (community product/plant submissions with moderation)
- **Retailer dashboard** (affiliate performance, featured products — future monetization)
- **Mobile app** (PWA or React Native)
- **API** for third-party integrations (forums, YouTube descriptions)

---

## 3. Domain Model & Data Requirements

### 3.1 Item Categories

| Category | Examples | Key Specs |
|---|---|---|
| **Tank** | Rimless, standard, AIO, bowfront | Volume (gal/L), dimensions (L×W×H), material (glass/acrylic), rimless/braced |
| **Stand** | Metal, wood, cabinet | Weight capacity, dimensions, enclosed/open |
| **Light** | LED fixtures, hanging lights | PAR at depth, spectrum (Kelvin), wattage, mounting type, dimmable, tank length range |
| **Filter** | HOB, canister, sponge, AIO | Flow rate (GPH), rated tank volume, filter media type, adjustable flow, inlet/outlet type |
| **CO2 System** | Regulator, diffuser, reactor, DIY | Regulator type (single/dual stage), thread type (CGA-320/paintball), working pressure, solenoid, bubble counter |
| **Substrate** | Active soil, inert gravel, sand | Type (active/inert), nutrient content, buffering (pH lowering?), grain size, color |
| **Hardscape** | Stone, driftwood | Type (seiryu, dragon, ohko, spider wood, manzanita), effect on water params (raises pH/GH?), approximate weight/size |
| **Plants** | Stem, carpet, rosette, moss, floating | Species, difficulty, light demand (low/med/high), CO2 demand (none/beneficial/required), growth rate, placement (foreground/mid/background/floating), temp range, pH range, propagation |
| **Fertilizers** | Liquid (all-in-one, macro, micro), root tabs | Type (liquid/root tab), NPK content, dosing frequency, shrimp-safe, copper content |
| **Heater** | Submersible, inline | Wattage, rated tank volume, adjustable, temp range |
| **Test Kits** | Liquid, strips, electronic | Parameters tested (pH, GH, KH, ammonia, nitrite, nitrate, CO2), type (liquid/strip/digital) |
| **Accessories** | Timers, tubing, tools, thermometers, drop checkers | Varies by sub-type |

### 3.2 Compatibility Rule System

#### Rule Types

| Type | Severity | UX Treatment | Example |
|---|---|---|---|
| **Hard Incompatibility** | 🔴 Error | Red banner, blocks "complete" status, explanation + fix suggestion | "This inline CO2 reactor requires 16mm tubing but your filter uses 12mm outlets" |
| **Soft Warning** | 🟡 Warning | Yellow inline note, doesn't block, explanation + recommendation | "This light provides high PAR (~120 µmol at substrate). Without CO2 injection, you may experience algae issues. Consider adding CO2 or choosing a lower-output light." |
| **Recommendation** | 🔵 Info | Blue nudge, suggestion only | "Root-feeding plants like Amazon Swords benefit from nutrient-rich substrate. Your current inert sand may require heavy root tab supplementation." |
| **Completeness** | ⚪ Neutral | Gray prompt | "Your build doesn't include a heater. If your room temperature stays below 72°F, tropical plants and fish may struggle." |

#### Example Rules (20 Starter Rules)

```
RULE 001 — Tank Volume vs. Filter Flow Rate
Type: Soft Warning
Condition: filter.flow_rate_gph < tank.volume_gal * 4  OR  filter.flow_rate_gph > tank.volume_gal * 15
Message (under): "Most planted tanks do best with 4–10× turnover. Your filter provides {x}× turnover for this tank."
Message (over): "This filter's flow may be too strong for a {vol}-gallon tank and could stress plants and livestock. Consider a flow-adjustable model or adding a spray bar."

RULE 002 — Light PAR vs. Plant Light Demand
Type: Soft Warning
Condition: ANY plant.light_demand == 'high' AND light.par_at_substrate < 50
Message: "High-light plants like {plant_name} typically need PAR > 50 µmol at substrate level. Your light provides approximately {par} µmol. Consider upgrading your light or choosing lower-demand plants."

RULE 003 — CO2 Requirement
Type: Soft Warning
Condition: ANY plant.co2_demand == 'required' AND build.co2_system IS NULL
Message: "Plants like {plant_name} require CO2 injection to thrive. Without CO2, expect slow growth or melting. Add a CO2 system or swap for low-tech-friendly alternatives."

RULE 004 — Light Fixture Length vs. Tank Length
Type: Hard Incompatibility
Condition: light.min_tank_length > tank.length OR light.max_tank_length < tank.length
Message: "This light is designed for {light_range} tanks, but your tank is {tank_length}. It won't mount properly."

RULE 005 — Substrate Buffering + pH Sensitivity
Type: Recommendation
Condition: substrate.buffers_ph == true AND ANY plant.ph_preference_min > 7.0
Message: "Active substrates like {substrate_name} lower pH to ~6.0–6.5. Plants preferring alkaline water ({plant_name}) may not do their best."

RULE 006 — Heater Wattage Sizing
Type: Soft Warning
Condition: heater.wattage < tank.volume_gal * 3 OR heater.wattage > tank.volume_gal * 7
Message: "The general rule is 3–5 watts per gallon. Your heater provides {x} watts per gallon for this tank."

RULE 007 — Shrimp-Safe Fertilizer Check
Type: Hard Incompatibility (when shrimp flagged)
Condition: build.has_shrimp == true AND fert.copper_content > 0 AND fert.shrimp_safe == false
Message: "⚠️ This fertilizer contains copper, which is toxic to invertebrates. Choose a shrimp-safe alternative."

RULE 008 — Carpet Plant + Light/CO2
Type: Recommendation
Condition: ANY plant.placement == 'carpet' AND (light.par_at_substrate < 80 OR build.co2_system IS NULL)
Message: "Carpet plants like {plant_name} almost always need high light AND CO2 to carpet successfully. Without both, expect tall/leggy growth or failure."

RULE 009 — Stand Weight Capacity
Type: Hard Incompatibility
Condition: (tank.filled_weight_lbs) > stand.weight_capacity_lbs
Message: "This tank weighs approximately {weight} lbs when filled. This stand is rated for {capacity} lbs. This is a safety hazard."

RULE 010 — Hardscape pH/GH Impact
Type: Recommendation
Condition: hardscape.raises_gh == true AND ANY plant.prefers_soft_water == true
Message: "Seiryu stone raises GH and KH over time. Soft-water plants like {plant_name} may grow more slowly. Consider using inert stone or more frequent water changes."

RULE 011 — Planting Density
Type: Recommendation
Condition: COUNT(build.plants) < 3 AND tank.volume_gal > 10
Message: "Lightly planted tanks are more prone to algae. Consider adding more plant mass to outcompete algae for nutrients."

RULE 012 — CO2 Diffuser Placement
Type: Recommendation
Condition: build.co2_system EXISTS AND build.filter.type == 'canister' AND build.co2_diffuser.type == 'inline'
Message: "Great choice — inline diffusers with canister filters give the best CO2 dissolution. Make sure tubing diameters match."

RULE 013 — Nano Tank Filter Warning
Type: Soft Warning
Condition: tank.volume_gal <= 5 AND filter.type == 'canister'
Message: "Canister filters can be overkill for nano tanks. A small sponge filter or HOB may be more appropriate and easier to maintain."

RULE 014 — Temperature Range Mismatch
Type: Soft Warning
Condition: ANY plant_a.temp_max < ANY plant_b.temp_min (across all plants in build)
Message: "Temperature preferences for {plant_a} ({range_a}°F) and {plant_b} ({range_b}°F) don't overlap well. One or both may struggle."

RULE 015 — Active Substrate + Hard Water Plants
Type: Recommendation
Condition: substrate.type == 'active_buffering' AND ANY plant.prefers_hard_water == true
Message: "Buffering substrates lower pH and KH. {plant_name} prefers harder, more alkaline water."
```

#### Rule Storage & Maintenance

Rules are stored in the database as structured records, not hard-coded:

```
rules table:
  id: UUID
  code: string (e.g., "RULE_001")
  name: string
  description: string (internal)
  severity: enum ('error', 'warning', 'recommendation', 'completeness')
  category_a: string (the "if" category)
  category_b: string (the "then" category, nullable for single-category rules)
  condition_type: enum ('comparison', 'range', 'presence', 'cross_check')
  condition_json: JSONB (structured condition definition)
  message_template: string (with {variable} placeholders)
  active: boolean
  version: integer
  created_at: timestamp
  updated_at: timestamp
```

**Rule evaluation** is performed client-side for instant feedback (with a TypeScript rule engine), validated server-side on build save. Rules are versioned so changes don't retroactively break saved builds. An admin UI allows creating/editing/disabling rules with preview ("test this rule against build X").

### 3.3 Database Schema

**Database: PostgreSQL** (relational integrity for product specs + JSONB for flexible attributes)

#### Core Tables

```sql
-- ==================== PRODUCTS ====================

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,        -- 'tank', 'light', 'filter', etc.
  name VARCHAR(100) NOT NULL,              -- 'Tank', 'Light', 'Filter'
  display_order INTEGER NOT NULL,
  icon VARCHAR(50),
  builder_required BOOLEAN DEFAULT false,   -- is this a "must pick" category?
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) UNIQUE NOT NULL,
  website_url VARCHAR(500),
  logo_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) NOT NULL,
  brand_id UUID REFERENCES brands(id),
  name VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  image_urls JSONB DEFAULT '[]',           -- additional images
  specs JSONB NOT NULL DEFAULT '{}',        -- parametric attributes (typed per category)
  meta JSONB DEFAULT '{}',                  -- SEO, notes, admin flags
  status VARCHAR(20) DEFAULT 'active',      -- active, discontinued, draft
  source VARCHAR(50),                       -- 'manual', 'affiliate_feed', 'community'
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example specs JSONB for a light:
-- {
--   "par_at_12in": 85,
--   "par_at_18in": 45,
--   "par_at_24in": 28,
--   "spectrum_kelvin": 6500,
--   "wattage": 46,
--   "dimmable": true,
--   "mounting_type": "bracket",
--   "min_tank_length_in": 34,
--   "max_tank_length_in": 42,
--   "color_channels": ["white", "blue", "red", "green"],
--   "app_controlled": true
-- }

-- Example specs JSONB for a tank:
-- {
--   "volume_gal": 20,
--   "volume_liters": 75.7,
--   "length_in": 24,
--   "width_in": 12,
--   "height_in": 16,
--   "material": "glass",
--   "rimless": true,
--   "filled_weight_lbs": 225
-- }

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_specs ON products USING GIN(specs);
CREATE INDEX idx_products_slug ON products(slug);

-- ==================== PRODUCT SPEC DEFINITIONS ====================

CREATE TABLE spec_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) NOT NULL,
  key VARCHAR(100) NOT NULL,               -- 'par_at_12in', 'volume_gal'
  label VARCHAR(200) NOT NULL,             -- 'PAR at 12"', 'Volume (gal)'
  data_type VARCHAR(20) NOT NULL,          -- 'number', 'string', 'boolean', 'enum'
  unit VARCHAR(50),                        -- 'µmol', 'gal', 'GPH', '°F'
  enum_values JSONB,                       -- for enum type: ["low","medium","high"]
  filterable BOOLEAN DEFAULT false,
  filter_type VARCHAR(20),                 -- 'range', 'checkbox', 'select'
  display_order INTEGER DEFAULT 0,
  UNIQUE(category_id, key)
);

-- ==================== RETAILERS & OFFERS ====================

CREATE TABLE retailers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) UNIQUE NOT NULL,
  website_url VARCHAR(500),
  logo_url VARCHAR(500),
  affiliate_network VARCHAR(100),          -- 'amazon', 'shareasale', 'direct'
  affiliate_tag VARCHAR(200),
  active BOOLEAN DEFAULT true
);

CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) NOT NULL,
  retailer_id UUID REFERENCES retailers(id) NOT NULL,
  price_cents INTEGER,                     -- in USD cents
  currency VARCHAR(3) DEFAULT 'USD',
  url VARCHAR(1000) NOT NULL,              -- raw URL before affiliate tagging
  affiliate_url VARCHAR(1500),             -- URL with affiliate tag
  in_stock BOOLEAN DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES offers(id) NOT NULL,
  price_cents INTEGER NOT NULL,
  in_stock BOOLEAN NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_offers_product ON offers(product_id);
CREATE INDEX idx_price_history_offer ON price_history(offer_id, recorded_at);

-- ==================== PLANTS ====================

CREATE TABLE plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  common_name VARCHAR(300) NOT NULL,
  scientific_name VARCHAR(300),
  slug VARCHAR(300) UNIQUE NOT NULL,
  family VARCHAR(200),
  description TEXT,
  image_url VARCHAR(500),
  image_urls JSONB DEFAULT '[]',

  -- Care parameters
  difficulty VARCHAR(20) NOT NULL,          -- 'easy', 'moderate', 'advanced'
  light_demand VARCHAR(20) NOT NULL,        -- 'low', 'medium', 'high'
  co2_demand VARCHAR(20) NOT NULL,          -- 'none', 'beneficial', 'required'
  growth_rate VARCHAR(20),                  -- 'slow', 'moderate', 'fast'
  placement VARCHAR(30) NOT NULL,           -- 'foreground', 'midground', 'background', 'floating', 'carpet', 'epiphyte'

  -- Water params
  temp_min_f DECIMAL(5,1),
  temp_max_f DECIMAL(5,1),
  ph_min DECIMAL(3,1),
  ph_max DECIMAL(3,1),
  gh_min INTEGER,
  gh_max INTEGER,
  kh_min INTEGER,
  kh_max INTEGER,

  -- Characteristics
  max_height_in DECIMAL(5,1),
  propagation VARCHAR(200),                -- 'runners', 'cuttings', 'division', 'adventitious'
  substrate_type VARCHAR(30),              -- 'root_feeder', 'water_column', 'epiphyte', 'floating'
  shrimp_safe BOOLEAN DEFAULT true,
  beginner_friendly BOOLEAN DEFAULT false,

  -- Metadata
  native_region VARCHAR(200),
  notes TEXT,
  verified BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_plants_difficulty ON plants(difficulty);
CREATE INDEX idx_plants_light ON plants(light_demand);
CREATE INDEX idx_plants_placement ON plants(placement);

-- ==================== BUILDS ====================

CREATE TABLE builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),       -- nullable for anonymous builds
  name VARCHAR(300) DEFAULT 'Untitled Build',
  description TEXT,
  share_slug VARCHAR(20) UNIQUE,           -- short shareable ID
  style VARCHAR(50),                       -- 'iwagumi', 'dutch', 'jungle', 'walstad', 'nano', 'other'
  is_public BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,
  cover_image_url VARCHAR(500),

  -- Cached summary (updated on change)
  total_price_cents INTEGER DEFAULT 0,
  item_count INTEGER DEFAULT 0,
  compatibility_score INTEGER,             -- 0-100
  warnings_count INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE build_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID REFERENCES builds(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) NOT NULL,
  product_id UUID REFERENCES products(id),  -- nullable if plant
  plant_id UUID REFERENCES plants(id),      -- nullable if product
  quantity INTEGER DEFAULT 1,
  notes VARCHAR(500),                       -- user notes on this item
  selected_offer_id UUID REFERENCES offers(id),
  added_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (
    (product_id IS NOT NULL AND plant_id IS NULL) OR
    (product_id IS NULL AND plant_id IS NOT NULL)
  )
);

CREATE INDEX idx_build_items_build ON build_items(build_id);

-- Compatibility evaluation log (per build save)
CREATE TABLE build_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID REFERENCES builds(id) ON DELETE CASCADE NOT NULL,
  rule_id UUID REFERENCES compatibility_rules(id),
  severity VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  triggered_items JSONB,                   -- which items triggered this
  evaluated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== COMPATIBILITY RULES ====================

CREATE TABLE compatibility_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(300) NOT NULL,
  description TEXT,
  severity VARCHAR(20) NOT NULL,           -- 'error', 'warning', 'recommendation', 'completeness'
  categories_involved VARCHAR(50)[] NOT NULL, -- {'tank', 'filter'} or {'plant', 'co2'}
  condition_logic JSONB NOT NULL,           -- structured rule definition
  message_template TEXT NOT NULL,
  fix_suggestion TEXT,
  active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== USERS ====================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(300) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_url VARCHAR(500),
  auth_provider VARCHAR(50) DEFAULT 'email', -- 'email', 'google', 'github'
  auth_provider_id VARCHAR(300),
  role VARCHAR(20) DEFAULT 'user',           -- 'user', 'contributor', 'moderator', 'admin'
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE user_favorites (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  plant_id UUID REFERENCES plants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (
    (product_id IS NOT NULL AND plant_id IS NULL) OR
    (product_id IS NULL AND plant_id IS NOT NULL)
  )
);
```

---

## 4. Recommendation & Guidance Engine

### 4.1 Suggested Parts & Alternatives

**Context-Aware Suggestions:**
When a user selects a tank, the system queries for compatible products in subsequent categories using the tank's specs:

```
Given: Tank = 20 gal, 24" long, rimless
→ Lights WHERE min_tank_length <= 24 AND max_tank_length >= 24
  → Sorted by: popularity (offer click count), then price
  → Tagged: "Great Match" if PAR aligns with selected plants
→ Filters WHERE rated_volume_gal >= 20 AND rated_volume_gal <= 60
  → Sorted by: compatibility score, popularity
→ Heaters WHERE (wattage / 20) BETWEEN 3 AND 5
```

**"Users Also Chose" (V1+):**
Aggregate build data: "In builds with this tank, 68% of users chose the Fluval 3.0."

**Alternatives Panel:**
On every product in the builder, a "Swap / See Alternatives" button opens a filtered list within the same category, pre-constrained by the current build's requirements.

### 4.2 Warning Generation

Warnings are generated by a **rule engine** that runs whenever the build changes:

1. Build state changes (item added/removed/swapped)
2. Rule engine iterates all active rules
3. For each rule, check if the rule's `categories_involved` are present in the build
4. If so, evaluate `condition_logic` against the build's product/plant specs
5. If condition triggers, render `message_template` with actual values
6. Return sorted list: errors first, then warnings, then recommendations

**Trust & Transparency:** Every warning includes:
- A plain-English explanation of *why*
- The specific specs that triggered it (e.g., "Your light: 30 PAR at 18". Recommended: >50 PAR")
- A "Learn more" link to a guide or explanation
- A "Dismiss" option (for soft warnings) that persists for that build

### 4.3 Handling Missing Data & Uncertainty

Not all products will have complete spec data. The system handles this gracefully:

| Situation | Behavior |
|---|---|
| Product missing a spec needed for a rule | Rule is skipped; a gray note appears: "We don't have PAR data for this light. Verify with the manufacturer before buying." |
| Spec is approximate or user-reported | Small badge: "Community-reported spec — verify before purchase" |
| Multiple conflicting data sources | Use manufacturer spec as primary; note discrepancy |
| Rule has low confidence | Append "This is a general guideline — your experience may vary based on water parameters and maintenance." |

**Confidence Score (per rule evaluation):**
- **High** (green): Both specs are verified manufacturer data → firm statement
- **Medium** (yellow): One spec is community-reported or estimated → hedged language
- **Low** (gray): Missing data → skipped with note

### 4.4 LLM Integration (Careful, Optional)

**Where LLM adds value:**
- Generating natural-language build summaries ("This is a high-tech 20-gallon Iwagumi setup with…")
- Answering user questions about their build in a chat interface ("Why is my build showing a CO2 warning?")
- Writing product/plant descriptions from structured specs (admin tool)

**Where LLM must NOT be used:**
- Inventing specs or compatibility data
- Generating warnings (rules engine only)
- Making purchase recommendations without data backing

**Implementation:**
- LLM responses are always labeled: "AI-generated summary — compatibility data comes from our verified database"
- LLM receives structured build data as context, never invents attributes
- Deployed as an optional "Ask PlantedTankLab" chat panel, not as the primary UX

---

## 5. UX / Information Architecture

### 5.1 Key Pages

```
/                        → Home (hero + "Start a Build" + trending builds + guides)
/builder                 → Builder (the main PCPartPicker-like page)
/builder/:id             → Saved build (view/edit)
/products                → Product category browser
/products/:category      → Category list with parametric filters
/products/:category/:slug → Product detail page
/plants                  → Plant database browser
/plants/:slug            → Plant detail page (care card)
/compare                 → Side-by-side comparison (up to 3 items)
/builds                  → Community build gallery
/builds/:slug            → Shared build view
/guides                  → Guide index
/guides/:slug            → Guide article
/profile                 → User profile (saved builds, favorites)
/admin/*                 → Admin panel (products, rules, offers, moderation)
```

### 5.2 Builder Page — Detailed Interaction Design

The builder is the heart of the product. It follows PCPartPicker's proven pattern:

```
┌──────────────────────────────────────────────────────────────────┐
│  PlantedTankLab Builder                                [Save] [Share]  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  BUILD SUMMARY BAR                                               │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │
│  │ Total  │ │ Light  │ │ CO2    │ │ Diff.  │ │ Compat │       │
│  │ $342   │ │ Medium │ │ Yes ✓  │ │ Mod.   │ │ 85/100 │       │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘       │
│                                                                  │
│  ⚠️ 1 Warning: High-light plants selected without CO2  [View]   │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CATEGORY          │ SELECTION                │ PRICE    │       │
│  ─────────────────────────────────────────────────────────       │
│  🪟 Tank           │ UNS 60U (20 gal)         │ $89.99  │ [⇅✕] │
│  🗄️ Stand          │ + Choose a Stand          │         │      │
│  💡 Light          │ Fluval Plant 3.0 24"      │ $109.99 │ [⇅✕] │
│  🌊 Filter         │ + Choose a Filter         │         │      │
│  💨 CO2            │ + Add CO2 (optional)      │         │      │
│  🪨 Substrate      │ + Choose Substrate        │         │      │
│  🏔️ Hardscape      │ + Add Hardscape (opt.)    │         │      │
│  🌿 Plants (3)     │ Monte Carlo, Rotala...    │ $24.97  │ [⇅✕] │
│  🧪 Fertilizer     │ + Choose Fertilizer       │         │      │
│  🌡️ Heater         │ + Add Heater (optional)   │         │      │
│  🔬 Test Kit       │ + Choose Test Kit         │         │      │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  BUILD NOTES (optional freetext for personal reference)          │
└──────────────────────────────────────────────────────────────────┘
```

**Interaction flow when clicking "+ Choose a Filter":**
1. Inline expansion OR slide-over panel opens
2. Shows filtered product list (pre-filtered by tank volume compatibility)
3. Parametric filters available: Flow Rate, Type (HOB/Canister/Sponge), Brand, Price Range
4. Each product row shows: name, key specs, price (lowest), compatibility badge
5. Click "Add" → product appears in builder row; warnings recalculate instantly
6. "Compare" checkbox on up to 3 items opens side-by-side modal

**Incompatibility Display:**
- **Inline**: Small icon + tooltip on the affected row ("⚠️ Flow rate may be too high")
- **Summary banner**: Top of builder shows count of errors/warnings, expandable to full list
- **No modal interruptions** for warnings — only for hard incompatibilities when trying to "complete" a build

**Price/Availability:**
- Each product row shows lowest price from linked retailers
- Click price → expands to show all retailer options with individual prices + "Buy" affiliate links
- Out-of-stock offers shown grayed with "Out of Stock" label
- "Price from {retailer}" with retailer logo

**Nudges Toward Complete Build:**
- Empty categories show as light gray rows with "+ Choose a ___"
- Required categories (Tank, Light, Filter, Substrate) have a subtle dot indicator
- A "Build Completeness" percentage or progress ring in the summary bar
- Optional categories (CO2, Hardscape, Heater) labeled "(optional)" but with contextual nudges

### 5.3 Search & Filter Patterns by Category

| Category | Key Filters |
|---|---|
| **Tanks** | Volume (range slider), Dimensions, Material (glass/acrylic), Rimless (yes/no), Brand, Price |
| **Lights** | PAR output (range), Tank length fit, Spectrum (Kelvin), Mounting type, Dimmable, App-controlled, Brand, Price |
| **Filters** | Type (HOB/canister/sponge/AIO), Flow rate (GPH), Rated volume, Adjustable flow, Brand, Price |
| **CO2** | System type (full kit/regulator/diffuser), Thread type, Dual stage, Solenoid, Brand, Price |
| **Substrate** | Type (active/inert), Buffering, Grain size, Color, Brand, Price |
| **Plants** | Difficulty, Light demand, CO2 demand, Placement, Growth rate, Beginner-friendly, Shrimp-safe |
| **Fertilizers** | Type (liquid/root tab), All-in-one/separate, Shrimp-safe, Brand, Price |
| **Heaters** | Wattage, Rated volume, Type (submersible/inline), Adjustable, Brand, Price |

---

## 6. Tech Stack & Architecture

### 6.1 Recommended Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | Next.js 14+ (App Router) + TypeScript | SSR for SEO (product/plant pages), React for builder interactivity, great DX |
| **Styling** | Tailwind CSS + Radix UI primitives | Rapid iteration, accessible components, custom design system |
| **State Management** | Zustand (builder state) + React Query (server data) | Simple, performant, good for complex builder state |
| **Backend** | Next.js API Routes + tRPC (or separate Node/Express if needed) | Type-safe API, co-located with frontend, easy deployment |
| **Database** | PostgreSQL (via Supabase or Neon) | Relational integrity, JSONB for flexible specs, great tooling |
| **ORM** | Drizzle ORM | Type-safe, performant, great PostgreSQL support |
| **Auth** | NextAuth.js (Auth.js) | Google OAuth + email magic links, easy setup |
| **Search** | PostgreSQL full-text search (MVP) → Meilisearch (V1) | Start simple, upgrade when needed |
| **File Storage** | Cloudflare R2 or Supabase Storage | Product/plant images, user uploads |
| **Hosting** | Vercel (frontend + API) + Supabase (DB) | Zero-ops deployment, scales automatically |
| **Analytics** | Plausible or PostHog | Privacy-friendly, event tracking for KPIs |
| **Monitoring** | Sentry (errors) + Vercel Analytics (performance) | Error tracking, Web Vitals |

### 6.2 Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                     Client (Browser)                 │
│  Next.js App ──── Zustand (Builder State)           │
│       │            Rule Engine (client-side eval)    │
│       │            React Query (data fetching)       │
└───────┼─────────────────────────────────────────────┘
        │ HTTPS
┌───────┼─────────────────────────────────────────────┐
│       ▼          Vercel Edge / Serverless            │
│  Next.js API Routes / tRPC                          │
│       │                                              │
│  ┌────┴────────────────────────────────┐            │
│  │  Service Layer                       │            │
│  │  ├─ ProductService                   │            │
│  │  ├─ PlantService                     │            │
│  │  ├─ BuildService                     │            │
│  │  ├─ CompatibilityService             │            │
│  │  ├─ OfferService                     │            │
│  │  ├─ UserService                      │            │
│  │  └─ AdminService                     │            │
│  └────┬────────────────────────────────┘            │
│       │                                              │
│  ┌────┴────────┐  ┌──────────────┐                  │
│  │ PostgreSQL  │  │ Redis/Upstash│  (offer cache)   │
│  │ (Supabase)  │  │ (optional)   │                  │
│  └─────────────┘  └──────────────┘                  │
│                                                      │
│  ┌──────────────────────────────────┐               │
│  │  Background Jobs (Vercel Cron)    │               │
│  │  ├─ Price/stock sync (daily)      │               │
│  │  ├─ Affiliate URL refresh         │               │
│  │  └─ Sitemap generation            │               │
│  └──────────────────────────────────┘               │
└─────────────────────────────────────────────────────┘
```

### 6.3 Caching Strategy

| Data | Cache Duration | Strategy |
|---|---|---|
| Product specs | 24 hours | ISR (Next.js) + CDN |
| Plant data | 24 hours | ISR + CDN |
| Offers/prices | 1–6 hours | Redis/Upstash with background refresh |
| Build data | Real-time | No cache (direct DB) |
| Compatibility rules | 1 hour | In-memory on API server + client bundle |
| Search results | 5 minutes | React Query stale-while-revalidate |

### 6.4 Background Jobs

| Job | Frequency | Purpose |
|---|---|---|
| `sync-offers` | Every 6 hours | Refresh prices/stock from affiliate feeds or scraping |
| `record-price-history` | Daily | Snapshot current prices into price_history |
| `generate-sitemap` | Daily | Dynamic sitemap for SEO |
| `cleanup-anonymous-builds` | Weekly | Remove unsaved anonymous builds older than 30 days |
| `aggregate-build-stats` | Daily | Compute "popular in builds" stats |

---

## 7. Pricing + Affiliate Monetization

### 7.1 Affiliate Approach

**Primary: Amazon Associates**
- Broad product coverage for equipment
- 1–4% commission on aquarium supplies
- Well-known, trusted by users
- Easy API access for price/stock

**Secondary: Specialty Aquarium Retailers**
- BucePlant, Aquarium Co-Op, Aqua Forest Aquarium, Glass Aqua, etc.
- Higher commission (5–15%) via ShareASale, Impact, or direct programs
- Better for plants, premium equipment, hardscape
- More credibility with hobbyists

**Implementation:**
- Every product can have multiple offers across retailers
- Affiliate tags are appended server-side (never exposed in client code)
- Click tracking via redirect endpoint: `/go/:offer_id` → logs click → redirects to affiliate URL
- Daily reconciliation of clicks vs. affiliate dashboard reported clicks

### 7.2 Offer Normalization

Products are the canonical entity. Offers link to products:

```
Product: "Fluval Plant Spectrum 3.0 LED - 24-36 inch"
  ├─ Offer: Amazon    → $109.99 (in stock)  [affiliate link]
  ├─ Offer: BucePlant → $114.99 (in stock)  [affiliate link]
  └─ Offer: Aqua Co-Op → $109.99 (out of stock)
```

The builder shows the lowest in-stock price. The product detail page shows all offers.

### 7.3 Price History & Alerts (V2)

- `price_history` table stores daily snapshots
- Chart.js or Recharts sparkline on product detail page
- Users can "Watch" a product → email alert when price drops below threshold

### 7.4 Discontinued / Out-of-Stock Handling

| Status | Behavior |
|---|---|
| All offers out of stock | Product shown with "Currently Unavailable" badge; still selectable in builder |
| Product discontinued | "Discontinued" badge; builder shows warning + suggests alternatives |
| No offers at all | Product exists in DB for compatibility purposes; no price shown; "Check retailer" generic link |

---

## 8. Data Acquisition Plan

### 8.1 Seed Strategy (Pre-Launch)

This is the hardest part. Start manually, supplement with feeds.

**Phase 1: Manual Curation (Weeks 1–3)**
- Personally research and enter the top products per category
- Focus on the "80/20" — the products that 80% of builds would use
- Use manufacturer spec sheets, product pages, and personal knowledge
- Plants: curate from Tropica, AquaFlora, and established databases

**Phase 2: Affiliate Feed Import (Weeks 3–5)**
- Amazon Product Advertising API: search by category, import product data + prices
- Normalize: map affiliate feed fields to our schema, fill in missing specs manually
- BucePlant / specialty retailers: manual entry or scraping (with permission)

**Phase 3: Community Contributions (V1+)**
- "Suggest a Product" form with structured fields
- Moderation queue: admin reviews/verifies before publishing
- Contributors earn badge/credit

### 8.2 Data Sources

| Source | What It Provides | Quality |
|---|---|---|
| Manufacturer websites | Specs, images, descriptions | High (primary source) |
| Amazon PA API | Prices, stock, UPC, basic product info | Medium (specs often incomplete) |
| Retailer product pages | Prices, stock, detailed specs | Medium-High |
| Tropica.com / Aqua Plant Database | Plant care data | High |
| Reddit r/PlantedTank wiki | Plant care consensus | Medium (community knowledge) |
| Aquarium Co-Op product pages | Specs + Cory's recommendations | High |
| Personal testing / community PAR data | PAR readings for lights | High (but limited coverage) |

### 8.3 Minimum Launch Dataset

| Category | # of Products | Notes |
|---|---|---|
| Tanks | 15–20 | Mix of nano (5gal), standard (10, 20, 29, 40 gal), rimless |
| Stands | 8–10 | Basic options per common tank size |
| Lights | 15–20 | Budget to premium, covering common tank lengths |
| Filters | 15–20 | HOB, canister, sponge across sizes |
| CO2 Systems | 10–12 | Full kits, regulators, diffusers |
| Substrates | 10–12 | ADA Amazonia, Fluval Stratum, UNS Controsoil, inert options |
| Hardscape | 8–10 | Common stone/wood types (by type, not individual pieces) |
| Plants | 60–80 | Covering easy→advanced, all placements, common species |
| Fertilizers | 8–10 | Major brands (Aquarium Co-Op, Seachem, NilocG, APT) |
| Heaters | 8–10 | Per common tank volumes |
| Test Kits | 5–6 | API Master Kit, strips, digital options |
| **TOTAL** | **~170–210** | |

This is enough to build a useful, credible MVP.

---

## 9. Admin / Operations

### 9.1 Admin Panel Features

Built as `/admin/*` routes with role-based access:

| Feature | Description |
|---|---|
| **Product Manager** | CRUD for products, with spec form generated from `spec_definitions`, image upload, status management |
| **Plant Manager** | CRUD for plants with all care parameters, image upload |
| **Rule Editor** | Create/edit/disable compatibility rules, test against sample builds, preview messages |
| **Offer Manager** | View/edit retailer offers, trigger price refresh, manage affiliate URLs |
| **Build Moderation** | Review flagged public builds, remove inappropriate content |
| **Analytics Dashboard** | Build counts, popular products, affiliate clicks, user registrations |
| **Content Manager** | Create/edit guides and articles |
| **User Manager** | View users, manage roles, handle support issues |

### 9.2 Security Considerations

- **Auth**: NextAuth.js with secure session handling, CSRF protection
- **API**: Rate limiting on all endpoints (especially build creation, search)
- **Input Validation**: Zod schemas on all API inputs (tRPC handles this natively)
- **SQL Injection**: ORM (Drizzle) parameterized queries — no raw SQL
- **XSS**: React's built-in escaping + CSP headers
- **Affiliate Links**: Server-side redirect only (prevent tag stripping)
- **Admin Access**: Role-based middleware, audit log for admin actions

### 9.3 Abuse Prevention

| Threat | Mitigation |
|---|---|
| Spam builds | Rate limit anonymous build creation (10/day per IP); CAPTCHA on public builds |
| Bot price scraping | Rate limiting, user-agent filtering, Cloudflare bot protection |
| Fake community submissions | Moderation queue, verified contributor program |
| Affiliate fraud | Click-through logging, anomaly detection (too many clicks from same IP) |
| SEO spam in build descriptions | Content filtering, word blocklist, manual moderation for public builds |

---

## 10. Build Plan & Milestones

### Week 1–2: Foundation + Data Model

**Deliverables:**
- [ ] Project scaffolding (Next.js + Tailwind + Drizzle + Supabase)
- [ ] Database schema deployed (all core tables)
- [ ] Category and spec_definitions seed data
- [ ] Product admin CRUD (basic form for creating products with specs)
- [ ] Plant admin CRUD (basic form for creating plants)
- [ ] Seed 50 products + 30 plants manually

**Acceptance Criteria:**
- Can create a product with category-specific specs via admin UI
- Can create a plant with all care parameters via admin UI
- Database migrations run cleanly
- Basic CI/CD pipeline deploys to Vercel

### Week 3–4: Builder Core

**Deliverables:**
- [ ] Builder page layout (category rows, add/remove/swap)
- [ ] Product picker (click category → filtered list → add to build)
- [ ] Build state management (Zustand store)
- [ ] Build persistence (save to DB or localStorage for anon)
- [ ] Running price total
- [ ] Compatibility rule engine (client-side, 10 initial rules)
- [ ] Warning display (inline + summary banner)
- [ ] Shareable build links (public URL with share_slug)

**Acceptance Criteria:**
- User can build a complete tank setup by selecting products across categories
- At least 10 compatibility warnings fire correctly
- Build is shareable via URL
- Builder is responsive (usable on mobile)

### Week 5–6: Products, Plants & Polish

**Deliverables:**
- [ ] Product list pages with parametric filters
- [ ] Product detail pages with specs table + offers
- [ ] Plant database browser with filters
- [ ] Plant detail pages (care card layout)
- [ ] Affiliate link integration (Amazon + 1 specialty retailer)
- [ ] Click-through tracking (`/go/:offer_id` redirect)
- [ ] Complete seed data (170+ products, 60+ plants)
- [ ] Home page with hero, featured builds, CTAs
- [ ] Basic SEO (meta tags, OG images, sitemap)

**Acceptance Criteria:**
- Product/plant pages rank-worthy (proper SEO structure)
- Affiliate links track clicks and redirect correctly
- All seed data entered and verified
- Site feels "complete" for a soft launch

### Week 7–8: Auth + User Features (V1)

**Deliverables:**
- [ ] User authentication (Google OAuth + email)
- [ ] Save builds to account
- [ ] Multiple builds per user
- [ ] User profile page (saved builds, favorites)
- [ ] Build gallery (public completed builds)
- [ ] Product comparison page

**Acceptance Criteria:**
- User can sign up, save builds, and view them on their profile
- Public build gallery shows community builds
- Comparison works for 2–3 products in same category

### Week 9–10: Admin, Guides & Hardening

**Deliverables:**
- [ ] Full admin panel (products, plants, rules, offers, users)
- [ ] 3–5 editorial guides (beginner low-tech, high-tech, nano, etc.)
- [ ] Expanded compatibility rules (20+ rules)
- [ ] Performance optimization (lazy loading, image optimization, caching)
- [ ] Error monitoring (Sentry)
- [ ] Analytics integration (PostHog/Plausible)
- [ ] Legal pages (Privacy Policy, Terms, Affiliate Disclosure)
- [ ] Public beta launch

**Acceptance Criteria:**
- Admin can manage all data without touching code
- Lighthouse score > 90 on key pages
- Error tracking operational
- Affiliate disclosure compliant with FTC guidelines

---

## 11. Risks & Mitigations

### Technical/Product Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **Spec data is incomplete or inaccurate** | False compatibility warnings erode trust | Confidence scoring; "unverified" badges; graceful degradation (skip rule if data missing); community corrections workflow |
| **Too few products at launch** | App feels empty, users leave | Focus on the "greatest hits" — the 170 products that cover 90% of builds; clearly show "more coming" with suggestion form |
| **Compatibility rules are wrong** | Users get bad advice, lose trust | Every rule links to explanation; rules are conservative (err toward warnings, not blocks); versioned rules; easy admin override |
| **Affiliate revenue is too low** | Can't sustain development | Keep costs near zero (Vercel free tier, Supabase free tier); this is a side project until revenue justifies investment |
| **PCPartPicker sues or sends C&D** | Legal exposure | We're not cloning their code or brand; "inspired by" is a product pattern, not IP; different domain entirely |
| **Plant data is subjective** | Hobbyists disagree on care requirements | Use ranges instead of absolutes; cite sources; allow community feedback; "difficulty" is a spectrum not a binary |

### Edge Cases

| Edge Case | Handling |
|---|---|
| **Brackish / saltwater builds** | Out of scope for MVP. Tag as "freshwater planted only" — expand later |
| **Walstad / low-tech / no-filter builds** | Support "None" selection for CO2/filter/heater; don't force categories; Walstad-specific rules |
| **Nano tanks (< 5 gal)** | Supported but with specific rules (sponge filter recommended, limited stocking) |
| **Shrimp-only tanks** | "Shrimp tank" toggle on build; activates copper-check rules, Caridina-specific water params |
| **DIY equipment** | Allow "Custom/DIY" entry with manual specs; no affiliate link; compatibility still evaluated |
| **Multiple-tank setups** | Each tank is a separate build; user can save multiple builds |

### Legal & Compliance

| Area | Approach |
|---|---|
| **FTC Affiliate Disclosure** | Clear disclosure on every page with affiliate links: "PlantedTankLab earns from qualifying purchases" |
| **Amazon Associates Terms** | Follow all program policies; no price caching beyond TOS limits; proper attribution |
| **User Data / GDPR** | Minimal data collection; clear privacy policy; account deletion available; no selling user data |
| **Product Images** | Use manufacturer-provided images with attribution; fall back to affiliate feed images; user-uploaded images for community content |
| **Liability** | Clear disclaimer: "PlantedTankLab provides guidance, not guarantees. Verify compatibility before purchasing." |

---

## A. Exact MVP Scope Checklist

```
MUST SHIP (MVP):
  [x] Database schema (products, plants, builds, rules, offers, categories)
  [x] Admin: Product CRUD with category-specific spec forms
  [x] Admin: Plant CRUD with care parameters
  [x] Admin: Compatibility rule editor (basic)
  [x] Builder page with sequential category selection
  [x] Product picker per category with basic filters
  [x] Plant picker with difficulty/light/CO2/placement filters
  [x] Client-side compatibility rule engine (15 rules)
  [x] Warning display (inline warnings + summary banner)
  [x] Running price total from linked offers
  [x] Affiliate links to Amazon + 1 specialty retailer
  [x] Click-through tracking
  [x] Build save (localStorage for anon, DB for auth'd)
  [x] Shareable build URLs
  [x] Product list pages with parametric filters
  [x] Product detail pages with specs + offers
  [x] Plant database browser with filters
  [x] Plant detail pages (care card)
  [x] Home page (hero + CTAs)
  [x] Responsive design (mobile-friendly)
  [x] Basic SEO (meta tags, sitemap)
  [x] Affiliate disclosure on all relevant pages
  [x] ~170 seeded products + ~70 seeded plants

DEFERRED TO V1:
  [ ] User accounts / auth
  [ ] Multiple saved builds
  [ ] Community build gallery
  [ ] Product comparison
  [ ] Editorial guides
  [ ] Price history
  [ ] Full admin panel

DEFERRED TO V2:
  [ ] Price alerts
  [ ] Aquascape visual planner
  [ ] Maintenance scheduler
  [ ] Tank journal / profile
  [ ] Contributor portal
  [ ] LLM chat assistant
  [ ] Mobile app / PWA
```

---

## B. Proposed First Dataset

| Category | Count | Specific Items to Include |
|---|---|---|
| **Tanks** | 18 | UNS 60U/45U/90U, Waterbox Clear series, ADA 60P/90P, Fluval Flex 9/15, standard 10/20/29/40 gal, Lifegard 5gal nano |
| **Stands** | 10 | UNS cabinet stands, basic metal stands per size, Ikea KALLAX (popular hack), ADA wood cabinet |
| **Lights** | 20 | Fluval Plant 3.0 (all sizes), Chihiros WRGB II (sizes), ONF Flat One+, Twinstar (sizes), Nicrew ClassicLED (budget), Finnex Planted+ 24/7 |
| **Filters** | 18 | Oase BioMaster (sizes), Eheim Classic (sizes), Fluval 07/07+ series, AquaClear HOB (20/50/70), sponge filters (Aquarium Co-Op, Hikari) |
| **CO2 Systems** | 12 | Fzone/ZRDR regulators, AquaTek regulators, CO2Art Pro-SE, Fluval CO2 kit, inline diffusers (UP Aqua, Ista), ceramic diffusers |
| **Substrates** | 12 | ADA Amazonia II, UNS Controsoil, Fluval Stratum, Tropica Soil, CaribSea Eco-Complete, pool filter sand, Black Diamond blasting sand |
| **Hardscape** | 8 | Dragon stone, seiryu stone, lava rock, spider wood, manzanita, cholla wood (by type, not individual pieces) |
| **Plants** | 70 | Full spectrum: Easy (java fern, anubias, amazon sword, water wisteria, hornwort, dwarf sag, crypts) → Medium (rotala, ludwigia, bucephalandra, monte carlo, pogostemon) → Hard (HC Cuba, glossostigma, rotala butterfly, eriocaulon) across all placements |
| **Fertilizers** | 10 | Aquarium Co-Op Easy Green, Seachem Flourish line, NilocG ThriveS, APT Complete/EI, root tabs (Flourish, Co-Op) |
| **Heaters** | 10 | Eheim Jager (sizes), Cobalt Aquatics Neo-Therm (sizes), Fluval E-series, Hygger inline |
| **Test Kits** | 6 | API Freshwater Master Kit, API GH/KH, CO2 drop checker, TDS meter, pH pen |
| **TOTAL** | **~194** | |

---

## C. Suggested Repository Structure

```
planted-tank-lab/
├── README.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── drizzle.config.ts
├── .env.example
├── .env.local
│
├── public/
│   ├── images/
│   │   ├── logo.svg
│   │   ├── og-image.png
│   │   └── icons/
│   └── robots.txt
│
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Home
│   │   ├── globals.css
│   │   │
│   │   ├── builder/
│   │   │   ├── page.tsx              # New build
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Saved build
│   │   │
│   │   ├── products/
│   │   │   ├── page.tsx              # Category index
│   │   │   ├── [category]/
│   │   │   │   ├── page.tsx          # Product list with filters
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx      # Product detail
│   │   │
│   │   ├── plants/
│   │   │   ├── page.tsx              # Plant browser
│   │   │   └── [slug]/
│   │   │       └── page.tsx          # Plant detail
│   │   │
│   │   ├── builds/
│   │   │   ├── page.tsx              # Community gallery
│   │   │   └── [slug]/
│   │   │       └── page.tsx          # Shared build view
│   │   │
│   │   ├── compare/
│   │   │   └── page.tsx
│   │   │
│   │   ├── guides/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/
│   │   │       └── page.tsx
│   │   │
│   │   ├── profile/
│   │   │   └── page.tsx
│   │   │
│   │   ├── go/
│   │   │   └── [offerId]/
│   │   │       └── route.ts          # Affiliate redirect + tracking
│   │   │
│   │   ├── admin/
│   │   │   ├── layout.tsx            # Admin layout with nav
│   │   │   ├── page.tsx              # Dashboard
│   │   │   ├── products/
│   │   │   │   ├── page.tsx          # Product list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx      # Product edit
│   │   │   ├── plants/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── rules/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── offers/
│   │   │   │   └── page.tsx
│   │   │   └── builds/
│   │   │       └── page.tsx
│   │   │
│   │   └── api/
│   │       ├── trpc/
│   │       │   └── [trpc]/
│   │       │       └── route.ts      # tRPC handler
│   │       └── auth/
│   │           └── [...nextauth]/
│   │               └── route.ts
│   │
│   ├── server/                       # Server-side code
│   │   ├── db/
│   │   │   ├── index.ts              # DB connection
│   │   │   ├── schema.ts             # Drizzle schema (all tables)
│   │   │   └── migrations/           # Drizzle migrations
│   │   │
│   │   ├── trpc/
│   │   │   ├── router.ts             # Root router
│   │   │   ├── context.ts            # tRPC context
│   │   │   └── routers/
│   │   │       ├── products.ts
│   │   │       ├── plants.ts
│   │   │       ├── builds.ts
│   │   │       ├── offers.ts
│   │   │       ├── rules.ts
│   │   │       └── users.ts
│   │   │
│   │   ├── services/
│   │   │   ├── compatibility.ts      # Rule evaluation engine
│   │   │   ├── pricing.ts            # Offer aggregation
│   │   │   ├── affiliate.ts          # Link generation + tracking
│   │   │   └── search.ts             # Full-text search
│   │   │
│   │   └── jobs/                     # Background jobs (Vercel Cron)
│   │       ├── sync-offers.ts
│   │       ├── record-price-history.ts
│   │       └── generate-sitemap.ts
│   │
│   ├── lib/                          # Shared utilities
│   │   ├── utils.ts
│   │   ├── constants.ts
│   │   ├── types.ts                  # Shared TypeScript types
│   │   └── validators.ts             # Zod schemas
│   │
│   ├── engine/                       # Client-side compatibility engine
│   │   ├── rules.ts                  # Rule definitions (synced from server)
│   │   ├── evaluate.ts               # Rule evaluation logic
│   │   └── types.ts                  # Rule types
│   │
│   ├── stores/                       # Client state (Zustand)
│   │   └── builder-store.ts          # Builder state + actions
│   │
│   ├── components/
│   │   ├── ui/                       # Base UI components (buttons, inputs, cards)
│   │   ├── layout/                   # Header, Footer, Sidebar, Nav
│   │   ├── builder/                  # Builder-specific components
│   │   │   ├── BuilderPage.tsx
│   │   │   ├── CategoryRow.tsx
│   │   │   ├── ProductPicker.tsx
│   │   │   ├── PlantPicker.tsx
│   │   │   ├── BuildSummaryBar.tsx
│   │   │   ├── CompatibilityBanner.tsx
│   │   │   ├── WarningInline.tsx
│   │   │   └── PriceTotal.tsx
│   │   ├── products/                 # Product list, card, detail components
│   │   ├── plants/                   # Plant card, care card, detail components
│   │   └── admin/                    # Admin form components
│   │
│   └── hooks/                        # Custom React hooks
│       ├── use-builder.ts
│       ├── use-compatibility.ts
│       └── use-products.ts
│
├── scripts/                          # Data seeding, one-off scripts
│   ├── seed-categories.ts
│   ├── seed-products.ts
│   ├── seed-plants.ts
│   ├── seed-rules.ts
│   └── import-affiliate-feed.ts
│
├── data/                             # Raw seed data (JSON/CSV)
│   ├── categories.json
│   ├── products/
│   │   ├── tanks.json
│   │   ├── lights.json
│   │   ├── filters.json
│   │   └── ...
│   ├── plants.json
│   └── rules.json
│
└── tests/
    ├── engine/
    │   └── compatibility.test.ts     # Rule engine unit tests
    ├── api/
    │   └── builds.test.ts
    └── e2e/
        └── builder.spec.ts           # Playwright e2e tests
```

---

## D. 10 Example Compatibility Warnings (In App Voice)

These are written to be clear, specific, educational, and non-alarmist:

> **1.** 💡 **Light may not be enough for your plants.** Your Nicrew ClassicLED provides approximately 25 PAR at substrate level. Plants like Rotala rotundifolia thrive at 50+ PAR. Consider upgrading to a higher-output light, or swap for lower-light plants like Java Fern or Anubias.

> **2.** 🌿 **CO2 is strongly recommended for these plants.** You've selected Monte Carlo (Micranthemum tweediei), which almost always requires CO2 injection to carpet successfully. Without CO2, expect tall, leggy growth instead of a carpet. [Add a CO2 System →]

> **3.** 🌊 **This filter may be too powerful for your nano tank.** The Eheim Classic 250 pushes 116 GPH — that's over 23× turnover for a 5-gallon tank. Your plants and any livestock may get blasted. A small sponge filter or the AquaClear 20 (set to low) would be a better fit.

> **4.** 🦐 **Heads up — this fertilizer contains copper.** You've flagged this as a shrimp tank, but Seachem Flourish Comprehensive contains trace copper. While the amount is small, sensitive shrimp (especially Caridina) may be affected. Consider a shrimp-safe alternative like NilocG ThriveS.

> **5.** 🪨 **Seiryu stone will raise your water hardness over time.** This can push pH above 7.5 and increase GH/KH. Your selected plants (Rotala sp. "Blood Red," Tonina fluviatilis) prefer soft, acidic water. Consider dragon stone or lava rock as inert alternatives.

> **6.** 🌡️ **Your build doesn't include a heater.** The tropical plants you've selected prefer 72–80°F. If your room temperature drops below 70°F, growth will slow and some species may decline. A 50W heater is recommended for a 10-gallon tank. [Add a Heater →]

> **7.** 📐 **This light won't fit your tank.** The Chihiros WRGB II 60 is designed for 24-inch tanks, but your UNS 90U is 36 inches long. You'll have unlit areas on both sides. Look at the WRGB II 90 instead.

> **8.** 🧪 **Your substrate is inert, but you've chosen heavy root feeders.** Amazon Swords and Cryptocorynes get most of their nutrition through their roots. With pool filter sand, you'll need to supplement heavily with root tabs — plan to replace them every 2–3 months. An active substrate like UNS Controsoil would reduce maintenance.

> **9.** 🌱 **Consider adding more plants.** You have 2 plant species in a 29-gallon tank. Lightly planted tanks are more prone to algae problems because there isn't enough plant mass to outcompete algae for nutrients. We recommend at least 5–6 species with good coverage.

> **10.** 🔄 **Temperature conflict between plants.** Your Dwarf Water Lettuce prefers cooler water (64–80°F) while your Staurogyne repens prefers warmer conditions (68–86°F). They'll overlap fine in the 68–80°F range, but keep your heater set within this window. This is a minor concern — both species are adaptable.

---

*End of PlantedTankLab Product & Technical Plan*
