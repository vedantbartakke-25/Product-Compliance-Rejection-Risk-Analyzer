-- ============================================================
-- Shelf Life Prediction — Seed Data
-- Base profiles for all 6 categories + degradation factors
-- ============================================================

-- ============================
-- 1. SHELF LIFE PROFILES
-- ============================

INSERT INTO shelf_life_profiles
  (category,  base_shelf_life_months, oxidation_susceptibility, hydrolysis_susceptibility, microbial_risk_base, physical_stability_base)
VALUES
  ('soap',    24, 0.80, 0.60, 0.50, 1.00),
  ('cookies',  6, 1.20, 0.80, 1.50, 1.20),
  ('talcum',  36, 0.30, 0.20, 0.20, 0.80),
  ('hairoil', 18, 1.40, 0.50, 0.60, 0.90),
  ('lotion',  12, 1.00, 0.80, 1.30, 1.10),
  ('perfume', 24, 0.60, 0.40, 0.30, 0.70)
ON CONFLICT (category) DO NOTHING;


-- ============================
-- 2. DEGRADATION FACTORS
-- ============================
-- Each row: substance effect on chemical / microbial / physical shelf life

-- ── Cross-category factors (category = NULL → applies to all) ──

-- Water / Moisture: high water accelerates microbial growth and physical instability
INSERT INTO degradation_factors
  (reference_code, category, chemical_effect_months, microbial_effect_months, physical_effect_months,
   threshold_type, threshold_value, threshold_unit, description)
VALUES
  ('PARAM-MOISTURE', NULL, 0, -6, -2,
   'ABOVE', 15.0, '%',
   'Moisture above 15% significantly increases microbial growth risk and physical instability');

-- Triclosan: preservative — extends microbial shelf life
INSERT INTO degradation_factors
  (reference_code, category, chemical_effect_months, microbial_effect_months, physical_effect_months,
   threshold_type, threshold_value, threshold_unit, description)
VALUES
  ('CAS-3380-34-5', NULL, 0, 6, 0,
   'ABOVE', 0.05, '%',
   'Triclosan is an effective antimicrobial preservative, extending microbial shelf life');

-- Formaldehyde: preservative effect (when within legal limits)
INSERT INTO degradation_factors
  (reference_code, category, chemical_effect_months, microbial_effect_months, physical_effect_months,
   threshold_type, threshold_value, threshold_unit, description)
VALUES
  ('CAS-50-00-0', NULL, 0, 4, 0,
   'ABOVE', 0.01, '%',
   'Formaldehyde acts as a preservative, slowing microbial degradation');

-- EDTA: chelating agent — slows oxidation
INSERT INTO degradation_factors
  (reference_code, category, chemical_effect_months, microbial_effect_months, physical_effect_months,
   threshold_type, threshold_value, threshold_unit, description)
VALUES
  ('CAS-60-00-4', NULL, 3, 0, 0,
   'ABOVE', 0.01, '%',
   'EDTA chelates metal ions, preventing catalytic oxidation and extending chemical stability');


-- ── Soap-specific factors ──

-- Glycerin: excess causes softening, sweating, reduced shelf life
INSERT INTO degradation_factors
  (reference_code, category, chemical_effect_months, microbial_effect_months, physical_effect_months,
   threshold_type, threshold_value, threshold_unit, description)
VALUES
  ('CAS-56-81-5', 'soap', 0, -2, -3,
   'ABOVE', 5.0, '%',
   'Excess glycerin (>5%) causes soap softening, sweating and reduced physical stability');

-- NaOH / Lye: high pH reduces microbial risk but increases chemical degradation
INSERT INTO degradation_factors
  (reference_code, category, chemical_effect_months, microbial_effect_months, physical_effect_months,
   threshold_type, threshold_value, threshold_unit, description)
VALUES
  ('CAS-1310-73-2', 'soap', -2, 2, 0,
   'ABOVE', 0.03, '%',
   'Free alkali creates hostile microbial environment but accelerates chemical hydrolysis');

-- TFM (Total Fatty Matter): higher TFM = more stable product
INSERT INTO degradation_factors
  (reference_code, category, chemical_effect_months, microbial_effect_months, physical_effect_months,
   threshold_type, threshold_value, threshold_unit, description)
VALUES
  ('PARAM-TFM', 'soap', 2, 1, 2,
   'ABOVE', 76.0, '%',
   'High TFM (>76%) indicates a denser, more chemically stable soap bar with longer shelf life');

-- Sodium Chloride (salt): excess degrades soap structure
INSERT INTO degradation_factors
  (reference_code, category, chemical_effect_months, microbial_effect_months, physical_effect_months,
   threshold_type, threshold_value, threshold_unit, description)
VALUES
  ('CAS-7647-14-5', 'soap', 0, 0, -2,
   'ABOVE', 0.5, '%',
   'Excess NaCl degrades soap structure and reduces physical stability');


-- ── Hair Oil-specific factors ──

-- General unsaturated oil factor (use Acid Value parameter if present)
INSERT INTO degradation_factors
  (reference_code, category, chemical_effect_months, microbial_effect_months, physical_effect_months,
   threshold_type, threshold_value, threshold_unit, description)
VALUES
  ('PARAM-ACID-VALUE', 'hairoil', -4, 0, -1,
   'ABOVE', 1.0, '%',
   'High acid value indicates unsaturated/oxidation-prone oils, reducing chemical shelf life');


-- ── Lotion-specific factors ──

-- Methylparaben: strong preservative for lotions
INSERT INTO degradation_factors
  (reference_code, category, chemical_effect_months, microbial_effect_months, physical_effect_months,
   threshold_type, threshold_value, threshold_unit, description)
VALUES
  ('CAS-99-76-3', 'lotion', 0, 8, 0,
   'ABOVE', 0.1, '%',
   'Methylparaben is an effective broad-spectrum preservative extending lotion microbial shelf life');

-- Stearic Acid: emollient/thickener that improves physical stability
INSERT INTO degradation_factors
  (reference_code, category, chemical_effect_months, microbial_effect_months, physical_effect_months,
   threshold_type, threshold_value, threshold_unit, description)
VALUES
  ('CAS-57-11-4', 'lotion', 0, 0, 3,
   'ABOVE', 2.0, '%',
   'Stearic acid as thickener improves emulsion physical stability');


-- ── Cookie-specific factors ──

-- Moisture in cookies: critical for microbial spoilage
INSERT INTO degradation_factors
  (reference_code, category, chemical_effect_months, microbial_effect_months, physical_effect_months,
   threshold_type, threshold_value, threshold_unit, description)
VALUES
  ('PARAM-MOISTURE', 'cookies', -1, -3, -1,
   'ABOVE', 5.0, '%',
   'Cookie moisture above 5% dramatically increases mold risk and textural degradation');


-- ── Perfume-specific factors ──

-- Ethanol: acts as natural preservative in perfumes
INSERT INTO degradation_factors
  (reference_code, category, chemical_effect_months, microbial_effect_months, physical_effect_months,
   threshold_type, threshold_value, threshold_unit, description)
VALUES
  ('CAS-64-17-5', 'perfume', 1, 6, 0,
   'ABOVE', 40.0, '%',
   'High ethanol content (>40%) creates inhospitable environment for microbial growth');


-- ── Talcum-specific factors ──

-- High purity talc: very stable
INSERT INTO degradation_factors
  (reference_code, category, chemical_effect_months, microbial_effect_months, physical_effect_months,
   threshold_type, threshold_value, threshold_unit, description)
VALUES
  ('CAS-14807-96-6', 'talcum', 2, 2, 3,
   'ABOVE', 90.0, '%',
   'High purity hydrated magnesium silicate is chemically inert and inherently stable');
