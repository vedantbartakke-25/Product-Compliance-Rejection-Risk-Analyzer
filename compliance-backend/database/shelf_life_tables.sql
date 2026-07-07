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
