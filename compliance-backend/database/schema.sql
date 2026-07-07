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
