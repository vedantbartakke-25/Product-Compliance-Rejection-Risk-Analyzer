
-- =============== schema.sql ===============
-- ============================================================
-- Schema for Product Compliance & Rejection Risk Analyzer
-- PostgreSQL  |  Multi-Category  |  v2.1 (Pipeline Architecture)
-- ============================================================

-- Drop existing tables in reverse-dependency order for clean reset
DROP TABLE IF EXISTS evaluation_stages  CASCADE;
DROP TABLE IF EXISTS rule_outcomes      CASCADE;
DROP TABLE IF EXISTS violations         CASCADE;
DROP TABLE IF EXISTS evaluations        CASCADE;
DROP TABLE IF EXISTS ingredient_interactions CASCADE;
DROP TABLE IF EXISTS ingredient_group_members CASCADE;
DROP TABLE IF EXISTS ingredient_groups  CASCADE;
DROP TABLE IF EXISTS ingredient_limits  CASCADE;
DROP TABLE IF EXISTS regulations        CASCADE;
DROP TABLE IF EXISTS product_ingredients CASCADE;
DROP TABLE IF EXISTS users              CASCADE;
DROP TABLE IF EXISTS products           CASCADE;
DROP TABLE IF EXISTS substance_categories CASCADE;
DROP TABLE IF EXISTS substance_aliases  CASCADE;
DROP TABLE IF EXISTS substances         CASCADE;


-- =========================
-- 0. USERS
-- =========================
-- User accounts for authentication.

CREATE TABLE users (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(200) NOT NULL,
  email           VARCHAR(200) UNIQUE NOT NULL,
  password_hash   VARCHAR(64)  NOT NULL,
  created_at      TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);


-- =========================
-- 1. SUBSTANCES
-- =========================
-- Master registry of all chemicals, parameters, and heavy metals
-- shared across every product category.

CREATE TABLE substances (
  id              SERIAL PRIMARY KEY,
  reference_code  VARCHAR(50)  UNIQUE NOT NULL,
  official_name   VARCHAR(200) NOT NULL,
  cas_number      VARCHAR(20),
  type            VARCHAR(50)  NOT NULL DEFAULT 'chemical'
                    CHECK (type IN ('chemical', 'parameter', 'heavy_metal')),
  created_at      TIMESTAMP    DEFAULT NOW()
);


-- =========================
-- 2. SUBSTANCE ALIASES
-- =========================
-- Alternate / trade names so users can type "Lye" instead of "Sodium Hydroxide".

CREATE TABLE substance_aliases (
  id              SERIAL PRIMARY KEY,
  substance_id    INTEGER      NOT NULL REFERENCES substances(id) ON DELETE CASCADE,
  alias_name      VARCHAR(200) NOT NULL,
  created_at      TIMESTAMP    DEFAULT NOW(),
  UNIQUE (substance_id, alias_name)
);


-- =========================
-- 3. SUBSTANCE ↔ CATEGORY
-- =========================
-- Junction table: which substances are relevant to which product categories.

CREATE TABLE substance_categories (
  id              SERIAL PRIMARY KEY,
  substance_id    INTEGER      NOT NULL REFERENCES substances(id) ON DELETE CASCADE,
  category        VARCHAR(100) NOT NULL,
  UNIQUE (substance_id, category)
);


-- =========================
-- 4. INGREDIENT GROUPS
-- =========================
-- Chemical grouping system: preservatives, heavy metals, fragrances, etc.
-- Regulations often apply cumulative limits to an entire group.

CREATE TABLE ingredient_groups (
  id          SERIAL PRIMARY KEY,
  group_name  VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);


-- =========================
-- 5. INGREDIENT GROUP MEMBERS
-- =========================
-- Maps substances to their chemical groups.

CREATE TABLE ingredient_group_members (
  id            SERIAL PRIMARY KEY,
  group_id      INTEGER NOT NULL REFERENCES ingredient_groups(id) ON DELETE CASCADE,
  substance_id  INTEGER NOT NULL REFERENCES substances(id) ON DELETE CASCADE,
  UNIQUE (group_id, substance_id)
);


-- =========================
-- 6. INGREDIENT INTERACTIONS
-- =========================
-- Known dangerous or unstable chemical combinations.

CREATE TABLE ingredient_interactions (
  id                SERIAL PRIMARY KEY,
  substance_a_id    INTEGER NOT NULL REFERENCES substances(id),
  substance_b_id    INTEGER NOT NULL REFERENCES substances(id),
  interaction_type  VARCHAR(50) NOT NULL
                      CHECK (interaction_type IN (
                        'INCOMPATIBLE','SYNERGISTIC_TOXICITY','DEGRADES_EFFICACY','PH_CONFLICT'
                      )),
  severity          VARCHAR(20) NOT NULL CHECK (severity IN ('CRITICAL','WARNING','INFO')),
  description       TEXT NOT NULL,
  created_at        TIMESTAMP DEFAULT NOW()
);


-- =========================
-- 7. PRODUCTS
-- =========================
-- Products submitted for compliance evaluation.

CREATE TABLE products (
  id              SERIAL PRIMARY KEY,
  product_name    VARCHAR(200) NOT NULL,
  category        VARCHAR(100) NOT NULL,
  manufacturer    VARCHAR(200),
  created_at      TIMESTAMP    DEFAULT NOW()
);


-- =========================
-- 8. PRODUCT INGREDIENTS
-- =========================
-- Raw ingredient list as declared by the manufacturer.

CREATE TABLE product_ingredients (
  id                  SERIAL PRIMARY KEY,
  product_id          INTEGER      NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  substance_id        INTEGER      REFERENCES substances(id),
  raw_name            VARCHAR(200) NOT NULL,
  concentration       NUMERIC(10,4) NOT NULL,
  unit                VARCHAR(20)  NOT NULL,
  normalized_percent  NUMERIC(10,6)
);


-- =========================
-- 9. REGULATIONS
-- =========================
-- Regulatory standards (one row per standard version).

CREATE TABLE regulations (
  id              SERIAL PRIMARY KEY,
  standard_code   VARCHAR(50)  NOT NULL,
  standard_name   VARCHAR(200) NOT NULL,
  category        VARCHAR(100) NOT NULL,
  authority       VARCHAR(100) NOT NULL DEFAULT 'BIS',
  version         VARCHAR(20)  NOT NULL DEFAULT '1.0',
  effective_date  DATE,
  is_active       BOOLEAN      DEFAULT TRUE,
  created_at      TIMESTAMP    DEFAULT NOW()
);


-- =========================
-- 10. INGREDIENT LIMITS
-- =========================
-- Per-regulation substance limits / bans.

CREATE TABLE ingredient_limits (
  id              SERIAL PRIMARY KEY,
  regulation_id   INTEGER      NOT NULL REFERENCES regulations(id) ON DELETE CASCADE,
  substance_id    INTEGER      REFERENCES substances(id),
  rule_type       VARCHAR(20)  NOT NULL
                    CHECK (rule_type IN ('MIN_LIMIT', 'MAX_LIMIT', 'BANNED', 'GROUP_MAX')),
  limit_value     NUMERIC(10,4),
  unit            VARCHAR(20)  NOT NULL,
  severity        VARCHAR(20)  NOT NULL
                    CHECK (severity IN ('CRITICAL', 'WARNING', 'INFO')),
  description     TEXT
);


-- =========================
-- 11. EVALUATIONS
-- =========================
-- Result log — one row per product evaluation run.

CREATE TABLE evaluations (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER      REFERENCES users(id),
  product_name        VARCHAR(200) NOT NULL,
  category            VARCHAR(100) NOT NULL,
  status              VARCHAR(30)  NOT NULL
                        CHECK (status IN ('COMPLIANT', 'NON-COMPLIANT', 'BORDERLINE', 'NOT_EVALUATED')),
  risk_score          INTEGER      NOT NULL DEFAULT 0,
  risk_level          VARCHAR(30)  NOT NULL,
  total_violations    INTEGER      DEFAULT 0,
  total_borderlines   INTEGER      DEFAULT 0,
  missing_data_count  INTEGER      DEFAULT 0,
  regulation_id       INTEGER      REFERENCES regulations(id),
  pipeline_version    VARCHAR(10)  DEFAULT '2.0',
  ai_explanation      TEXT,
  created_at          TIMESTAMP    DEFAULT NOW()
);


-- =========================
-- 12. VIOLATIONS
-- =========================
-- Individual rule failures recorded per evaluation (backward compat).

CREATE TABLE violations (
  id              SERIAL PRIMARY KEY,
  evaluation_id   INTEGER      NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  rule_id         VARCHAR(20)  NOT NULL,
  rule_name       VARCHAR(200) NOT NULL,
  severity        VARCHAR(20)  NOT NULL,
  description     TEXT,
  limit_readable  VARCHAR(50),
  actual_percent  VARCHAR(50),
  created_at      TIMESTAMP    DEFAULT NOW()
);


-- =========================
-- 13. RULE OUTCOMES
-- =========================
-- Full audit trail: result of every rule checked against every ingredient.

CREATE TABLE rule_outcomes (
  id              SERIAL PRIMARY KEY,
  evaluation_id   INTEGER      NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  test_module     VARCHAR(50)  NOT NULL,
  rule_id         VARCHAR(20)  NOT NULL,
  rule_name       VARCHAR(200) NOT NULL,
  rule_type       VARCHAR(20)  NOT NULL,
  target_code     VARCHAR(50),
  outcome         VARCHAR(20)  NOT NULL
                    CHECK (outcome IN ('PASS','FAIL','BORDERLINE','NO_DATA','SKIPPED')),
  severity        VARCHAR(20)  NOT NULL,
  limit_value     NUMERIC(10,6),
  actual_value    NUMERIC(10,6),
  deviation_pct   NUMERIC(8,4),
  reasoning       TEXT         NOT NULL,
  created_at      TIMESTAMP    DEFAULT NOW()
);


-- =========================
-- 14. EVALUATION STAGES
-- =========================
-- Pipeline stage tracking with timing metadata.

CREATE TABLE evaluation_stages (
  id              SERIAL PRIMARY KEY,
  evaluation_id   INTEGER      NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  stage_name      VARCHAR(50)  NOT NULL,
  stage_order     INTEGER      NOT NULL,
  status          VARCHAR(20)  NOT NULL
                    CHECK (status IN ('COMPLETED','FAILED','SKIPPED')),
  duration_ms     INTEGER,
  details         JSONB,
  created_at      TIMESTAMP    DEFAULT NOW()
);


-- =========================
-- INDEXES
-- =========================

-- Substances
CREATE INDEX idx_substances_reference  ON substances(reference_code);
CREATE INDEX idx_substances_cas        ON substances(cas_number);

-- Aliases
CREATE INDEX idx_aliases_name          ON substance_aliases(alias_name);
CREATE INDEX idx_aliases_substance     ON substance_aliases(substance_id);

-- Substance ↔ Category
CREATE INDEX idx_subcat_substance      ON substance_categories(substance_id);
CREATE INDEX idx_subcat_category       ON substance_categories(category);

-- Ingredient Groups
CREATE INDEX idx_group_members_group     ON ingredient_group_members(group_id);
CREATE INDEX idx_group_members_substance ON ingredient_group_members(substance_id);

-- Ingredient Interactions
CREATE INDEX idx_interactions_a ON ingredient_interactions(substance_a_id);
CREATE INDEX idx_interactions_b ON ingredient_interactions(substance_b_id);

-- Evaluations
CREATE INDEX idx_evaluations_category  ON evaluations(category);
CREATE INDEX idx_evaluations_status    ON evaluations(status);
CREATE INDEX idx_evaluations_created   ON evaluations(created_at DESC);
CREATE INDEX idx_evaluations_user      ON evaluations(user_id);

-- Violations
CREATE INDEX idx_violations_eval       ON violations(evaluation_id);

-- Rule Outcomes
CREATE INDEX idx_rule_outcomes_eval    ON rule_outcomes(evaluation_id);
CREATE INDEX idx_rule_outcomes_outcome ON rule_outcomes(outcome);

-- Evaluation Stages
CREATE INDEX idx_eval_stages_eval      ON evaluation_stages(evaluation_id);


-- =============== migrate_v2.sql ===============
-- ============================================================
-- Migration v2.1 — Add missing tables WITHOUT dropping existing data
-- Run this instead of full schema.sql if you already have data.
-- Safe to run multiple times (uses IF NOT EXISTS / CREATE IF).
-- ============================================================

-- 0. USERS (for authentication)
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(200) NOT NULL,
  email           VARCHAR(200) UNIQUE NOT NULL,
  password_hash   VARCHAR(64)  NOT NULL,
  created_at      TIMESTAMP    DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);


-- 1. INGREDIENT GROUPS
CREATE TABLE IF NOT EXISTS ingredient_groups (
  id          SERIAL PRIMARY KEY,
  group_name  VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);


-- 2. INGREDIENT GROUP MEMBERS
CREATE TABLE IF NOT EXISTS ingredient_group_members (
  id            SERIAL PRIMARY KEY,
  group_id      INTEGER NOT NULL REFERENCES ingredient_groups(id) ON DELETE CASCADE,
  substance_id  INTEGER NOT NULL REFERENCES substances(id) ON DELETE CASCADE,
  UNIQUE (group_id, substance_id)
);
CREATE INDEX IF NOT EXISTS idx_group_members_group     ON ingredient_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_substance ON ingredient_group_members(substance_id);


-- 3. INGREDIENT INTERACTIONS
CREATE TABLE IF NOT EXISTS ingredient_interactions (
  id                SERIAL PRIMARY KEY,
  substance_a_id    INTEGER NOT NULL REFERENCES substances(id),
  substance_b_id    INTEGER NOT NULL REFERENCES substances(id),
  interaction_type  VARCHAR(50) NOT NULL
                      CHECK (interaction_type IN (
                        'INCOMPATIBLE','SYNERGISTIC_TOXICITY','DEGRADES_EFFICACY','PH_CONFLICT'
                      )),
  severity          VARCHAR(20) NOT NULL CHECK (severity IN ('CRITICAL','WARNING','INFO')),
  description       TEXT NOT NULL,
  created_at        TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_interactions_a ON ingredient_interactions(substance_a_id);
CREATE INDEX IF NOT EXISTS idx_interactions_b ON ingredient_interactions(substance_b_id);


-- 4. RULE OUTCOMES (audit trail)
CREATE TABLE IF NOT EXISTS rule_outcomes (
  id              SERIAL PRIMARY KEY,
  evaluation_id   INTEGER      NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  test_module     VARCHAR(50)  NOT NULL,
  rule_id         VARCHAR(20)  NOT NULL,
  rule_name       VARCHAR(200) NOT NULL,
  rule_type       VARCHAR(20)  NOT NULL,
  target_code     VARCHAR(50),
  outcome         VARCHAR(20)  NOT NULL
                    CHECK (outcome IN ('PASS','FAIL','BORDERLINE','NO_DATA','SKIPPED')),
  severity        VARCHAR(20)  NOT NULL,
  limit_value     NUMERIC(10,6),
  actual_value    NUMERIC(10,6),
  deviation_pct   NUMERIC(8,4),
  reasoning       TEXT         NOT NULL,
  created_at      TIMESTAMP    DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rule_outcomes_eval    ON rule_outcomes(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_rule_outcomes_outcome ON rule_outcomes(outcome);


-- 5. EVALUATION STAGES (pipeline timing)
CREATE TABLE IF NOT EXISTS evaluation_stages (
  id              SERIAL PRIMARY KEY,
  evaluation_id   INTEGER      NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  stage_name      VARCHAR(50)  NOT NULL,
  stage_order     INTEGER      NOT NULL,
  status          VARCHAR(20)  NOT NULL
                    CHECK (status IN ('COMPLETED','FAILED','SKIPPED')),
  duration_ms     INTEGER,
  details         JSONB,
  created_at      TIMESTAMP    DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_eval_stages_eval ON evaluation_stages(evaluation_id);


-- 6. Extend evaluations table with new columns (safe — only adds if missing)
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS regulation_id     INTEGER REFERENCES regulations(id);
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS pipeline_version  VARCHAR(10) DEFAULT '2.0';
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS total_borderlines INTEGER DEFAULT 0;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS missing_data_count INTEGER DEFAULT 0;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS total_violations   INTEGER DEFAULT 0;


-- 7. Seed groups (idempotent)
INSERT INTO ingredient_groups (group_name, description)
VALUES
  ('Heavy Metals', 'Toxic metallic elements — cumulative limits apply across all categories'),
  ('Preservatives', 'Antimicrobial agents — cumulative limits apply'),
  ('Chelating Agents', 'Metal-binding chemicals — environmental restrictions apply'),
  ('Fragrances', 'Aromatic compounds — allergen cumulative limits apply')
ON CONFLICT (group_name) DO NOTHING;


-- 8. Seed group memberships
INSERT INTO ingredient_group_members (group_id, substance_id)
SELECT ig.id, s.id FROM ingredient_groups ig, substances s
WHERE ig.group_name = 'Heavy Metals' AND s.reference_code IN ('CAS-7439-97-6','CAS-7439-92-1','CAS-7440-38-2')
ON CONFLICT (group_id, substance_id) DO NOTHING;

INSERT INTO ingredient_group_members (group_id, substance_id)
SELECT ig.id, s.id FROM ingredient_groups ig, substances s
WHERE ig.group_name = 'Preservatives' AND s.reference_code IN ('CAS-3380-34-5','CAS-50-00-0')
ON CONFLICT (group_id, substance_id) DO NOTHING;

INSERT INTO ingredient_group_members (group_id, substance_id)
SELECT ig.id, s.id FROM ingredient_groups ig, substances s
WHERE ig.group_name = 'Chelating Agents' AND s.reference_code = 'CAS-60-00-4'
ON CONFLICT (group_id, substance_id) DO NOTHING;


-- 9. Seed Citric Acid (needed for interactions)
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-77-92-9', 'Citric Acid', '77-92-9', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, 'Citric' FROM substances WHERE reference_code = 'CAS-77-92-9'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'CAS-77-92-9'
ON CONFLICT (substance_id, category) DO NOTHING;


-- 10. Seed interactions (idempotent via DO NOTHING if already exists)
INSERT INTO ingredient_interactions (substance_a_id, substance_b_id, interaction_type, severity, description)
SELECT a.id, b.id, 'PH_CONFLICT', 'WARNING',
  'Strong base (Sodium Hydroxide) + strong acid (Citric Acid) → exothermic reaction, unstable pH'
FROM substances a, substances b
WHERE a.reference_code = 'CAS-1310-73-2' AND b.reference_code = 'CAS-77-92-9'
  AND NOT EXISTS (
    SELECT 1 FROM ingredient_interactions
    WHERE substance_a_id = a.id AND substance_b_id = b.id
  );

INSERT INTO ingredient_interactions (substance_a_id, substance_b_id, interaction_type, severity, description)
SELECT a.id, b.id, 'SYNERGISTIC_TOXICITY', 'CRITICAL',
  'Formaldehyde + Triclosan together increase antimicrobial resistance risk beyond individual effects'
FROM substances a, substances b
WHERE a.reference_code = 'CAS-50-00-0' AND b.reference_code = 'CAS-3380-34-5'
  AND NOT EXISTS (
    SELECT 1 FROM ingredient_interactions
    WHERE substance_a_id = a.id AND substance_b_id = b.id
  );

INSERT INTO ingredient_interactions (substance_a_id, substance_b_id, interaction_type, severity, description)
SELECT a.id, b.id, 'DEGRADES_EFFICACY', 'INFO',
  'EDTA chelates Lead ions — may mask true heavy metal content in analytical testing'
FROM substances a, substances b
WHERE a.reference_code = 'CAS-60-00-4' AND b.reference_code = 'CAS-7439-92-1'
  AND NOT EXISTS (
    SELECT 1 FROM ingredient_interactions
    WHERE substance_a_id = a.id AND substance_b_id = b.id
  );

-- Done!
SELECT 'Migration v2.1 applied successfully.' AS result;


-- =============== migrate_user_history.sql ===============
-- ============================================================
-- Migration: Add user_id to evaluations for per-user history
-- Run: psql -U <user> -d compliance_db -f migrate_user_history.sql
-- ============================================================

-- 1. Add user_id column (nullable so existing rows survive)
ALTER TABLE evaluations
  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);

-- 2. Index for fast per-user history queries
CREATE INDEX IF NOT EXISTS idx_evaluations_user ON evaluations(user_id);


-- =============== shelf_life_tables.sql ===============
-- ============================================================
-- Shelf Life Prediction Tables
-- Extension to Product Compliance & Rejection Risk Analyzer
-- ============================================================

-- ============================
-- 1. SHELF LIFE PROFILES
-- ============================
-- Per-category base shelf life and degradation susceptibility multipliers.
-- One row per product category.

CREATE TABLE IF NOT EXISTS shelf_life_profiles (
  id                         SERIAL PRIMARY KEY,
  category                   VARCHAR(100) NOT NULL,
  base_shelf_life_months     INTEGER      NOT NULL,

  -- Chemical degradation susceptibility multipliers (1.0 = neutral)
  oxidation_susceptibility   NUMERIC(4,2) DEFAULT 1.0,
  hydrolysis_susceptibility  NUMERIC(4,2) DEFAULT 1.0,

  -- Microbial growth baseline risk (>1 = higher risk)
  microbial_risk_base        NUMERIC(4,2) DEFAULT 1.0,

  -- Physical stability baseline (>1 = less stable)
  physical_stability_base    NUMERIC(4,2) DEFAULT 1.0,

  created_at                 TIMESTAMP    DEFAULT NOW(),
  UNIQUE(category)
);


-- ============================
-- 2. DEGRADATION FACTORS
-- ============================
-- How specific substances affect shelf life (ingredient-level modifiers).
-- Each row describes one substance's effect on the three failure modules.

CREATE TABLE IF NOT EXISTS degradation_factors (
  id                       SERIAL PRIMARY KEY,
  substance_id             INTEGER      REFERENCES substances(id),
  reference_code           VARCHAR(50)  NOT NULL,
  category                 VARCHAR(100),           -- NULL = applies to all categories

  -- Effect on failure modules (months added/subtracted)
  chemical_effect_months   NUMERIC(5,1) DEFAULT 0,
  microbial_effect_months  NUMERIC(5,1) DEFAULT 0,
  physical_effect_months   NUMERIC(5,1) DEFAULT 0,

  -- Concentration thresholds for effect activation
  threshold_type           VARCHAR(20)  CHECK (threshold_type IN ('ABOVE', 'BELOW', 'ANY')),
  threshold_value          NUMERIC(10,4),
  threshold_unit           VARCHAR(10)  DEFAULT '%',

  description              TEXT,
  created_at               TIMESTAMP    DEFAULT NOW()
);


-- ============================
-- 3. SHELF LIFE RESULTS
-- ============================
-- Stores computed shelf life predictions (audit trail).
-- Optionally linked to a compliance evaluation.

CREATE TABLE IF NOT EXISTS shelf_life_results (
  id                    SERIAL PRIMARY KEY,
  evaluation_id         INTEGER      REFERENCES evaluations(id) ON DELETE SET NULL,
  user_id               INTEGER      REFERENCES users(id),
  product_name          VARCHAR(200) NOT NULL,
  category              VARCHAR(100) NOT NULL,

  -- User-provided optional inputs
  ph_value              NUMERIC(4,2),
  water_percent         NUMERIC(6,2),
  packaging_type        VARCHAR(30)  CHECK (packaging_type IN ('AIRTIGHT', 'SEMI_SEALED', 'OPEN')),

  -- Results stored as JSONB (flexible for multiple environments)
  environment_results   JSONB        NOT NULL,

  overall_confidence    VARCHAR(20)  CHECK (overall_confidence IN ('HIGH', 'MEDIUM', 'LOW')),
  disclaimer            TEXT         DEFAULT 'These estimates are for pre-lab planning purposes only.',
  created_at            TIMESTAMP    DEFAULT NOW()
);


-- ============================
-- INDEXES
-- ============================

CREATE INDEX IF NOT EXISTS idx_shelf_life_user     ON shelf_life_results(user_id);
CREATE INDEX IF NOT EXISTS idx_shelf_life_eval     ON shelf_life_results(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_shelf_life_category ON shelf_life_results(category);
CREATE INDEX IF NOT EXISTS idx_degradation_ref     ON degradation_factors(reference_code);
CREATE INDEX IF NOT EXISTS idx_degradation_cat     ON degradation_factors(category);


-- =============== seed.sql ===============
-- ============================================================
-- Seed Data for Compliance Analyzer  |  v2.1 (Pipeline)
-- Covers: Soap (BIS IS 2888:2004), Cookies (FSSAI 2.11.10)
-- Extensible for: Shampoo, Lotion, Sunscreen, etc.
-- ============================================================


-- =========================
-- SUBSTANCES  (19 total)
-- =========================

-- Soap substances
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('PARAM-TFM', 'Total Fatty Matter', NULL, 'parameter')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-1310-73-2', 'Sodium Hydroxide', '1310-73-2', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-3380-34-5', 'Triclosan', '3380-34-5', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-7439-97-6', 'Mercury', '7439-97-6', 'heavy_metal')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-7439-92-1', 'Lead', '7439-92-1', 'heavy_metal')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-7440-38-2', 'Arsenic', '7440-38-2', 'heavy_metal')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('PARAM-MOISTURE', 'Moisture Content', NULL, 'parameter')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-7647-14-5', 'Sodium Chloride', '7647-14-5', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-50-00-0', 'Formaldehyde', '50-00-0', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-60-00-4', 'Ethylenediaminetetraacetic Acid', '60-00-4', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-8050-09-7', 'Rosin', '8050-09-7', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

-- Substances from old DB (Glycerin, Titanium Dioxide, Phosphate)
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-56-81-5', 'Glycerin', '56-81-5', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-13463-67-7', 'Titanium Dioxide', '13463-67-7', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-14265-44-2', 'Phosphate', '14265-44-2', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

-- Cookies-specific substances
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('PARAM-TRANSFAT', 'Trans Fat', NULL, 'parameter')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-1162-65-8', 'Aflatoxin B1', '1162-65-8', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-108-78-1', 'Melamine', '108-78-1', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('PARAM-ASH', 'Acid Insoluble Ash', NULL, 'parameter')
ON CONFLICT (reference_code) DO NOTHING;

-- New: Citric Acid (needed for interaction rules)
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-77-92-9', 'Citric Acid', '77-92-9', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;


-- =========================
-- SUBSTANCE ALIASES  (25+)
-- =========================

-- TFM aliases
INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, 'TFM' FROM substances WHERE reference_code = 'PARAM-TFM'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, 'Fatty Matter' FROM substances WHERE reference_code = 'PARAM-TFM'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, 'Total Fatty Matter' FROM substances WHERE reference_code = 'PARAM-TFM'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

-- Sodium Hydroxide aliases
INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, 'Lye' FROM substances WHERE reference_code = 'CAS-1310-73-2'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, 'Caustic Soda' FROM substances WHERE reference_code = 'CAS-1310-73-2'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, 'NaOH' FROM substances WHERE reference_code = 'CAS-1310-73-2'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

-- Triclosan aliases
INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, 'Irgasan' FROM substances WHERE reference_code = 'CAS-3380-34-5'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

-- Moisture aliases
INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, 'Moisture' FROM substances WHERE reference_code = 'PARAM-MOISTURE'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, 'Water Content' FROM substances WHERE reference_code = 'PARAM-MOISTURE'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

-- Sodium Chloride aliases
INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, 'Salt' FROM substances WHERE reference_code = 'CAS-7647-14-5'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, 'Table Salt' FROM substances WHERE reference_code = 'CAS-7647-14-5'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, 'NaCl' FROM substances WHERE reference_code = 'CAS-7647-14-5'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

-- Formaldehyde aliases
INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, 'Formalin' FROM substances WHERE reference_code = 'CAS-50-00-0'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

-- EDTA aliases
INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, 'EDTA' FROM substances WHERE reference_code = 'CAS-60-00-4'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

-- Rosin aliases
INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, 'Colophony' FROM substances WHERE reference_code = 'CAS-8050-09-7'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

-- Glycerin aliases
INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, 'Glycerol' FROM substances WHERE reference_code = 'CAS-56-81-5'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

-- Titanium Dioxide aliases
INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, 'TiO2' FROM substances WHERE reference_code = 'CAS-13463-67-7'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

-- Trans Fat aliases
INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, 'Trans Fatty Acid' FROM substances WHERE reference_code = 'PARAM-TRANSFAT'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, 'TFA' FROM substances WHERE reference_code = 'PARAM-TRANSFAT'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

-- Acid Insoluble Ash aliases
INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, 'Ash' FROM substances WHERE reference_code = 'PARAM-ASH'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

-- Citric Acid aliases
INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, 'Citric' FROM substances WHERE reference_code = 'CAS-77-92-9'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, 'Vitamin C Acid' FROM substances WHERE reference_code = 'CAS-77-92-9'
ON CONFLICT (substance_id, alias_name) DO NOTHING;


-- =========================
-- SUBSTANCE ↔ CATEGORY
-- =========================

-- Soap-relevant substances
INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'PARAM-TFM'
ON CONFLICT (substance_id, category) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'CAS-1310-73-2'
ON CONFLICT (substance_id, category) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'CAS-3380-34-5'
ON CONFLICT (substance_id, category) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'CAS-7439-97-6'
ON CONFLICT (substance_id, category) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'CAS-7439-92-1'
ON CONFLICT (substance_id, category) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'CAS-7440-38-2'
ON CONFLICT (substance_id, category) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'PARAM-MOISTURE'
ON CONFLICT (substance_id, category) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'CAS-7647-14-5'
ON CONFLICT (substance_id, category) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'CAS-50-00-0'
ON CONFLICT (substance_id, category) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'CAS-60-00-4'
ON CONFLICT (substance_id, category) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'CAS-8050-09-7'
ON CONFLICT (substance_id, category) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'CAS-56-81-5'
ON CONFLICT (substance_id, category) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'CAS-13463-67-7'
ON CONFLICT (substance_id, category) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'CAS-14265-44-2'
ON CONFLICT (substance_id, category) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'CAS-77-92-9'
ON CONFLICT (substance_id, category) DO NOTHING;

-- Cookies-relevant substances
INSERT INTO substance_categories (substance_id, category)
SELECT id, 'cookies' FROM substances WHERE reference_code = 'PARAM-TRANSFAT'
ON CONFLICT (substance_id, category) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'cookies' FROM substances WHERE reference_code = 'CAS-1162-65-8'
ON CONFLICT (substance_id, category) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'cookies' FROM substances WHERE reference_code = 'CAS-108-78-1'
ON CONFLICT (substance_id, category) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'cookies' FROM substances WHERE reference_code = 'PARAM-MOISTURE'
ON CONFLICT (substance_id, category) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'cookies' FROM substances WHERE reference_code = 'PARAM-ASH'
ON CONFLICT (substance_id, category) DO NOTHING;

-- Cross-category substances (heavy metals are banned globally)
INSERT INTO substance_categories (substance_id, category)
SELECT id, 'cookies' FROM substances WHERE reference_code = 'CAS-7439-92-1'
ON CONFLICT (substance_id, category) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'cookies' FROM substances WHERE reference_code = 'CAS-7440-38-2'
ON CONFLICT (substance_id, category) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'cookies' FROM substances WHERE reference_code = 'CAS-7439-97-6'
ON CONFLICT (substance_id, category) DO NOTHING;


-- =========================
-- INGREDIENT GROUPS
-- =========================

INSERT INTO ingredient_groups (group_name, description)
VALUES ('Heavy Metals', 'Toxic metallic elements subject to strict cumulative limits across all product categories')
ON CONFLICT (group_name) DO NOTHING;

INSERT INTO ingredient_groups (group_name, description)
VALUES ('Preservatives', 'Antimicrobial agents used to extend shelf life; cumulative limits often apply')
ON CONFLICT (group_name) DO NOTHING;

INSERT INTO ingredient_groups (group_name, description)
VALUES ('Chelating Agents', 'Metal-binding chemicals used to improve stability; environmental restrictions apply')
ON CONFLICT (group_name) DO NOTHING;

INSERT INTO ingredient_groups (group_name, description)
VALUES ('Fragrances', 'Aromatic compounds added for scent; cumulative limits for allergen control')
ON CONFLICT (group_name) DO NOTHING;


-- =========================
-- INGREDIENT GROUP MEMBERS
-- =========================

-- Heavy Metals group
INSERT INTO ingredient_group_members (group_id, substance_id)
SELECT ig.id, s.id FROM ingredient_groups ig, substances s
WHERE ig.group_name = 'Heavy Metals' AND s.reference_code = 'CAS-7439-97-6'
ON CONFLICT (group_id, substance_id) DO NOTHING;

INSERT INTO ingredient_group_members (group_id, substance_id)
SELECT ig.id, s.id FROM ingredient_groups ig, substances s
WHERE ig.group_name = 'Heavy Metals' AND s.reference_code = 'CAS-7439-92-1'
ON CONFLICT (group_id, substance_id) DO NOTHING;

INSERT INTO ingredient_group_members (group_id, substance_id)
SELECT ig.id, s.id FROM ingredient_groups ig, substances s
WHERE ig.group_name = 'Heavy Metals' AND s.reference_code = 'CAS-7440-38-2'
ON CONFLICT (group_id, substance_id) DO NOTHING;

-- Preservatives group
INSERT INTO ingredient_group_members (group_id, substance_id)
SELECT ig.id, s.id FROM ingredient_groups ig, substances s
WHERE ig.group_name = 'Preservatives' AND s.reference_code = 'CAS-3380-34-5'
ON CONFLICT (group_id, substance_id) DO NOTHING;

INSERT INTO ingredient_group_members (group_id, substance_id)
SELECT ig.id, s.id FROM ingredient_groups ig, substances s
WHERE ig.group_name = 'Preservatives' AND s.reference_code = 'CAS-50-00-0'
ON CONFLICT (group_id, substance_id) DO NOTHING;

-- Chelating Agents group
INSERT INTO ingredient_group_members (group_id, substance_id)
SELECT ig.id, s.id FROM ingredient_groups ig, substances s
WHERE ig.group_name = 'Chelating Agents' AND s.reference_code = 'CAS-60-00-4'
ON CONFLICT (group_id, substance_id) DO NOTHING;


-- =========================
-- INGREDIENT INTERACTIONS
-- =========================

-- NaOH + Citric Acid → pH Conflict
INSERT INTO ingredient_interactions (substance_a_id, substance_b_id, interaction_type, severity, description)
SELECT a.id, b.id, 'PH_CONFLICT', 'WARNING',
  'Strong base (Sodium Hydroxide) combined with strong acid (Citric Acid) may cause exothermic reaction and unstable pH in formulation'
FROM substances a, substances b
WHERE a.reference_code = 'CAS-1310-73-2' AND b.reference_code = 'CAS-77-92-9';

-- Formaldehyde + Triclosan → Synergistic Toxicity
INSERT INTO ingredient_interactions (substance_a_id, substance_b_id, interaction_type, severity, description)
SELECT a.id, b.id, 'SYNERGISTIC_TOXICITY', 'CRITICAL',
  'Combined presence of Formaldehyde and Triclosan increases antimicrobial resistance risk and allergenicity beyond individual effects'
FROM substances a, substances b
WHERE a.reference_code = 'CAS-50-00-0' AND b.reference_code = 'CAS-3380-34-5';

-- EDTA + Lead → Degrades Efficacy
INSERT INTO ingredient_interactions (substance_a_id, substance_b_id, interaction_type, severity, description)
SELECT a.id, b.id, 'DEGRADES_EFFICACY', 'INFO',
  'EDTA chelates Lead ions, potentially masking true heavy metal content during analytical testing and giving false-negative results'
FROM substances a, substances b
WHERE a.reference_code = 'CAS-60-00-4' AND b.reference_code = 'CAS-7439-92-1';


-- =========================
-- REGULATIONS
-- =========================

INSERT INTO regulations (standard_code, standard_name, category, authority, version, effective_date, is_active)
VALUES ('IS-2888-2004', 'BIS IS 2888:2004 - Toilet Soaps', 'soap', 'BIS', '1.0', '2004-01-01', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO regulations (standard_code, standard_name, category, authority, version, effective_date, is_active)
VALUES ('FSSAI-2.11.10', 'FSSAI 2.11.10 - Cookies & Biscuits', 'cookies', 'FSSAI', '1.0', '2020-01-01', TRUE)
ON CONFLICT DO NOTHING;


-- =========================
-- INGREDIENT LIMITS (mirror of JSON rules)
-- =========================

-- Soap rules (IS 2888:2004)
INSERT INTO ingredient_limits (regulation_id, substance_id, rule_type, limit_value, unit, severity, description)
SELECT r.id, s.id, 'MIN_LIMIT', 76.0, '%', 'CRITICAL', 'Grade 1 soap must have at least 76% TFM.'
FROM regulations r, substances s
WHERE r.standard_code = 'IS-2888-2004' AND s.reference_code = 'PARAM-TFM';

INSERT INTO ingredient_limits (regulation_id, substance_id, rule_type, limit_value, unit, severity, description)
SELECT r.id, s.id, 'MAX_LIMIT', 0.05, '%', 'WARNING', 'Excess alkali can cause skin irritation.'
FROM regulations r, substances s
WHERE r.standard_code = 'IS-2888-2004' AND s.reference_code = 'CAS-1310-73-2';

INSERT INTO ingredient_limits (regulation_id, substance_id, rule_type, limit_value, unit, severity, description)
SELECT r.id, s.id, 'MAX_LIMIT', 0.3, '%', 'CRITICAL', 'Restricted due to potential endocrine disruption.'
FROM regulations r, substances s
WHERE r.standard_code = 'IS-2888-2004' AND s.reference_code = 'CAS-3380-34-5';

INSERT INTO ingredient_limits (regulation_id, substance_id, rule_type, limit_value, unit, severity, description)
SELECT r.id, s.id, 'BANNED', 0, '%', 'CRITICAL', 'Mercury is toxic and strictly banned in cosmetics.'
FROM regulations r, substances s
WHERE r.standard_code = 'IS-2888-2004' AND s.reference_code = 'CAS-7439-97-6';

INSERT INTO ingredient_limits (regulation_id, substance_id, rule_type, limit_value, unit, severity, description)
SELECT r.id, s.id, 'MAX_LIMIT', 15.0, '%', 'WARNING', 'Moisture content must not exceed 15% for Grade 1 soap.'
FROM regulations r, substances s
WHERE r.standard_code = 'IS-2888-2004' AND s.reference_code = 'PARAM-MOISTURE';

INSERT INTO ingredient_limits (regulation_id, substance_id, rule_type, limit_value, unit, severity, description)
SELECT r.id, s.id, 'MAX_LIMIT', 1.0, '%', 'WARNING', 'Excess chloride degrades soap quality and lather.'
FROM regulations r, substances s
WHERE r.standard_code = 'IS-2888-2004' AND s.reference_code = 'CAS-7647-14-5';

INSERT INTO ingredient_limits (regulation_id, substance_id, rule_type, limit_value, unit, severity, description)
SELECT r.id, s.id, 'BANNED', 0, '%', 'CRITICAL', 'Formaldehyde is a known carcinogen and is banned in soap.'
FROM regulations r, substances s
WHERE r.standard_code = 'IS-2888-2004' AND s.reference_code = 'CAS-50-00-0';

INSERT INTO ingredient_limits (regulation_id, substance_id, rule_type, limit_value, unit, severity, description)
SELECT r.id, s.id, 'MAX_LIMIT', 0.1, '%', 'WARNING', 'EDTA must not exceed 0.1% due to environmental concerns.'
FROM regulations r, substances s
WHERE r.standard_code = 'IS-2888-2004' AND s.reference_code = 'CAS-60-00-4';

INSERT INTO ingredient_limits (regulation_id, substance_id, rule_type, limit_value, unit, severity, description)
SELECT r.id, s.id, 'MAX_LIMIT', 25.0, '%', 'WARNING', 'Rosin content allowed up to 25% as per BIS standards.'
FROM regulations r, substances s
WHERE r.standard_code = 'IS-2888-2004' AND s.reference_code = 'CAS-8050-09-7';

-- Cookies rules (FSSAI 2.11.10)
INSERT INTO ingredient_limits (regulation_id, substance_id, rule_type, limit_value, unit, severity, description)
SELECT r.id, s.id, 'MAX_LIMIT', 2.0, '%', 'CRITICAL', 'Trans fat must not exceed 2% of total fat content.'
FROM regulations r, substances s
WHERE r.standard_code = 'FSSAI-2.11.10' AND s.reference_code = 'PARAM-TRANSFAT';

INSERT INTO ingredient_limits (regulation_id, substance_id, rule_type, limit_value, unit, severity, description)
SELECT r.id, s.id, 'MAX_LIMIT', 1.0, 'ppm', 'CRITICAL', 'Aflatoxin B1 is a potent carcinogen; max 1 ppm.'
FROM regulations r, substances s
WHERE r.standard_code = 'FSSAI-2.11.10' AND s.reference_code = 'CAS-1162-65-8';

INSERT INTO ingredient_limits (regulation_id, substance_id, rule_type, limit_value, unit, severity, description)
SELECT r.id, s.id, 'BANNED', 0, '%', 'CRITICAL', 'Melamine is banned in food products.'
FROM regulations r, substances s
WHERE r.standard_code = 'FSSAI-2.11.10' AND s.reference_code = 'CAS-108-78-1';

INSERT INTO ingredient_limits (regulation_id, substance_id, rule_type, limit_value, unit, severity, description)
SELECT r.id, s.id, 'MAX_LIMIT', 6.0, '%', 'WARNING', 'Moisture must not exceed 6% for shelf stability.'
FROM regulations r, substances s
WHERE r.standard_code = 'FSSAI-2.11.10' AND s.reference_code = 'PARAM-MOISTURE';

INSERT INTO ingredient_limits (regulation_id, substance_id, rule_type, limit_value, unit, severity, description)
SELECT r.id, s.id, 'MAX_LIMIT', 0.1, '%', 'WARNING', 'Acid insoluble ash must not exceed 0.1%.'
FROM regulations r, substances s
WHERE r.standard_code = 'FSSAI-2.11.10' AND s.reference_code = 'PARAM-ASH';


-- =============== registry_expansion.sql ===============
-- ============================================================
-- Registry Expansion v2.2
-- Adds ~35 common soap, cookie, and cosmetic ingredients.
-- Safe to run multiple times — all inserts use ON CONFLICT DO NOTHING.
-- ============================================================

-- ── SOLVENTS ──────────────────────────────────────────────────

INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-7732-18-5', 'Water', '7732-18-5', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Water'),('Aqua'),('Purified Water'),('Distilled Water'),('Deionised Water'),
        ('DI Water'),('Deionized Water'),('H2O')) AS a(alias)
WHERE s.reference_code = 'CAS-7732-18-5'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, cat FROM substances s,
(VALUES ('soap'),('cookies')) AS c(cat)
WHERE s.reference_code = 'CAS-7732-18-5'
ON CONFLICT (substance_id, category) DO NOTHING;


-- ── SURFACTANTS ───────────────────────────────────────────────

INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-151-21-3', 'Sodium Lauryl Sulfate', '151-21-3', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('SLS'),('Sodium Dodecyl Sulfate'),('SDS'),('Sodium Lauryl Sulphate'),
        ('Dodecyl Sodium Sulfate'),('Sodium Laurilsulfate')) AS a(alias)
WHERE s.reference_code = 'CAS-151-21-3'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'CAS-151-21-3'
ON CONFLICT (substance_id, category) DO NOTHING;


INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-9004-82-4', 'Sodium Laureth Sulfate', '9004-82-4', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('SLES'),('Sodium Lauryl Ether Sulfate'),('Sodium Polyoxyethylene Lauryl Sulfate'),
        ('SODIUM LAURETH SULPHATE')) AS a(alias)
WHERE s.reference_code = 'CAS-9004-82-4'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'CAS-9004-82-4'
ON CONFLICT (substance_id, category) DO NOTHING;


INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-61789-40-0', 'Cocamidopropyl Betaine', '61789-40-0', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('CAPB'),('Cocoamidopropyl Betaine'),('Cocamidopropyl Betaine'),
        ('Coco Betaine'),('Cocobetaine')) AS a(alias)
WHERE s.reference_code = 'CAS-61789-40-0'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'CAS-61789-40-0'
ON CONFLICT (substance_id, category) DO NOTHING;


INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-61789-31-9', 'Sodium Cocoate', '61789-31-9', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Sodium Cocoate'),('Coconut Soap'),('Saponified Coconut Oil'),
        ('Sodium Coconut Oil Soap'),('Coco Soap')) AS a(alias)
WHERE s.reference_code = 'CAS-61789-31-9'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'CAS-61789-31-9'
ON CONFLICT (substance_id, category) DO NOTHING;


-- ── ALKALIS ───────────────────────────────────────────────────

-- Sodium Hydroxide already exists — add more aliases
INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('NaOH'),('Caustic Soda'),('Lye'),('Sodium Hydrate'),
        ('Soda Lye'),('White Caustic')) AS a(alias)
WHERE s.reference_code = 'CAS-1310-73-2'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-1310-58-3', 'Potassium Hydroxide', '1310-58-3', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('KOH'),('Caustic Potash'),('Potassium Hydrate'),('Potash Lye')) AS a(alias)
WHERE s.reference_code = 'CAS-1310-58-3'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'CAS-1310-58-3'
ON CONFLICT (substance_id, category) DO NOTHING;


-- ── OILS & FATS ───────────────────────────────────────────────

INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-8001-31-8', 'Coconut Oil', '8001-31-8', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Coconut Oil'),('Copra Oil'),('Cocos Nucifera Oil'),
        ('Virgin Coconut Oil'),('VCO'),('RBD Coconut Oil')) AS a(alias)
WHERE s.reference_code = 'CAS-8001-31-8'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'CAS-8001-31-8'
ON CONFLICT (substance_id, category) DO NOTHING;


INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-8002-75-3', 'Palm Oil', '8002-75-3', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Palm Oil'),('Elaeis Guineensis Oil'),('RBD Palm Oil'),
        ('Crude Palm Oil'),('CPO')) AS a(alias)
WHERE s.reference_code = 'CAS-8002-75-3'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'CAS-8002-75-3'
ON CONFLICT (substance_id, category) DO NOTHING;


INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-8001-25-0', 'Olive Oil', '8001-25-0', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Olive Oil'),('Olea Europaea Oil'),('Extra Virgin Olive Oil'),
        ('EVOO'),('Saponified Olive Oil')) AS a(alias)
WHERE s.reference_code = 'CAS-8001-25-0'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'CAS-8001-25-0'
ON CONFLICT (substance_id, category) DO NOTHING;


INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-8001-78-3', 'Castor Oil', '8001-78-3', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Castor Oil'),('Ricinus Communis Oil'),('Cold Pressed Castor Oil')) AS a(alias)
WHERE s.reference_code = 'CAS-8001-78-3'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'CAS-8001-78-3'
ON CONFLICT (substance_id, category) DO NOTHING;


INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-91080-23-8', 'Shea Butter', '91080-23-8', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Shea Butter'),('Butyrospermum Parkii Butter'),
        ('Karite Butter'),('Shea')) AS a(alias)
WHERE s.reference_code = 'CAS-91080-23-8'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'CAS-91080-23-8'
ON CONFLICT (substance_id, category) DO NOTHING;


-- ── HUMECTANTS / CONDITIONERS ─────────────────────────────────

-- Glycerin already exists — add more aliases
INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Glycerin'),('Glycerol'),('Glycerine'),
        ('Vegetable Glycerin'),('Propane-1,2,3-triol')) AS a(alias)
WHERE s.reference_code = 'CAS-56-81-5'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, cat FROM substances s,
(VALUES ('soap'),('cookies')) AS c(cat)
WHERE s.reference_code = 'CAS-56-81-5'
ON CONFLICT (substance_id, category) DO NOTHING;


INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-8006-54-0', 'Lanolin', '8006-54-0', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Lanolin'),('Wool Wax'),('Wool Fat'),('Adeps Lanae')) AS a(alias)
WHERE s.reference_code = 'CAS-8006-54-0'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'CAS-8006-54-0'
ON CONFLICT (substance_id, category) DO NOTHING;


INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-94-26-8', 'Butylparaben', '94-26-8', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Butylparaben'),('Butyl Paraben'),('Butyl p-Hydroxybenzoate'),
        ('n-Butyl Paraben'),('Parabens')) AS a(alias)
WHERE s.reference_code = 'CAS-94-26-8'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'CAS-94-26-8'
ON CONFLICT (substance_id, category) DO NOTHING;


-- ── FRAGRANCES ────────────────────────────────────────────────

INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('FRAG-MIXTURE', 'Fragrance Mixture', NULL, 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Fragrance'),('Fragrance Mixture'),('Parfum'),('Perfume'),
        ('Scent'),('Aroma'),('Essential Oil Blend'),
        ('Natural Fragrance'),('Synthetic Fragrance'),('Fragrant Oil')) AS a(alias)
WHERE s.reference_code = 'FRAG-MIXTURE'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'FRAG-MIXTURE'
ON CONFLICT (substance_id, category) DO NOTHING;


INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-78-70-6', 'Linalool', '78-70-6', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Linalool'),('3,7-Dimethylocta-1,6-dien-3-ol'),('Linalyl Alcohol')) AS a(alias)
WHERE s.reference_code = 'CAS-78-70-6'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'CAS-78-70-6'
ON CONFLICT (substance_id, category) DO NOTHING;


INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-5989-27-5', 'Limonene', '5989-27-5', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Limonene'),('D-Limonene'),('Dipentene'),('Carvene')) AS a(alias)
WHERE s.reference_code = 'CAS-5989-27-5'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'CAS-5989-27-5'
ON CONFLICT (substance_id, category) DO NOTHING;


-- ── COLORANTS ─────────────────────────────────────────────────

INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('COLOR-GENERIC', 'Colorant', NULL, 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Colorant'),('Colour'),('Color'),('FD&C Dye'),('Food Dye'),
        ('Pigment'),('Cosmetic Dye'),('Soap Colorant'),('Lab Dye'),
        ('Soap Dye'),('Oxide Pigment'),('Mica Powder')) AS a(alias)
WHERE s.reference_code = 'COLOR-GENERIC'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'COLOR-GENERIC'
ON CONFLICT (substance_id, category) DO NOTHING;


-- Iron Oxide (common colorant)
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-1309-37-1', 'Iron Oxide', '1309-37-1', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Iron Oxide'),('Ferric Oxide'),('Red Iron Oxide'),
        ('Yellow Iron Oxide'),('Black Iron Oxide'),('CI 77491'),('CI 77492')) AS a(alias)
WHERE s.reference_code = 'CAS-1309-37-1'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code = 'CAS-1309-37-1'
ON CONFLICT (substance_id, category) DO NOTHING;


-- Titanium Dioxide — already exists, add aliases
INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Titanium Dioxide'),('TiO2'),('CI 77891'),('Titanium White')) AS a(alias)
WHERE s.reference_code = 'CAS-13463-67-7'
ON CONFLICT (substance_id, alias_name) DO NOTHING;


-- ── BUILDERS / SALTS ──────────────────────────────────────────

-- Sodium Chloride — already exists, add aliases
INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Sodium Chloride'),('Salt'),('Table Salt'),('Sea Salt'),('NaCl'),
        ('Common Salt'),('Rock Salt'),('Saline')) AS a(alias)
WHERE s.reference_code = 'CAS-7647-14-5'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, cat FROM substances s,
(VALUES ('soap'),('cookies')) AS c(cat)
WHERE s.reference_code = 'CAS-7647-14-5'
ON CONFLICT (substance_id, category) DO NOTHING;


-- ── ANTIOXIDANTS (COOKIES) ────────────────────────────────────

INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-128-37-0', 'Butylated Hydroxytoluene', '128-37-0', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('BHT'),('Butylated Hydroxytoluene'),('Ionol'),('Butylhydroxytoluene'),
        ('Antioxidant BHT')) AS a(alias)
WHERE s.reference_code = 'CAS-128-37-0'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'cookies' FROM substances WHERE reference_code = 'CAS-128-37-0'
ON CONFLICT (substance_id, category) DO NOTHING;


INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-25013-16-5', 'Butylated Hydroxyanisole', '25013-16-5', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('BHA'),('Butylated Hydroxyanisole'),('tert-Butyl-4-methoxyphenol'),
        ('Antioxidant BHA')) AS a(alias)
WHERE s.reference_code = 'CAS-25013-16-5'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'cookies' FROM substances WHERE reference_code = 'CAS-25013-16-5'
ON CONFLICT (substance_id, category) DO NOTHING;


-- ── SOAP INGREDIENT GROUPS (fragrance + colorant) ─────────────

INSERT INTO ingredient_groups (group_name, description)
VALUES
  ('Fragrances', 'Total fragrance compounds — cumulative EU Cosmetics Reg limit applies'),
  ('Colorants',  'Total colorant and pigment compounds — cumulative EU limit applies'),
  ('Surfactants','Total surfactant content — minimum required for detergency')
ON CONFLICT (group_name) DO NOTHING;

-- Fragrance group members
INSERT INTO ingredient_group_members (group_id, substance_id)
SELECT ig.id, s.id FROM ingredient_groups ig, substances s
WHERE ig.group_name = 'Fragrances'
  AND s.reference_code IN ('FRAG-MIXTURE','CAS-78-70-6','CAS-5989-27-5')
ON CONFLICT (group_id, substance_id) DO NOTHING;

-- Colorant group members
INSERT INTO ingredient_group_members (group_id, substance_id)
SELECT ig.id, s.id FROM ingredient_groups ig, substances s
WHERE ig.group_name = 'Colorants'
  AND s.reference_code IN ('COLOR-GENERIC','CAS-1309-37-1','CAS-13463-67-7')
ON CONFLICT (group_id, substance_id) DO NOTHING;

-- Surfactant group members
INSERT INTO ingredient_group_members (group_id, substance_id)
SELECT ig.id, s.id FROM ingredient_groups ig, substances s
WHERE ig.group_name = 'Surfactants'
  AND s.reference_code IN ('CAS-151-21-3','CAS-9004-82-4','CAS-61789-40-0','CAS-61789-31-9')
ON CONFLICT (group_id, substance_id) DO NOTHING;


-- ── COOKIES ALIASES ADDITIONS ─────────────────────────────────

-- Trans Fat aliases
INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Trans Fat'),('Trans Fatty Acids'),('TFA'),
        ('Partially Hydrogenated Oil'),('PHO')) AS a(alias)
WHERE s.reference_code = 'PARAM-TRANSFAT'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

-- Moisture aliases for cookies
INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Moisture'),('Moisture Content'),('Water Activity'),
        ('Free Moisture'),('Bound Moisture')) AS a(alias)
WHERE s.reference_code = 'PARAM-MOISTURE'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

-- Aflatoxin aliases
INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Aflatoxin B1'),('Aflatoxin'),('AFT B1'),('Aflatoxin-B1')) AS a(alias)
WHERE s.reference_code = 'CAS-1162-65-8'
ON CONFLICT (substance_id, alias_name) DO NOTHING;


-- ── VERIFY ────────────────────────────────────────────────────
SELECT COUNT(*) AS total_substances FROM substances;
SELECT COUNT(*) AS total_aliases    FROM substance_aliases;
SELECT COUNT(*) AS total_groups     FROM ingredient_groups;


-- =============== substance_expansion_v3.sql ===============
-- ============================================================
-- Registry Expansion v3.0 — Complete Ingredient Coverage
-- Adds missing substances, aliases, and category mappings for
-- all 6 product types to ensure key ingredients are recognized.
-- Safe to run multiple times (ON CONFLICT DO NOTHING).
-- ============================================================


-- ══════════════════════════════════════════════════════════════
-- HAIR OIL — Missing: Base Oil alias, Herbal Extracts, Almond Oil
-- ══════════════════════════════════════════════════════════════

-- "Base Oil" should resolve to a generic parameter (not penalized)
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('PARAM-BASE-OIL', 'Base Oil', NULL, 'parameter')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Base Oil'),('Base Oils'),('Carrier Oil'),('Carrier Oils'),
        ('Hair Oil Base'),('Oil Base'),('Vegetable Oil Base')) AS a(alias)
WHERE s.reference_code = 'PARAM-BASE-OIL'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'hairoil' FROM substances WHERE reference_code = 'PARAM-BASE-OIL'
ON CONFLICT (substance_id, category) DO NOTHING;

-- Almond Oil
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-8007-69-0', 'Almond Oil', '8007-69-0', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Almond Oil'),('Sweet Almond Oil'),('Prunus Amygdalus Dulcis Oil'),
        ('Badam Oil'),('Badam Tel')) AS a(alias)
WHERE s.reference_code = 'CAS-8007-69-0'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'hairoil' FROM substances WHERE reference_code = 'CAS-8007-69-0'
ON CONFLICT (substance_id, category) DO NOTHING;

-- Herbal Extracts (generic parameter)
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('PARAM-HERBAL-EXTRACT', 'Herbal Extracts', NULL, 'parameter')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Herbal Extracts'),('Herbal Extract'),('Herbal'),('Plant Extract'),
        ('Plant Extracts'),('Botanical Extract'),('Botanical Extracts'),
        ('Aloe Vera Extract'),('Aloe Vera'),('Amla Extract'),('Amla'),
        ('Bhringraj Extract'),('Bhringraj'),('Brahmi Extract'),('Brahmi'),
        ('Neem Extract'),('Neem'),('Hibiscus Extract'),('Hibiscus'),
        ('Fenugreek Extract'),('Methi Extract'),('Tea Tree Extract')) AS a(alias)
WHERE s.reference_code = 'PARAM-HERBAL-EXTRACT'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'hairoil' FROM substances WHERE reference_code = 'PARAM-HERBAL-EXTRACT'
ON CONFLICT (substance_id, category) DO NOTHING;

-- Map existing oils to hairoil category (if not already)
INSERT INTO substance_categories (substance_id, category)
SELECT id, 'hairoil' FROM substances WHERE reference_code IN (
  'CAS-8001-31-8',   -- Coconut Oil
  'CAS-8001-78-3',   -- Castor Oil
  'CAS-8001-25-0'    -- Olive Oil
)
ON CONFLICT (substance_id, category) DO NOTHING;


-- ══════════════════════════════════════════════════════════════
-- TALCUM POWDER — Missing: Cosmetic Talc, Zinc Oxide, MgCO3
-- ══════════════════════════════════════════════════════════════

-- Cosmetic Talc (main ingredient — should not be penalized)
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-14807-96-6', 'Cosmetic Talc', '14807-96-6', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Cosmetic Talc'),('Talc'),('Talcum'),('Talcum Powder'),
        ('Hydrated Magnesium Silicate'),('Magnesium Silicate'),
        ('French Chalk'),('Soapstone Powder')) AS a(alias)
WHERE s.reference_code = 'CAS-14807-96-6'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'talcum' FROM substances WHERE reference_code = 'CAS-14807-96-6'
ON CONFLICT (substance_id, category) DO NOTHING;

-- Zinc Oxide
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-1314-13-2', 'Zinc Oxide', '1314-13-2', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Zinc Oxide'),('ZnO'),('Chinese White'),('Zinc White')) AS a(alias)
WHERE s.reference_code = 'CAS-1314-13-2'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'talcum' FROM substances WHERE reference_code = 'CAS-1314-13-2'
ON CONFLICT (substance_id, category) DO NOTHING;

-- Magnesium Carbonate
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-546-93-0', 'Magnesium Carbonate', '546-93-0', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Magnesium Carbonate'),('MgCO3'),('Magnesite'),
        ('Light Magnesium Carbonate'),('Heavy Magnesium Carbonate')) AS a(alias)
WHERE s.reference_code = 'CAS-546-93-0'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'talcum' FROM substances WHERE reference_code = 'CAS-546-93-0'
ON CONFLICT (substance_id, category) DO NOTHING;


-- ══════════════════════════════════════════════════════════════
-- LOTION — Missing: Water mapping, Shea Butter mapping, Citric Acid mapping
-- ══════════════════════════════════════════════════════════════

-- Map existing substances to lotion category
INSERT INTO substance_categories (substance_id, category)
SELECT id, 'lotion' FROM substances WHERE reference_code IN (
  'CAS-7732-18-5',   -- Water
  'CAS-56-81-5',     -- Glycerin
  'CAS-91080-23-8',  -- Shea Butter
  'CAS-8001-25-0',   -- Olive Oil
  'CAS-77-92-9',     -- Citric Acid
  'CAS-7439-92-1',   -- Lead
  'CAS-7440-38-2',   -- Arsenic
  'CAS-7439-97-6',   -- Mercury
  'FRAG-MIXTURE',    -- Fragrances
  'CAS-78-70-6',     -- Linalool
  'CAS-5989-27-5'    -- Limonene
)
ON CONFLICT (substance_id, category) DO NOTHING;

-- Cetyl Alcohol (already in lotion rules but might not be in DB)
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-36653-82-4', 'Cetyl Alcohol', '36653-82-4', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Cetyl Alcohol'),('Palmityl Alcohol'),('1-Hexadecanol'),
        ('Cetanol'),('C16 Alcohol')) AS a(alias)
WHERE s.reference_code = 'CAS-36653-82-4'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'lotion' FROM substances WHERE reference_code = 'CAS-36653-82-4'
ON CONFLICT (substance_id, category) DO NOTHING;

-- Stearic Acid
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-57-11-4', 'Stearic Acid', '57-11-4', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Stearic Acid'),('Octadecanoic Acid'),('Stearin'),
        ('Stearic'),('Glyceryl Stearate')) AS a(alias)
WHERE s.reference_code = 'CAS-57-11-4'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'lotion' FROM substances WHERE reference_code = 'CAS-57-11-4'
ON CONFLICT (substance_id, category) DO NOTHING;

-- Parameters: pH
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('PARAM-PH', 'pH Level', NULL, 'parameter')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('pH'),('pH Level'),('Acidity Level'),('pH Value')) AS a(alias)
WHERE s.reference_code = 'PARAM-PH'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'lotion' FROM substances WHERE reference_code = 'PARAM-PH'
ON CONFLICT (substance_id, category) DO NOTHING;

-- Methylparaben
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-99-76-3', 'Methylparaben', '99-76-3', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Methylparaben'),('Methyl Paraben'),('Methyl p-Hydroxybenzoate'),
        ('Methyl 4-Hydroxybenzoate'),('Nipagin M'),('Preservative')) AS a(alias)
WHERE s.reference_code = 'CAS-99-76-3'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, cat FROM substances s,
(VALUES ('lotion'),('talcum'),('hairoil')) AS c(cat)
WHERE s.reference_code = 'CAS-99-76-3'
ON CONFLICT (substance_id, category) DO NOTHING;

-- Butylparaben — map to lotion
INSERT INTO substance_categories (substance_id, category)
SELECT id, 'lotion' FROM substances WHERE reference_code = 'CAS-94-26-8'
ON CONFLICT (substance_id, category) DO NOTHING;


-- ══════════════════════════════════════════════════════════════
-- BODY SPRAY / DEODORANT — Missing: Ethanol, Butane, Isobutane
-- ══════════════════════════════════════════════════════════════

-- Ethanol
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-64-17-5', 'Ethanol', '64-17-5', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Ethanol'),('Ethyl Alcohol'),('Alcohol'),('Denatured Alcohol'),
        ('Alcohol Denat'),('SD Alcohol'),('Grain Alcohol'),
        ('Drinking Alcohol'),('Perfumer Alcohol')) AS a(alias)
WHERE s.reference_code = 'CAS-64-17-5'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'perfume' FROM substances WHERE reference_code = 'CAS-64-17-5'
ON CONFLICT (substance_id, category) DO NOTHING;

-- Butane (propellant)
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-106-97-8', 'Butane', '106-97-8', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Butane'),('n-Butane'),('Isobutane'),('Propellant'),
        ('LPG Propellant'),('Propane'),('Butane Propellant')) AS a(alias)
WHERE s.reference_code = 'CAS-106-97-8'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'perfume' FROM substances WHERE reference_code = 'CAS-106-97-8'
ON CONFLICT (substance_id, category) DO NOTHING;

-- Methanol
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-67-56-1', 'Methanol', '67-56-1', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Methanol'),('Methyl Alcohol'),('Wood Alcohol'),('MeOH'),
        ('Carbinol')) AS a(alias)
WHERE s.reference_code = 'CAS-67-56-1'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'perfume' FROM substances WHERE reference_code = 'CAS-67-56-1'
ON CONFLICT (substance_id, category) DO NOTHING;

-- Benzene
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-71-43-2', 'Benzene', '71-43-2', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Benzene'),('Benzol'),('Cyclohexatriene')) AS a(alias)
WHERE s.reference_code = 'CAS-71-43-2'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'perfume' FROM substances WHERE reference_code = 'CAS-71-43-2'
ON CONFLICT (substance_id, category) DO NOTHING;

-- Aluminum Chlorohydrate
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-1327-41-9', 'Aluminum Chlorohydrate', '1327-41-9', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Aluminum Chlorohydrate'),('Aluminium Chlorohydrate'),('ACH'),
        ('Aluminum Zirconium'),('Antiperspirant Active')) AS a(alias)
WHERE s.reference_code = 'CAS-1327-41-9'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'perfume' FROM substances WHERE reference_code = 'CAS-1327-41-9'
ON CONFLICT (substance_id, category) DO NOTHING;

-- Map existing fragrances to perfume category
INSERT INTO substance_categories (substance_id, category)
SELECT id, 'perfume' FROM substances WHERE reference_code IN (
  'FRAG-MIXTURE',    -- Fragrance generic
  'CAS-78-70-6',     -- Linalool
  'CAS-5989-27-5',   -- Limonene
  'CAS-3380-34-5',   -- Triclosan
  'CAS-7439-92-1',   -- Lead
  'CAS-7440-38-2',   -- Arsenic
  'CAS-7439-97-6'    -- Mercury
)
ON CONFLICT (substance_id, category) DO NOTHING;

-- Asbestos
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-1332-21-4', 'Asbestos', '1332-21-4', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Asbestos'),('Chrysotile'),('Amosite'),('Crocidolite'),
        ('Tremolite'),('Asbestos Fiber')) AS a(alias)
WHERE s.reference_code = 'CAS-1332-21-4'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'talcum' FROM substances WHERE reference_code = 'CAS-1332-21-4'
ON CONFLICT (substance_id, category) DO NOTHING;

-- Crystalline Silica
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-14808-60-7', 'Crystalline Silica', '14808-60-7', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Crystalline Silica'),('Quartz'),('Silica'),('Silicon Dioxide'),
        ('SiO2'),('Free Silica')) AS a(alias)
WHERE s.reference_code = 'CAS-14808-60-7'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

INSERT INTO substance_categories (substance_id, category)
SELECT id, 'talcum' FROM substances WHERE reference_code = 'CAS-14808-60-7'
ON CONFLICT (substance_id, category) DO NOTHING;


-- ══════════════════════════════════════════════════════════════
-- SOAP — Map additional substances to soap category
-- ══════════════════════════════════════════════════════════════

-- Map glycerin to soap (already in rules as CAS-56-81-5)
INSERT INTO substance_categories (substance_id, category)
SELECT id, 'soap' FROM substances WHERE reference_code IN (
  'CAS-56-81-5',     -- Glycerin (humectant)
  'CAS-9004-82-4',   -- Sodium Laureth Sulfate (surfactant)
  'CAS-61789-31-9'   -- Sodium Cocoate (surfactant)
)
ON CONFLICT (substance_id, category) DO NOTHING;


-- ══════════════════════════════════════════════════════════════
-- VERIFY TOTALS
-- ══════════════════════════════════════════════════════════════
SELECT COUNT(*) AS total_substances FROM substances;
SELECT COUNT(*) AS total_aliases    FROM substance_aliases;
SELECT COUNT(DISTINCT category) AS total_categories FROM substance_categories;


-- =============== hairoil_seed.sql ===============
-- ============================================================
-- Registry Expansion: Hair Oil Product (BIS IS 7123:2019)
-- Adds specific ingredients for Hair Oils and associates existing ones.
-- ============================================================

-- ── 1. BASE OILS ──────────────────────────────────────────────
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-8012-95-1', 'Mineral Oil', '8012-95-1', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Mineral Oil'),('Liquid Paraffin'),('Light Liquid Paraffin'),('LLP'),('Paraffinum Liquidum'),('White Oil')) AS a(alias)
WHERE s.reference_code = 'CAS-8012-95-1'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

-- ── 2. NEW PARAMETERS ─────────────────────────────────────────
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('PARAM-ACID-VALUE', 'Acid Value', NULL, 'parameter')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Acid Value'),('Free Fatty Acid'),('FFA'),('Acidity')) AS a(alias)
WHERE s.reference_code = 'PARAM-ACID-VALUE'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

-- ── 3. MAPPING SUBSTANCES TO THE 'hairoil' CATEGORY ───────────
-- New Hair Oil specific ingredients
INSERT INTO substance_categories (substance_id, category)
SELECT id, 'hairoil' FROM substances WHERE reference_code IN (
  'CAS-8012-95-1',    -- Mineral Oil
  'PARAM-ACID-VALUE'  -- Acid Value
)
ON CONFLICT (substance_id, category) DO NOTHING;

-- Existing generic and base oil ingredients applicable to hair oils
INSERT INTO substance_categories (substance_id, category)
SELECT id, 'hairoil' FROM substances WHERE reference_code IN (
  'CAS-8001-31-8',   -- Coconut Oil
  'CAS-8001-78-3',   -- Castor Oil
  'CAS-8001-25-0',   -- Olive Oil
  'CAS-56-81-5',     -- Glycerin
  'CAS-7439-92-1',   -- Lead
  'CAS-7440-38-2',   -- Arsenic
  'CAS-7439-97-6',   -- Mercury
  'PARAM-MOISTURE',  -- Moisture Content
  'FRAG-MIXTURE',    -- Fragrances (generic)
  'CAS-78-70-6',     -- Linalool
  'CAS-5989-27-5',   -- Limonene
  'COLOR-GENERIC',   -- Colorants
  'CAS-99-76-3'      -- Methylparaben
)
ON CONFLICT (substance_id, category) DO NOTHING;

-- ── 4. RECORDING THE REGULATION (MIRRORED FOR DB AUDIT LOGS) ──
INSERT INTO regulations (standard_code, standard_name, category, authority, version, effective_date, is_active)
VALUES ('IS-7123-2019', 'BIS IS 7123:2019 - Hair Oils', 'hairoil', 'BIS', '1.0', '2019-01-01', TRUE)
ON CONFLICT DO NOTHING;

-- ── 5. RULE LIMITS (MIRRORED FOR DB AUDIT LOGS) ───────────────
INSERT INTO ingredient_limits (regulation_id, substance_id, rule_type, limit_value, unit, severity, description)
SELECT r.id, s.id, 'MAX_LIMIT', 1.0, '%', 'CRITICAL', 'Acid value must not exceed 1.0.'
FROM regulations r, substances s
WHERE r.standard_code = 'IS-7123-2019' AND s.reference_code = 'PARAM-ACID-VALUE';

INSERT INTO ingredient_limits (regulation_id, substance_id, rule_type, limit_value, unit, severity, description)
SELECT r.id, s.id, 'MAX_LIMIT', 5.5, '%', 'WARNING', 'Moisture Content must not exceed 5.5%.'
FROM regulations r, substances s
WHERE r.standard_code = 'IS-7123-2019' AND s.reference_code = 'PARAM-MOISTURE';


-- =============== lotion_seed.sql ===============
-- ============================================================
-- Registry Expansion: Moisturizing Cream/Lotion (BIS IS 6608:2004)
-- Adds specific ingredients for Lotions and maps existing generic ones.
-- ============================================================

-- ── 1. BASE INGREDIENTS ───────────────────────────────────────
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-57-11-4', 'Stearic Acid', '57-11-4', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Octadecanoic Acid'),('Stearin'),('Cetylacetic Acid')) AS a(alias)
WHERE s.reference_code = 'CAS-57-11-4'
ON CONFLICT (substance_id, alias_name) DO NOTHING;


INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-36653-82-4', 'Cetyl Alcohol', '36653-82-4', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('1-Hexadecanol'),('Palmityl Alcohol'),('Cetanol')) AS a(alias)
WHERE s.reference_code = 'CAS-36653-82-4'
ON CONFLICT (substance_id, alias_name) DO NOTHING;


INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-85507-69-3', 'Aloe Vera Extract', '85507-69-3', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Aloe Barbadensis Extract'),('Aloe Vera Gel'),('Aloe Vera Juice')) AS a(alias)
WHERE s.reference_code = 'CAS-85507-69-3'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

-- ── 2. NEW PARAMETER: pH ──────────────────────────────────────
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('PARAM-PH', 'pH Level', NULL, 'parameter')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('pH'),('Acidity / Alkalinity'),('Hydrogen Ion Concentration')) AS a(alias)
WHERE s.reference_code = 'PARAM-PH'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

-- ── 3. MAPPING TO 'lotion' CATEGORY ───────────────────────────
-- New specific ingredients
INSERT INTO substance_categories (substance_id, category)
SELECT id, 'lotion' FROM substances WHERE reference_code IN (
  'CAS-57-11-4',      -- Stearic Acid
  'CAS-36653-82-4',   -- Cetyl Alcohol
  'CAS-85507-69-3',   -- Aloe Vera
  'PARAM-PH'          -- pH limit tests
)
ON CONFLICT (substance_id, category) DO NOTHING;

-- Common bases, preservatives, and contaminants already in the generalized system
INSERT INTO substance_categories (substance_id, category)
SELECT id, 'lotion' FROM substances WHERE reference_code IN (
  'CAS-7732-18-5',    -- Water (Aqua)
  'CAS-56-81-5',      -- Glycerin
  'CAS-8012-95-1',    -- Mineral Oil
  'CAS-91080-23-8',   -- Shea Butter
  'CAS-8001-25-0',    -- Olive Oil
  'CAS-8006-54-0',    -- Lanolin
  'CAS-1310-73-2',    -- Sodium Hydroxide (pH adjuster)
  'CAS-77-92-9',      -- Citric Acid (pH adjuster)
  'CAS-60-00-4',      -- EDTA (Chelating agent)
  'CAS-99-76-3',      -- Methylparaben (Preservative)
  'CAS-94-26-8',      -- Butylparaben (Preservative)
  'FRAG-MIXTURE',     -- Fragrance (gen)
  'CAS-78-70-6',      -- Linalool
  'CAS-5989-27-5',    -- Limonene
  'COLOR-GENERIC',    -- Colorant
  'CAS-13463-67-7',   -- Titanium Dioxide
  'CAS-7439-92-1',    -- Lead
  'CAS-7440-38-2',    -- Arsenic
  'CAS-7439-97-6'     -- Mercury
)
ON CONFLICT (substance_id, category) DO NOTHING;

-- ── 4. RECORDING REGULATION (FOR DB AUDIT LOGS) ────────────────
INSERT INTO regulations (standard_code, standard_name, category, authority, version, effective_date, is_active)
VALUES ('IS-6608-2004', 'BIS IS 6608:2004 - Skin Creams/Lotions', 'lotion', 'BIS', '1.0', '2004-01-01', TRUE)
ON CONFLICT DO NOTHING;

-- ── 5. RULE LIMITS (FOR DB AUDIT LOGS) ─────────────────────────
INSERT INTO ingredient_limits (regulation_id, substance_id, rule_type, limit_value, unit, severity, description)
SELECT r.id, s.id, 'MIN_LIMIT', 4.0, '%', 'WARNING', 'Minimum acceptable pH for lotions is 4.0.'
FROM regulations r, substances s
WHERE r.standard_code = 'IS-6608-2004' AND s.reference_code = 'PARAM-PH';

INSERT INTO ingredient_limits (regulation_id, substance_id, rule_type, limit_value, unit, severity, description)
SELECT r.id, s.id, 'MAX_LIMIT', 9.0, '%', 'WARNING', 'Maximum acceptable pH for lotions is 9.0.'
FROM regulations r, substances s
WHERE r.standard_code = 'IS-6608-2004' AND s.reference_code = 'PARAM-PH';


-- =============== perfume_seed.sql ===============
-- ============================================================
-- Registry Expansion: Body Spray / Deodorant / Perfume (BIS IS 8482:2007)
-- Adds specific ingredients for Sprays and maps existing generic ones.
-- ============================================================

-- ── 1. BASE SOLVENTS & PROPELLANTS ────────────────────────────
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-64-17-5', 'Ethyl Alcohol', '64-17-5', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Ethanol'),('Denatured Alcohol'),('Alcohol Denat'),('Alcohol')) AS a(alias)
WHERE s.reference_code = 'CAS-64-17-5'
ON CONFLICT (substance_id, alias_name) DO NOTHING;


INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-106-97-8', 'Butane Propellant', '106-97-8', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Butane'),('Isobutane'),('Propane'),('LPG Propellant'),('Aerosol Propellant')) AS a(alias)
WHERE s.reference_code = 'CAS-106-97-8'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

-- ── 2. ACTIVE INGREDIENTS & IMPURITIES ────────────────────────
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-1327-41-9', 'Aluminum Chlorohydrate', '1327-41-9', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Aluminium Chlorohydrate'),('Antiperspirant Active'),('ACH')) AS a(alias)
WHERE s.reference_code = 'CAS-1327-41-9'
ON CONFLICT (substance_id, alias_name) DO NOTHING;


INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-67-56-1', 'Methanol', '67-56-1', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Methyl Alcohol'),('Wood Alcohol'),('Carbinol')) AS a(alias)
WHERE s.reference_code = 'CAS-67-56-1'
ON CONFLICT (substance_id, alias_name) DO NOTHING;


INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-71-43-2', 'Benzene', '71-43-2', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Benzol'),('Coal Naphtha'),('Benzene Impurity')) AS a(alias)
WHERE s.reference_code = 'CAS-71-43-2'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

-- ── 3. MAPPING TO 'perfume' CATEGORY ──────────────────────────
-- New specific ingredients
INSERT INTO substance_categories (substance_id, category)
SELECT id, 'perfume' FROM substances WHERE reference_code IN (
  'CAS-64-17-5',      -- Ethyl Alcohol
  'CAS-106-97-8',     -- Butane Propellant
  'CAS-1327-41-9',    -- Aluminum Chlorohydrate
  'CAS-67-56-1',      -- Methanol (Impurity)
  'CAS-71-43-2'       -- Benzene (Impurity)
)
ON CONFLICT (substance_id, category) DO NOTHING;

-- Common bases, preservatives, and contaminants already in the generalized system
INSERT INTO substance_categories (substance_id, category)
SELECT id, 'perfume' FROM substances WHERE reference_code IN (
  'CAS-7732-18-5',    -- Water (Aqua)
  'CAS-56-81-5',      -- Glycerin
  'CAS-3380-34-5',    -- Triclosan (Antibacterial Deodorant Active)
  'FRAG-MIXTURE',     -- Fragrance (gen)
  'CAS-78-70-6',      -- Linalool
  'CAS-5989-27-5',    -- Limonene
  'CAS-7439-92-1',    -- Lead
  'CAS-7440-38-2',    -- Arsenic
  'CAS-7439-97-6'     -- Mercury
)
ON CONFLICT (substance_id, category) DO NOTHING;

-- ── 4. RECORDING REGULATION (FOR DB AUDIT LOGS) ────────────────
INSERT INTO regulations (standard_code, standard_name, category, authority, version, effective_date, is_active)
VALUES ('IS-8482-2007', 'BIS IS 8482:2007 - Aerosol Deodorants', 'perfume', 'BIS', '1.0', '2007-01-01', TRUE)
ON CONFLICT DO NOTHING;

-- ── 5. RULE LIMITS (FOR DB AUDIT LOGS) ─────────────────────────
INSERT INTO ingredient_limits (regulation_id, substance_id, rule_type, limit_value, unit, severity, description)
SELECT r.id, s.id, 'BANNED', 0, '%', 'CRITICAL', 'Benzene is strictly banned as an impurity in aerosol products.'
FROM regulations r, substances s
WHERE r.standard_code = 'IS-8482-2007' AND s.reference_code = 'CAS-71-43-2';

INSERT INTO ingredient_limits (regulation_id, substance_id, rule_type, limit_value, unit, severity, description)
SELECT r.id, s.id, 'MAX_LIMIT', 0.2, '%', 'CRITICAL', 'Methanol must not exceed 0.2% as an impurity in ethanol base.'
FROM regulations r, substances s
WHERE r.standard_code = 'IS-8482-2007' AND s.reference_code = 'CAS-67-56-1';


-- =============== talcum_seed.sql ===============
-- ============================================================
-- Registry Expansion: Talcum Powder Product (BIS IS 1462:2019)
-- Adds specific ingredients for Talc and associated contaminants/preservatives.
-- ============================================================

-- ── 1. BASE INGREDIENT: TALC ──────────────────────────────────
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-14807-96-6', 'Talc', '14807-96-6', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Talcum Powder'),('Hydrated Magnesium Silicate'),('Talcum'),('Cosmetic Talc'),('French Chalk')) AS a(alias)
WHERE s.reference_code = 'CAS-14807-96-6'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

-- ── 2. CONTAMINANT: ASBESTOS ──────────────────────────────────
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-1332-21-4', 'Asbestos', '1332-21-4', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Chrysotile Asbestos'),('Amosite'),('Crocidolite'),('Tremolite Asbestos'),('Asbestos Fiber')) AS a(alias)
WHERE s.reference_code = 'CAS-1332-21-4'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

-- ── 3. CONTAMINANT: CRYSTALLINE SILICA ────────────────────────
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-14808-60-7', 'Crystalline Silica', '14808-60-7', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Quartz'),('Silica'),('Silicon Dioxide'),('Respirable Silica')) AS a(alias)
WHERE s.reference_code = 'CAS-14808-60-7'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

-- ── 4. PRESERVATIVE: PARABENS ─────────────────────────────────
INSERT INTO substances (reference_code, official_name, cas_number, type)
VALUES ('CAS-99-76-3', 'Methylparaben', '99-76-3', 'chemical')
ON CONFLICT (reference_code) DO NOTHING;

INSERT INTO substance_aliases (substance_id, alias_name)
SELECT id, alias FROM substances s,
(VALUES ('Methyl Paraben'),('Methyl p-hydroxybenzoate'),('Parabens'),('Methyl-4-hydroxybenzoate')) AS a(alias)
WHERE s.reference_code = 'CAS-99-76-3'
ON CONFLICT (substance_id, alias_name) DO NOTHING;

-- ── 5. MAPPING SUBSTANCES TO THE 'talcum' CATEGORY ────────────
-- New Talcum-specific ingredients
INSERT INTO substance_categories (substance_id, category)
SELECT id, 'talcum' FROM substances WHERE reference_code IN (
  'CAS-14807-96-6', -- Talc
  'CAS-1332-21-4',  -- Asbestos
  'CAS-14808-60-7', -- Crystalline Silica
  'CAS-99-76-3'     -- Methylparaben
)
ON CONFLICT (substance_id, category) DO NOTHING;

-- Existing cross-category and generic ingredients also applicable to talcum
INSERT INTO substance_categories (substance_id, category)
SELECT id, 'talcum' FROM substances WHERE reference_code IN (
  'CAS-7439-92-1',   -- Lead
  'CAS-7440-38-2',   -- Arsenic
  'CAS-7439-97-6',   -- Mercury
  'PARAM-MOISTURE',  -- Moisture Check
  'FRAG-MIXTURE',    -- Fragrances (generic)
  'CAS-78-70-6',     -- Linalool
  'CAS-5989-27-5',   -- Limonene
  'CAS-13463-67-7',  -- Titanium Dioxide (colorant/whitener often used in talcum)
  'CAS-1309-37-1',   -- Iron Oxide (colorant)
  'COLOR-GENERIC'    -- Colorants
)
ON CONFLICT (substance_id, category) DO NOTHING;

-- ── 6. RECORDING THE REGULATION (MIRRORED FOR DB AUDIT LOGS) ──
INSERT INTO regulations (standard_code, standard_name, category, authority, version, effective_date, is_active)
VALUES ('IS-1462-2019', 'BIS IS 1462:2019 - Talcum Powder', 'talcum', 'BIS', '1.0', '2019-01-01', TRUE)
ON CONFLICT DO NOTHING;

-- ── 7. RULE LIMITS (MIRRORED FOR DB AUDIT LOGS) ───────────────
INSERT INTO ingredient_limits (regulation_id, substance_id, rule_type, limit_value, unit, severity, description)
SELECT r.id, s.id, 'BANNED', 0, '%', 'CRITICAL', 'Asbestos is strictly banned in cosmetic talc.'
FROM regulations r, substances s
WHERE r.standard_code = 'IS-1462-2019' AND s.reference_code = 'CAS-1332-21-4';

INSERT INTO ingredient_limits (regulation_id, substance_id, rule_type, limit_value, unit, severity, description)
SELECT r.id, s.id, 'MAX_LIMIT', 1.0, '%', 'WARNING', 'Crystalline Silica must not exceed 1%.'
FROM regulations r, substances s
WHERE r.standard_code = 'IS-1462-2019' AND s.reference_code = 'CAS-14808-60-7';


-- =============== shelf_life_seed.sql ===============
-- ============================================================
-- Shelf Life Prediction — Seed Data
-- Base profiles for all 6 categories + degradation factors
-- ============================================================

-- ============================
-- 1. SHELF LIFE PROFILES
-- ============================

INSERT INTO shelf_life_profiles
  (category,  base_shelf_life_months, oxidation_susceptibility, hydrolysis_susceptibility, microbial_risk_base, physical_stability_base)
VALUES
  ('soap',    24, 0.80, 0.60, 0.50, 1.00),
  ('cookies',  6, 1.20, 0.80, 1.50, 1.20),
  ('talcum',  36, 0.30, 0.20, 0.20, 0.80),
  ('hairoil', 18, 1.40, 0.50, 0.60, 0.90),
  ('lotion',  12, 1.00, 0.80, 1.30, 1.10),
  ('perfume', 24, 0.60, 0.40, 0.30, 0.70)
ON CONFLICT (category) DO NOTHING;


-- ============================
-- 2. DEGRADATION FACTORS
-- ============================
-- Each row: substance effect on chemical / microbial / physical shelf life

-- ── Cross-category factors (category = NULL → applies to all) ──

-- Water / Moisture: high water accelerates microbial growth and physical instability
INSERT INTO degradation_factors
  (reference_code, category, chemical_effect_months, microbial_effect_months, physical_effect_months,
   threshold_type, threshold_value, threshold_unit, description)
VALUES
  ('PARAM-MOISTURE', NULL, 0, -6, -2,
   'ABOVE', 15.0, '%',
   'Moisture above 15% significantly increases microbial growth risk and physical instability');

-- Triclosan: preservative — extends microbial shelf life
INSERT INTO degradation_factors
  (reference_code, category, chemical_effect_months, microbial_effect_months, physical_effect_months,
   threshold_type, threshold_value, threshold_unit, description)
VALUES
  ('CAS-3380-34-5', NULL, 0, 6, 0,
   'ABOVE', 0.05, '%',
   'Triclosan is an effective antimicrobial preservative, extending microbial shelf life');

-- Formaldehyde: preservative effect (when within legal limits)
INSERT INTO degradation_factors
  (reference_code, category, chemical_effect_months, microbial_effect_months, physical_effect_months,
   threshold_type, threshold_value, threshold_unit, description)
VALUES
  ('CAS-50-00-0', NULL, 0, 4, 0,
   'ABOVE', 0.01, '%',
   'Formaldehyde acts as a preservative, slowing microbial degradation');

-- EDTA: chelating agent — slows oxidation
INSERT INTO degradation_factors
  (reference_code, category, chemical_effect_months, microbial_effect_months, physical_effect_months,
   threshold_type, threshold_value, threshold_unit, description)
VALUES
  ('CAS-60-00-4', NULL, 3, 0, 0,
   'ABOVE', 0.01, '%',
   'EDTA chelates metal ions, preventing catalytic oxidation and extending chemical stability');


-- ── Soap-specific factors ──

-- Glycerin: excess causes softening, sweating, reduced shelf life
INSERT INTO degradation_factors
  (reference_code, category, chemical_effect_months, microbial_effect_months, physical_effect_months,
   threshold_type, threshold_value, threshold_unit, description)
VALUES
  ('CAS-56-81-5', 'soap', 0, -2, -3,
   'ABOVE', 5.0, '%',
   'Excess glycerin (>5%) causes soap softening, sweating and reduced physical stability');

-- NaOH / Lye: high pH reduces microbial risk but increases chemical degradation
INSERT INTO degradation_factors
  (reference_code, category, chemical_effect_months, microbial_effect_months, physical_effect_months,
   threshold_type, threshold_value, threshold_unit, description)
VALUES
  ('CAS-1310-73-2', 'soap', -2, 2, 0,
   'ABOVE', 0.03, '%',
   'Free alkali creates hostile microbial environment but accelerates chemical hydrolysis');

-- TFM (Total Fatty Matter): higher TFM = more stable product
INSERT INTO degradation_factors
  (reference_code, category, chemical_effect_months, microbial_effect_months, physical_effect_months,
   threshold_type, threshold_value, threshold_unit, description)
VALUES
  ('PARAM-TFM', 'soap', 2, 1, 2,
   'ABOVE', 76.0, '%',
   'High TFM (>76%) indicates a denser, more chemically stable soap bar with longer shelf life');

-- Sodium Chloride (salt): excess degrades soap structure
INSERT INTO degradation_factors
  (reference_code, category, chemical_effect_months, microbial_effect_months, physical_effect_months,
   threshold_type, threshold_value, threshold_unit, description)
VALUES
  ('CAS-7647-14-5', 'soap', 0, 0, -2,
   'ABOVE', 0.5, '%',
   'Excess NaCl degrades soap structure and reduces physical stability');


-- ── Hair Oil-specific factors ──

-- General unsaturated oil factor (use Acid Value parameter if present)
INSERT INTO degradation_factors
  (reference_code, category, chemical_effect_months, microbial_effect_months, physical_effect_months,
   threshold_type, threshold_value, threshold_unit, description)
VALUES
  ('PARAM-ACID-VALUE', 'hairoil', -4, 0, -1,
   'ABOVE', 1.0, '%',
   'High acid value indicates unsaturated/oxidation-prone oils, reducing chemical shelf life');


-- ── Lotion-specific factors ──

-- Methylparaben: strong preservative for lotions
INSERT INTO degradation_factors
  (reference_code, category, chemical_effect_months, microbial_effect_months, physical_effect_months,
   threshold_type, threshold_value, threshold_unit, description)
VALUES
  ('CAS-99-76-3', 'lotion', 0, 8, 0,
   'ABOVE', 0.1, '%',
   'Methylparaben is an effective broad-spectrum preservative extending lotion microbial shelf life');

-- Stearic Acid: emollient/thickener that improves physical stability
INSERT INTO degradation_factors
  (reference_code, category, chemical_effect_months, microbial_effect_months, physical_effect_months,
   threshold_type, threshold_value, threshold_unit, description)
VALUES
  ('CAS-57-11-4', 'lotion', 0, 0, 3,
   'ABOVE', 2.0, '%',
   'Stearic acid as thickener improves emulsion physical stability');


-- ── Cookie-specific factors ──

-- Moisture in cookies: critical for microbial spoilage
INSERT INTO degradation_factors
  (reference_code, category, chemical_effect_months, microbial_effect_months, physical_effect_months,
   threshold_type, threshold_value, threshold_unit, description)
VALUES
  ('PARAM-MOISTURE', 'cookies', -1, -3, -1,
   'ABOVE', 5.0, '%',
   'Cookie moisture above 5% dramatically increases mold risk and textural degradation');


-- ── Perfume-specific factors ──

-- Ethanol: acts as natural preservative in perfumes
INSERT INTO degradation_factors
  (reference_code, category, chemical_effect_months, microbial_effect_months, physical_effect_months,
   threshold_type, threshold_value, threshold_unit, description)
VALUES
  ('CAS-64-17-5', 'perfume', 1, 6, 0,
   'ABOVE', 40.0, '%',
   'High ethanol content (>40%) creates inhospitable environment for microbial growth');


-- ── Talcum-specific factors ──

-- High purity talc: very stable
INSERT INTO degradation_factors
  (reference_code, category, chemical_effect_months, microbial_effect_months, physical_effect_months,
   threshold_type, threshold_value, threshold_unit, description)
VALUES
  ('CAS-14807-96-6', 'talcum', 2, 2, 3,
   'ABOVE', 90.0, '%',
   'High purity hydrated magnesium silicate is chemically inert and inherently stable');

