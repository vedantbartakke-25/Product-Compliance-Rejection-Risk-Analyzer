const { resolveIngredient } = require("./normalizationService");
const { normalizeToPercent } = require("../utils/unitConverter");
const { loadRules, calculateRisk } = require("./ruleEngine");
const { TEST_MODULES } = require("./testModules");
const { computeDelta } = require("./deltaEngine");
const { generateSuggestions } = require("./suggestionEngine");

/**
 * SimulationPipeline — Lightweight 7-stage pipeline for iterative testing.
 *
 * Reuses compliance logic (stages 1-5) but SKIPS:
 *   - AI explanation (stage 6 of compliance) → too slow for iterative testing
 *   - DB persistence (stage 7 of compliance) → version history lives in frontend state
 *
 * ADDS:
 *   - DELTA_ANALYSIS  → compare with previous version
 *   - SUGGESTION_GEN  → generate optimization suggestions
 *
 * Stages:
 *   1. INGESTION             — Extract input
 *   2. NORMALIZATION         — Resolve aliases, normalize units
 *   3. RULE_RETRIEVAL        — Load rules for category
 *   4. TEST_MODULE_EXECUTION — Run all compliance test modules
 *   5. AGGREGATION           — Status + risk score
 *   6. DELTA_ANALYSIS        — Compare with previous version
 *   7. SUGGESTION_GEN        — Generate optimization suggestions
 */

// ── Stage 1: INGESTION ───────────────────────────────────────

function runIngestion(context) {
  const { validatedInput } = context;
  context.productName = validatedInput.productName;
  context.category = validatedInput.category;
  context.rawIngredients = validatedInput.ingredients;
}

// ── Stage 2: NORMALIZATION ───────────────────────────────────

async function runNormalization(context) {
  const normalizedIngredients = [];
  const unknownIngredients = [];

  for (const item of context.rawIngredients) {
    const substance = await resolveIngredient(item.name);

    if (substance) {
      const percentValue = normalizeToPercent(item.concentration, item.unit);
      normalizedIngredients.push({
        input_name: item.name,
        substance_id: substance.reference_code,
        official_name: substance.official_name,
        type: substance.type,
        value_percent: percentValue,
      });
    } else {
      unknownIngredients.push(item.name);
    }
  }

  context.normalizedIngredients = normalizedIngredients;
  context.unknownIngredients = unknownIngredients;

  context.ingredientMap = new Map();
  normalizedIngredients.forEach((item) => {
    context.ingredientMap.set(item.substance_id, item.value_percent);
  });
}

// ── Stage 3: RULE_RETRIEVAL ──────────────────────────────────

function runRuleRetrieval(context) {
  const ruleSet = loadRules(context.category);
  context.ruleSet = ruleSet;
  context.standard = ruleSet.standard;
}

// ── Stage 4: TEST_MODULE_EXECUTION ───────────────────────────

async function runTestModules(context) {
  const allOutcomes = [];

  for (const mod of TEST_MODULES) {
    let outcomes;
    if (mod.async) {
      outcomes = await mod.executor(context.ingredientMap, context.ruleSet.rules, context.category);
    } else {
      outcomes = mod.executor(context.ingredientMap, context.ruleSet.rules, context.category);
    }
    allOutcomes.push(...outcomes);
  }

  context.allOutcomes = allOutcomes;
}

// ── Stage 5: AGGREGATION ─────────────────────────────────────

function runAggregation(context) {
  const { allOutcomes, unknownIngredients } = context;
  const riskAnalysis = calculateRisk(allOutcomes, unknownIngredients.length);

  const violations = allOutcomes.filter((o) => o.outcome === "FAIL");
  const borderlines = allOutcomes.filter((o) => o.outcome === "BORDERLINE");
  const passes = allOutcomes.filter((o) => o.outcome === "PASS");

  let status = "COMPLIANT";
  if (violations.length > 0) status = "NON-COMPLIANT";
  else if (borderlines.length > 0) status = "BORDERLINE";
  else if (unknownIngredients.length > 0) status = "NOT_EVALUATED";

  context.status = status;
  context.risk_score = riskAnalysis.score;
  context.risk_level = riskAnalysis.level;
  context.risk_breakdown = riskAnalysis.breakdown;
  context.total_violations = violations.length;
  context.total_borderlines = borderlines.length;
  context.total_passes = passes.length;
  context.missing_data_count = unknownIngredients.length;
}

// ── Stage 6: DELTA ANALYSIS ──────────────────────────────────

function runDeltaAnalysis(context) {
  const { previousVersion } = context;

  const currentResult = {
    raw_ingredients: context.rawIngredients,
    rule_outcomes: context.allOutcomes,
    risk_score: context.risk_score,
    status: context.status,
    total_violations: context.total_violations,
    total_borderlines: context.total_borderlines,
  };

  context.delta = computeDelta(previousVersion, currentResult);
}

// ── Stage 7: SUGGESTION GENERATION ───────────────────────────

function runSuggestionGen(context) {
  // Build a map from target_code → user's input name
  // so suggestions can reference what the user actually typed
  const codeToInputName = new Map();
  for (const item of context.normalizedIngredients) {
    codeToInputName.set(item.substance_id, item.input_name);
  }

  context.suggestions = generateSuggestions(
    context.allOutcomes,
    context.ingredientMap,
    codeToInputName
  );
}

// ── Public API ───────────────────────────────────────────────

/**
 * Run the simulation pipeline.
 *
 * @param {Object} validatedInput - {productName, category, ingredients}
 * @param {Object|null} previousVersion - Previous version for delta analysis
 * @returns {Object} Simulation result with compliance, delta, and suggestions
 */
async function simulate(validatedInput, previousVersion = null) {
  const start = Date.now();
  const context = { validatedInput, previousVersion };

  // Stages 1-5: Core compliance evaluation (reused)
  runIngestion(context);
  await runNormalization(context);
  runRuleRetrieval(context);
  await runTestModules(context);
  runAggregation(context);

  // Stages 6-7: Simulation-specific
  runDeltaAnalysis(context);
  runSuggestionGen(context);

  const durationMs = Date.now() - start;

  return {
    duration_ms: durationMs,
    product: context.productName,
    category: context.category,
    standard: context.standard,
    normalization_summary: {
      resolved_count: context.normalizedIngredients.length,
      unknown_count: context.unknownIngredients.length,
      unknown_list: context.unknownIngredients,
    },
    compliance: {
      status: context.status,
      risk_score: context.risk_score,
      risk_level: context.risk_level,
      risk_breakdown: context.risk_breakdown,
      total_violations: context.total_violations,
      total_borderlines: context.total_borderlines,
      total_passes: context.total_passes,
      missing_data_count: context.missing_data_count,
      rule_outcomes: context.allOutcomes,
    },
    delta: context.delta,
    suggestions: context.suggestions,
  };
}

module.exports = { simulate };
