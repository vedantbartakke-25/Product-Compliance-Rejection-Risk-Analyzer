const {
  loadProfile,
  loadDegradationFactors,
  resolveEnvironments,
} = require("./shelfLifeData");

// ── Environmental Factor Functions ───────────────────────────

/**
 * Simplified Arrhenius acceleration: degradation rate doubles
 * for every 10°C above reference temperature (Q10 = 2).
 */
function tempAcceleration(tempCelsius) {
  const refTemp = 25;
  const diff = tempCelsius - refTemp;
  return Math.pow(2, diff / 10);
}

/**
 * Humidity factor — higher humidity accelerates microbial growth.
 */
function humidityFactor(humidityPercent) {
  if (humidityPercent <= 30) return 0.7;
  if (humidityPercent <= 50) return 1.0;
  if (humidityPercent <= 70) return 1.3;
  return 1.6;
}

/**
 * Packaging factor — airtight slows degradation, open accelerates.
 */
function packagingFactor(type) {
  switch (type) {
    case "AIRTIGHT":    return 0.7;
    case "SEMI_SEALED": return 1.0;
    case "OPEN":        return 1.5;
    default:            return 1.0;
  }
}

/**
 * pH impact on microbial growth.
 * Extreme pH = hostile to microbes (lower factor = slower growth).
 * Near-neutral pH = favorable for microbes (higher factor = faster growth).
 */
function phMicrobialFactor(ph) {
  if (ph === null || ph === undefined) return 1.0;
  if (ph < 4.0 || ph > 10.0) return 0.5;
  if (ph < 5.0 || ph > 9.0)  return 0.7;
  if (ph >= 6.0 && ph <= 8.0) return 1.3;
  return 1.0;
}

// ── Ingredient Effect Aggregators ────────────────────────────

/**
 * Check whether a degradation factor's threshold is met by the
 * actual ingredient concentration.
 */
function isThresholdMet(factor, actualPercent) {
  if (!factor.threshold_type || factor.threshold_value === null) return true;
  switch (factor.threshold_type) {
    case "ABOVE": return actualPercent > factor.threshold_value;
    case "BELOW": return actualPercent < factor.threshold_value;
    case "ANY":   return true;
    default:      return true;
  }
}

/**
 * Sum effect months from applicable degradation factors for a given module.
 */
function sumEffects(factors, ingredientMap, moduleKey) {
  let totalEffect = 0;
  for (const factor of factors) {
    const actualPercent = ingredientMap.get(factor.reference_code);
    if (actualPercent === undefined || actualPercent === null) continue;
    if (!isThresholdMet(factor, actualPercent)) continue;
    totalEffect += factor[moduleKey];
  }
  return totalEffect;
}

// ── Confidence Determination ─────────────────────────────────

function determineConfidence(ingredientCount, ph, waterPercent) {
  let score = 0;
  if (ingredientCount >= 5) score += 2;
  else if (ingredientCount >= 3) score += 1;
  if (ph !== null && ph !== undefined) score += 1;
  if (waterPercent !== null && waterPercent !== undefined) score += 1;

  if (score >= 4) return "HIGH";
  if (score >= 2) return "MEDIUM";
  return "LOW";
}

function overallConfidence(envResults) {
  const levels = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  if (envResults.length === 0) return "LOW";
  const avg = envResults.reduce((sum, r) => sum + (levels[r.confidence] || 1), 0) / envResults.length;
  if (avg >= 2.5) return "HIGH";
  if (avg >= 1.5) return "MEDIUM";
  return "LOW";
}

// ── Core Prediction Engine ───────────────────────────────────

/**
 * Predict environment-wise shelf life ranges using multi-mode failure model.
 *
 * @param {Object} params
 * @param {string} params.category - Product category (e.g. 'soap')
 * @param {Array}  params.normalizedIngredients - Resolved ingredients from normalization
 * @param {Map}    params.ingredientMap - Map<reference_code, value_percent>
 * @param {number|null} params.phValue - Optional pH value (0-14)
 * @param {number|null} params.waterPercent - Optional water/moisture %
 * @param {string|null} params.packagingType - AIRTIGHT | SEMI_SEALED | OPEN
 * @param {string[]|null} params.environments - Preset IDs or null for all
 * @returns {Object} Prediction result with environment-wise breakdown
 */
async function predictShelfLife({
  category,
  normalizedIngredients = [],
  ingredientMap,
  phValue = null,
  waterPercent = null,
  packagingType = null,
  environments = null,
}) {
  // 1. Load base profile for category
  const profile = await loadProfile(category);

  // 2. Load applicable degradation factors from DB
  const factors = await loadDegradationFactors(category, ingredientMap);

  // 3. Resolve target environments
  const targetEnvironments = resolveEnvironments(environments);

  // 4. For each environment, compute failure times per module
  const results = [];

  for (const env of targetEnvironments) {
    const tempAccel = tempAcceleration(env.temp);
    const humidFact = humidityFactor(env.humidity);
    const pkgFact = packagingFactor(packagingType);
    const phFact = phMicrobialFactor(phValue);

    // ── Module 1: Chemical Degradation ──
    // Base time divided by oxidation susceptibility × temperature × packaging
    const oxidationDivisor = Math.max(0.1, profile.oxidation_susceptibility * tempAccel * pkgFact);
    let chemMonths = profile.base_shelf_life_months / oxidationDivisor;
    // Add ingredient-level chemical effects
    chemMonths += sumEffects(factors, ingredientMap, "chemical_effect_months");
    chemMonths = Math.max(1, chemMonths);

    // ── Module 2: Microbial Growth ──
    // Base time divided by microbial risk × humidity × pH factor
    const microbialDivisor = Math.max(0.1, profile.microbial_risk_base * humidFact * phFact);
    let microMonths = profile.base_shelf_life_months / microbialDivisor;
    // Add ingredient-level microbial effects
    microMonths += sumEffects(factors, ingredientMap, "microbial_effect_months");
    // Water content override: high water drastically shortens microbial shelf life
    if (waterPercent !== null && waterPercent > 15) {
      microMonths *= 0.6;
    }
    microMonths = Math.max(1, microMonths);

    // ── Module 3: Physical Instability ──
    // Temperature affects physical stability at a reduced rate (0.5 weight)
    const physicalDivisor = Math.max(0.1, profile.physical_stability_base * (tempAccel * 0.5 + 0.5));
    let physMonths = profile.base_shelf_life_months / physicalDivisor;
    // Add ingredient-level physical effects
    physMonths += sumEffects(factors, ingredientMap, "physical_effect_months");
    physMonths = Math.max(1, physMonths);

    // ── Final Shelf Life = MIN(all failure times) ──
    const minFailure = Math.min(chemMonths, microMonths, physMonths);
    const roundedMin = Math.max(1, minFailure);

    // Range = ±15% uncertainty band
    const predictedMin = Math.max(1, Math.round(roundedMin * 0.85));
    const predictedMax = Math.max(predictedMin + 1, Math.round(roundedMin * 1.15));

    // Identify limiting factor
    let limitingFactor;
    if (minFailure === chemMonths) limitingFactor = "Chemical Degradation";
    else if (minFailure === microMonths) limitingFactor = "Microbial Growth";
    else limitingFactor = "Physical Instability";

    results.push({
      environment: env.name,
      temp_celsius: env.temp,
      humidity_percent: env.humidity,
      chemical_months: Math.round(chemMonths),
      microbial_months: Math.round(microMonths),
      physical_months: Math.round(physMonths),
      predicted_min_months: predictedMin,
      predicted_max_months: predictedMax,
      limiting_factor: limitingFactor,
      confidence: determineConfidence(
        normalizedIngredients.length,
        phValue,
        waterPercent
      ),
    });
  }

  return {
    category,
    base_shelf_life: profile.base_shelf_life_months,
    packaging: packagingType || "SEMI_SEALED",
    ph: phValue,
    water_percent: waterPercent,
    environments: results,
    overall_confidence: overallConfidence(results),
    disclaimer: "These estimates are for pre-lab planning purposes only.",
  };
}

module.exports = {
  predictShelfLife,
  // Export internals for unit testing
  tempAcceleration,
  humidityFactor,
  packagingFactor,
  phMicrobialFactor,
  isThresholdMet,
  sumEffects,
  determineConfidence,
  overallConfidence,
};
