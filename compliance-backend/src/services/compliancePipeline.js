const { resolveIngredient } = require("./normalizationService");
const { normalizeToPercent } = require("../utils/unitConverter");
const { loadRules, calculateRisk } = require("./ruleEngine");
const { generateExplanation } = require("./aiService");
const { TEST_MODULES } = require("./testModules");
const db = require("../config/db");

/**
 * CompliancePipeline — 7-stage evaluation orchestrator.
 *
 * Stages:
 *   1. INGESTION        — Extract and structure input
 *   2. NORMALIZATION     — Resolve aliases, normalize units
 *   3. RULE_RETRIEVAL    — Load rules for the product category
 *   4. TEST_MODULE_EXECUTION — Run all 5 compliance test modules
 *   5. AGGREGATION       — Classify status, compute explainable risk score
 *   6. EXPLANATION       — Generate deterministic + AI reasoning
 *   7. PERSISTENCE       — Store evaluation, rule outcomes, stages
 */

const PIPELINE_VERSION = "2.0";

// ── Stage Runner with Timing ─────────────────────────────────

async function runStage(stageName, stageOrder, fn, context) {
  const start = Date.now();
  try {
    const result = await fn(context);
    context.stages.push({
      stage_name: stageName,
      stage_order: stageOrder,
      status: "COMPLETED",
      duration_ms: Date.now() - start,
      details: null,
    });
    return result;
  } catch (error) {
    context.stages.push({
      stage_name: stageName,
      stage_order: stageOrder,
      status: "FAILED",
      duration_ms: Date.now() - start,
      details: { error: error.message },
    });
    throw error;
  }
}

// ── Stage 1: INGESTION ───────────────────────────────────────

async function runIngestion(context) {
  const { validatedInput } = context;
  context.productName = validatedInput.productName;
  context.category = validatedInput.category;
  context.manufacturer = validatedInput.manufacturer || null;
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

  // Build ingredient map for test modules
  context.ingredientMap = new Map();
  normalizedIngredients.forEach((item) => {
    context.ingredientMap.set(item.substance_id, item.value_percent);
  });
}

// ── Stage 3: RULE_RETRIEVAL ──────────────────────────────────

async function runRuleRetrieval(context) {
  const ruleSet = loadRules(context.category);
  context.ruleSet = ruleSet;
  context.standard = ruleSet.standard;
}

// ── Stage 4: TEST_MODULE_EXECUTION ───────────────────────────

async function runTestModules(context) {
  const allOutcomes = [];
  const moduleResults = {};

  for (const mod of TEST_MODULES) {
    let outcomes;
    if (mod.async) {
      outcomes = await mod.executor(context.ingredientMap, context.ruleSet.rules, context.category);
    } else {
      outcomes = mod.executor(context.ingredientMap, context.ruleSet.rules, context.category);
    }

    moduleResults[mod.name] = {
      passed: outcomes.filter((o) => o.outcome === "PASS").length,
      failed: outcomes.filter((o) => o.outcome === "FAIL").length,
      borderline: outcomes.filter((o) => o.outcome === "BORDERLINE").length,
      no_data: outcomes.filter((o) => o.outcome === "NO_DATA").length,
    };

    // Add interaction-specific count
    if (mod.name === "IngredientInteractionTest") {
      moduleResults[mod.name].interactions_found = outcomes.length;
    }

    allOutcomes.push(...outcomes);
  }

  context.allOutcomes = allOutcomes;
  context.testModuleResults = moduleResults;
}

// ── Stage 5: AGGREGATION ─────────────────────────────────────

async function runAggregation(context) {
  const { allOutcomes, unknownIngredients } = context;

  const riskAnalysis = calculateRisk(allOutcomes, unknownIngredients.length);

  const violations = allOutcomes.filter((o) => o.outcome === "FAIL");
  const borderlines = allOutcomes.filter((o) => o.outcome === "BORDERLINE");
  const passes = allOutcomes.filter((o) => o.outcome === "PASS");

  let status = "COMPLIANT";
  if (violations.length > 0) {
    status = "NON-COMPLIANT";
  } else if (borderlines.length > 0) {
    status = "BORDERLINE";
  } else if (unknownIngredients.length > 0) {
    status = "NOT_EVALUATED";
  }

  context.status = status;
  context.risk_score = riskAnalysis.score;
  context.risk_level = riskAnalysis.level;
  context.risk_breakdown = riskAnalysis.breakdown;
  context.total_violations = violations.length;
  context.total_borderlines = borderlines.length;
  context.total_passes = passes.length;
  context.missing_data_count = unknownIngredients.length;

  // Backward-compat violation objects
  context.violations = violations.map((o) => ({
    rule_id: o.rule_id,
    rule_name: o.rule_name,
    severity: o.severity,
    description: o.reasoning,
    limit_readable: o.limit_value !== null ? `${o.limit_value} %` : "N/A",
    actual_percent: o.actual_value !== null ? o.actual_value.toFixed(4) + "%" : "N/A",
  }));

  context.borderlines_legacy = borderlines.map((o) => ({
    rule_id: o.rule_id,
    rule_name: o.rule_name,
    description: o.reasoning,
    limit_readable: o.limit_value !== null ? `${o.limit_value} %` : "N/A",
    actual_percent: o.actual_value !== null ? o.actual_value.toFixed(4) + "%" : "N/A",
    warning: "Value is within 10% of the regulatory limit",
  }));
}

// ── Stage 6: EXPLANATION ─────────────────────────────────────

async function runExplanation(context) {
  // Build deterministic structured reasoning
  const lines = [];
  lines.push(`Evaluation Status: ${context.status}`);
  lines.push(`Standard: ${context.standard}`);
  lines.push(`Risk Score: ${context.risk_score}/100 (${context.risk_level})`);
  lines.push("");

  if (context.violations.length > 0) {
    lines.push("VIOLATIONS:");
    context.violations.forEach((v) => {
      lines.push(`  • [${v.severity}] ${v.rule_name}: ${v.description}`);
    });
    lines.push("");
  }

  if (context.borderlines_legacy.length > 0) {
    lines.push("BORDERLINE VALUES:");
    context.borderlines_legacy.forEach((b) => {
      lines.push(`  • ${b.rule_name}: ${b.description}`);
    });
    lines.push("");
  }

  if (context.unknownIngredients.length > 0) {
    lines.push(`UNKNOWN INGREDIENTS (${context.unknownIngredients.length}):`);
    context.unknownIngredients.forEach((u) => {
      lines.push(`  • ${u}`);
    });
    lines.push("");
  }

  if (context.risk_breakdown.length > 0) {
    lines.push("RISK BREAKDOWN:");
    context.risk_breakdown.forEach((b) => {
      lines.push(`  • ${b.reason}: +${b.points} pts — ${b.details}`);
    });
  }

  context.structured_reasoning = lines.join("\n");

  // AI summary
  if (context.status !== "COMPLIANT") {
    console.log("🤖 Generating AI Explanation...");
    const complianceReport = {
      product: context.productName,
      status: context.status,
      standard: context.standard,
      violations: context.violations,
      borderlines: context.borderlines_legacy,
      risk_score: context.risk_score,
      risk_level: context.risk_level,
    };
    context.ai_explanation = await generateExplanation(complianceReport);
  } else {
    context.ai_explanation = "Product is fully compliant. No further action required.";
  }
}

// ── Stage 7: PERSISTENCE ─────────────────────────────────────

async function runPersistence(context) {
  try {
    // 1. Insert evaluation (with user_id fallback for pre-migration DBs)
    let evalResult;
    try {
      evalResult = await db.query(
        `INSERT INTO evaluations
          (user_id, product_name, category, status, risk_score, risk_level,
           total_violations, total_borderlines, missing_data_count,
           pipeline_version, ai_explanation)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          context.userId,
          context.productName,
          context.category,
          context.status,
          context.risk_score,
          context.risk_level,
          context.total_violations,
          context.total_borderlines,
          context.missing_data_count,
          PIPELINE_VERSION,
          context.ai_explanation,
        ]
      );
    } catch (insertErr) {
      if (insertErr.message && insertErr.message.includes('user_id')) {
        console.warn('⚠️  user_id column not found — falling back without it');
        evalResult = await db.query(
          `INSERT INTO evaluations
            (product_name, category, status, risk_score, risk_level,
             total_violations, total_borderlines, missing_data_count,
             pipeline_version, ai_explanation)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id`,
          [
            context.productName,
            context.category,
            context.status,
            context.risk_score,
            context.risk_level,
            context.total_violations,
            context.total_borderlines,
            context.missing_data_count,
            PIPELINE_VERSION,
            context.ai_explanation,
          ]
        );
      } else {
        throw insertErr;
      }
    }

    const evalId = evalResult.rows[0].id;
    context.evaluation_id = evalId;

    // 2. Insert violations (backward compat)
    for (const v of context.violations) {
      await db.query(
        `INSERT INTO violations
          (evaluation_id, rule_id, rule_name, severity, description, limit_readable, actual_percent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [evalId, v.rule_id, v.rule_name, v.severity, v.description, v.limit_readable, v.actual_percent]
      );
    }

    // 3. Insert ALL rule outcomes (full audit trail)
    for (const o of context.allOutcomes) {
      await db.query(
        `INSERT INTO rule_outcomes
          (evaluation_id, test_module, rule_id, rule_name, rule_type,
           target_code, outcome, severity, limit_value, actual_value,
           deviation_pct, reasoning)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          evalId, o.test_module, o.rule_id, o.rule_name, o.rule_type,
          o.target_code, o.outcome, o.severity, o.limit_value, o.actual_value,
          o.deviation_pct === Infinity ? 9999.99 : o.deviation_pct,
          o.reasoning,
        ]
      );
    }

    // 4. Insert evaluation stages
    for (const s of context.stages) {
      await db.query(
        `INSERT INTO evaluation_stages
          (evaluation_id, stage_name, stage_order, status, duration_ms, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [evalId, s.stage_name, s.stage_order, s.status, s.duration_ms, s.details ? JSON.stringify(s.details) : null]
      );
    }

    console.log(`💾 Evaluation persisted with ID: ${evalId}`);
  } catch (error) {
    console.error("⚠️ Failed to persist evaluation:", error.message);
  }
}

// ── Public API ───────────────────────────────────────────────

async function run(validatedInput, userId = null) {
  const context = {
    validatedInput,
    userId,
    stages: [],
  };

  await runStage("INGESTION",             1, runIngestion,    context);
  await runStage("NORMALIZATION",         2, runNormalization, context);
  await runStage("RULE_RETRIEVAL",        3, runRuleRetrieval, context);
  await runStage("TEST_MODULE_EXECUTION", 4, runTestModules,  context);
  await runStage("AGGREGATION",           5, runAggregation,  context);
  await runStage("EXPLANATION",           6, runExplanation,  context);
  await runStage("PERSISTENCE",           7, runPersistence,  context);

  // Build final result
  return {
    evaluation_id: context.evaluation_id,
    product: context.productName,
    category: context.category,
    standard: context.standard,
    normalization_summary: {
      resolved_count: context.normalizedIngredients.length,
      unknown_count: context.unknownIngredients.length,
      unknown_list: context.unknownIngredients,
    },
    compliance_report: {
      status: context.status,
      risk_score: context.risk_score,
      risk_level: context.risk_level,
      risk_breakdown: context.risk_breakdown,
      test_module_results: context.testModuleResults,
      total_violations: context.total_violations,
      total_borderlines: context.total_borderlines,
      total_passes: context.total_passes,
      missing_data_count: context.missing_data_count,
      violations: context.violations,
      borderlines: context.borderlines_legacy,
      rule_outcomes: context.allOutcomes,
      stages: context.stages,
      structured_reasoning: context.structured_reasoning,
      ai_explanation: context.ai_explanation,
    },
  };
}

module.exports = { run };
