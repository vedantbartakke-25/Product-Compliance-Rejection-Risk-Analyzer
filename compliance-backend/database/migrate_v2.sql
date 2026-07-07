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
