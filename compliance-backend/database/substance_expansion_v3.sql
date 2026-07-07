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
