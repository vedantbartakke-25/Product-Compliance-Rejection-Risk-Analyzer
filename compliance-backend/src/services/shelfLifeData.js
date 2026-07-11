const db = require("../config/db");

// ── Environment Presets ──────────────────────────────────────

const ENVIRONMENT_PRESETS = [
  { id: "room_temp",    name: "Room Temperature (25°C, 40% RH)", temp: 25, humidity: 40 },
  { id: "hot_humid",    name: "Hot & Humid (40°C, 75% RH)",      temp: 40, humidity: 75 },
  { id: "cold_dry",     name: "Cold & Dry (15°C, 30% RH)",       temp: 15, humidity: 30 },
  { id: "extreme_heat", name: "Extreme Heat (50°C, 60% RH)",     temp: 50, humidity: 60 },
  { id: "refrigerated", name: "Refrigerated (5°C, 50% RH)",      temp:  5, humidity: 50 },
];

// ── DB Loaders ───────────────────────────────────────────────

/**
 * Load base shelf life profile for a product category.
 * Falls back to a sensible default if no profile exists in DB.
 */
async function loadProfile(category) {
  try {
    const result = await db.query(
      `SELECT category, base_shelf_life_months,
              oxidation_susceptibility, hydrolysis_susceptibility,
              microbial_risk_base, physical_stability_base
       FROM shelf_life_profiles
       WHERE category = $1`,
      [category]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        category: row.category,
        base_shelf_life_months: parseInt(row.base_shelf_life_months),
        oxidation_susceptibility: parseFloat(row.oxidation_susceptibility),
        hydrolysis_susceptibility: parseFloat(row.hydrolysis_susceptibility),
        microbial_risk_base: parseFloat(row.microbial_risk_base),
        physical_stability_base: parseFloat(row.physical_stability_base),
      };
    }
  } catch (err) {
    console.warn(`⚠️  shelf_life_profiles table query failed: ${err.message}`);
  }

  // Fallback defaults if table doesn't exist or no data
  return {
    category,
    base_shelf_life_months: 18,
    oxidation_susceptibility: 1.0,
    hydrolysis_susceptibility: 1.0,
    microbial_risk_base: 1.0,
    physical_stability_base: 1.0,
  };
}

/**
 * Load degradation factors for substances present in the formulation.
 * Returns factors matching the category OR universal (category IS NULL).
 */
async function loadDegradationFactors(category, ingredientMap) {
  const refCodes = Array.from(ingredientMap.keys());
  if (refCodes.length === 0) return [];

  try {
    const result = await db.query(
      `SELECT reference_code, category,
              chemical_effect_months, microbial_effect_months, physical_effect_months,
              threshold_type, threshold_value, threshold_unit, description
       FROM degradation_factors
       WHERE reference_code = ANY($1)
         AND (category IS NULL OR category = $2)`,
      [refCodes, category]
    );

    return result.rows.map((row) => ({
      reference_code: row.reference_code,
      category: row.category,
      chemical_effect_months: parseFloat(row.chemical_effect_months),
      microbial_effect_months: parseFloat(row.microbial_effect_months),
      physical_effect_months: parseFloat(row.physical_effect_months),
      threshold_type: row.threshold_type,
      threshold_value: row.threshold_value !== null ? parseFloat(row.threshold_value) : null,
      threshold_unit: row.threshold_unit,
      description: row.description,
    }));
  } catch (err) {
    console.warn(`⚠️  degradation_factors table query failed: ${err.message}`);
    return [];
  }
}

/**
 * Persist shelf life prediction results to the database.
 */
async function persistShelfLifeResult({
  evaluationId, userId, productName, category,
  phValue, waterPercent, packagingType,
  environmentResults, overallConfidence
}) {
  try {
    const result = await db.query(
      `INSERT INTO shelf_life_results
        (evaluation_id, user_id, product_name, category,
         ph_value, water_percent, packaging_type,
         environment_results, overall_confidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        evaluationId || null,
        userId || null,
        productName,
        category,
        phValue || null,
        waterPercent || null,
        packagingType || null,
        JSON.stringify(environmentResults),
        overallConfidence,
      ]
    );
    return result.rows[0].id;
  } catch (err) {
    console.warn(`⚠️  Failed to persist shelf life result: ${err.message}`);
    return null;
  }
}

/**
 * Resolve environment preset IDs to full preset objects.
 * If no IDs provided, returns all presets.
 */
function resolveEnvironments(environmentIds) {
  if (!environmentIds || environmentIds.length === 0) {
    return [...ENVIRONMENT_PRESETS];
  }
  return ENVIRONMENT_PRESETS.filter((p) => environmentIds.includes(p.id));
}

module.exports = {
  ENVIRONMENT_PRESETS,
  loadProfile,
  loadDegradationFactors,
  persistShelfLifeResult,
  resolveEnvironments,
};
