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
