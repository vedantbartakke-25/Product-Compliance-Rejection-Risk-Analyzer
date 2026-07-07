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
