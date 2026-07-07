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
