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
