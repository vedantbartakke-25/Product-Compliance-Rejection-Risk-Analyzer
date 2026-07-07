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
