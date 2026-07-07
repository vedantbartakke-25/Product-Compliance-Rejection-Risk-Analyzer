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
