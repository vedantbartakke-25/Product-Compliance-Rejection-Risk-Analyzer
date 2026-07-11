const fs = require("fs");
const path = require("path");
const { normalizeToPercent } = require("../utils/unitConverter");

const RULES_DIR = path.join(__dirname, "../../rules");

const BORDERLINE_THRESHOLD = 0.10; // 10% of limit (for small limits)
const BORDERLINE_MAX_ABS = 5;       // cap: at most 5 percentage-point borderline zone

// ── Risk Point Weights ───────────────────────────────────────
const RISK_POINTS = {
  BANNED_FAIL:     50,
  CRITICAL_FAIL:   40,
  WARNING_FAIL:    15,
  INFO_FAIL:       5,
  INTERACTION_CRITICAL: 20,
  INTERACTION_WARNING:  10,
  INTERACTION_INFO:     5,
  BORDERLINE:      5,
  UNKNOWN:         3,   // Reduced from 8 — unknown ≠ toxic; flat heavy penalty was unrealistic
  DENSITY_PENALTY: 15,
};

// ── Rule File I/O ────────────────────────────────────────────

function loadRules(category) {
  const rulesPath = path.join(RULES_DIR, `${category}.bis.json`);
  if (!fs.existsSync(rulesPath)) {
    throw new Error(`No rule file found for category: "${category}" (expected: ${rulesPath})`);
  }
  return JSON.parse(fs.readFileSync(rulesPath, "utf8"));
}

function getAvailableCategories() {
  const files = fs.readdirSync(RULES_DIR);
  return files
    .filter((f) => f.endsWith(".bis.json"))
    .map((f) => f.replace(".bis.json", ""));
}

// ── Deviation Calculation ────────────────────────────────────

function calcDeviation(actual, limit) {
  if (limit === 0) return actual > 0 ? Infinity : 0;
  const pct = ((actual - limit) / limit) * 100;
  return parseFloat(pct.toFixed(4));
}

// ── Borderline Check ─────────────────────────────────────────
// Uses adaptive threshold: min(10% of limit, 5 absolute points).
// This prevents absurd borderline zones for high-value limits
// (e.g., MIN_LIMIT 85% → zone would be 85-93.5% with flat 10%,
//  but capped to 85-90% with the 5-point absolute cap).

function checkBorderline(actualValue, limitValue, ruleType) {
  if (ruleType === "BANNED") return false;
  const diff = Math.abs(actualValue - limitValue);
  const threshold = Math.min(limitValue * BORDERLINE_THRESHOLD, BORDERLINE_MAX_ABS);
  if (ruleType === "MIN_LIMIT") {
    return actualValue >= limitValue && diff <= threshold;
  }
  if (ruleType === "MAX_LIMIT" || ruleType === "GROUP_MAX") {
    return actualValue <= limitValue && diff <= threshold;
  }
  return false;
}

// ── Single Rule Executor ─────────────────────────────────────

function executeRule(rule, ingredientMap, testModule) {
  const limitInPercent = normalizeToPercent(rule.limit, rule.unit);
  let actualValue;
  let targetCode;

  if (rule.type === "GROUP_MAX") {
    actualValue = 0;
    (rule.targets || []).forEach((tid) => {
      actualValue += ingredientMap.get(tid) || 0;
    });
    targetCode = (rule.targets || []).join(",");
  } else {
    targetCode = rule.target_code;
    actualValue = ingredientMap.get(rule.target_code);
  }

  // Build base outcome
  const outcome = {
    test_module: testModule,
    rule_id: rule.id,
    rule_name: rule.name,
    rule_type: rule.type,
    target_code: targetCode,
    severity: rule.severity,
    limit_value: limitInPercent,
    actual_value: null,
    deviation_pct: null,
    outcome: "PASS",
    reasoning: "",
  };

  // NO_DATA: ingredient not provided (except BANNED — absence = PASS)
  if (actualValue === undefined || actualValue === null) {
    if (rule.type === "BANNED") {
      outcome.outcome = "PASS";
      outcome.actual_value = 0;
      outcome.deviation_pct = 0;
      outcome.reasoning = `${rule.name} not detected in formulation — BANNED substance check passed`;
      return outcome;
    }
    outcome.outcome = "NO_DATA";
    outcome.reasoning = `No data provided for ${rule.name} — cannot evaluate against ${rule.type} of ${rule.limit} ${rule.unit}`;
    return outcome;
  }

  outcome.actual_value = actualValue;
  outcome.deviation_pct = calcDeviation(actualValue, limitInPercent);

  // Evaluate by type
  if (rule.type === "BANNED") {
    if (actualValue > 0) {
      outcome.outcome = "FAIL";
      outcome.reasoning = `${rule.name} detected at ${actualValue.toFixed(4)}% — substance is BANNED (zero tolerance)`;
    } else {
      outcome.outcome = "PASS";
      outcome.reasoning = `${rule.name} not detected in formulation — BANNED substance check passed`;
    }
  } else if (rule.type === "MIN_LIMIT") {
    if (actualValue < limitInPercent) {
      outcome.outcome = "FAIL";
      outcome.reasoning = `${rule.name} at ${actualValue.toFixed(4)}% is below MIN_LIMIT of ${limitInPercent.toFixed(4)}% (deviation: ${outcome.deviation_pct.toFixed(2)}%)`;
    } else if (checkBorderline(actualValue, limitInPercent, rule.type)) {
      outcome.outcome = "BORDERLINE";
      outcome.reasoning = `${rule.name} at ${actualValue.toFixed(4)}% is within 10% of MIN_LIMIT ${limitInPercent.toFixed(4)}% — borderline compliance`;
    } else {
      outcome.outcome = "PASS";
      outcome.reasoning = `${rule.name} at ${actualValue.toFixed(4)}% meets MIN_LIMIT of ${limitInPercent.toFixed(4)}% (margin: +${outcome.deviation_pct.toFixed(2)}%)`;
    }
  } else if (rule.type === "MAX_LIMIT" || rule.type === "GROUP_MAX") {
    if (actualValue > limitInPercent) {
      outcome.outcome = "FAIL";
      outcome.reasoning = `${rule.name} at ${actualValue.toFixed(4)}% exceeds ${rule.type} of ${limitInPercent.toFixed(4)}% (deviation: +${outcome.deviation_pct.toFixed(2)}%)`;
    } else if (checkBorderline(actualValue, limitInPercent, rule.type)) {
      outcome.outcome = "BORDERLINE";
      outcome.reasoning = `${rule.name} at ${actualValue.toFixed(4)}% is within 10% of ${rule.type} ${limitInPercent.toFixed(4)}% — borderline compliance`;
    } else {
      outcome.outcome = "PASS";
      outcome.reasoning = `${rule.name} at ${actualValue.toFixed(4)}% is within ${rule.type} of ${limitInPercent.toFixed(4)}% (margin: ${outcome.deviation_pct.toFixed(2)}%)`;
    }
  }

  return outcome;
}

// ── Risk Scoring with Breakdown ──────────────────────────────

function calculateRisk(allOutcomes, unknownCount) {
  let score = 0;
  const breakdown = [];

  for (const o of allOutcomes) {
    if (o.outcome === "FAIL") {
      if (o.rule_type === "BANNED") {
        score += RISK_POINTS.BANNED_FAIL;
        breakdown.push({
          reason: "BANNED_SUBSTANCE",
          points: RISK_POINTS.BANNED_FAIL,
          details: `${o.rule_name} detected`,
        });
      } else if (o.rule_type === "INTERACTION") {
        const key = `INTERACTION_${o.severity}`;
        const pts = RISK_POINTS[key] || 10;
        score += pts;
        breakdown.push({
          reason: "INGREDIENT_INTERACTION",
          points: pts,
          details: o.reasoning,
        });
      } else if (o.severity === "CRITICAL") {
        score += RISK_POINTS.CRITICAL_FAIL;
        breakdown.push({
          reason: "CRITICAL_LIMIT_EXCEEDED",
          points: RISK_POINTS.CRITICAL_FAIL,
          details: `${o.rule_name} — deviation ${o.deviation_pct}%`,
        });
      } else if (o.severity === "WARNING") {
        score += RISK_POINTS.WARNING_FAIL;
        breakdown.push({
          reason: "WARNING_LIMIT_EXCEEDED",
          points: RISK_POINTS.WARNING_FAIL,
          details: `${o.rule_name} — deviation ${o.deviation_pct}%`,
        });
      } else {
        score += RISK_POINTS.INFO_FAIL;
        breakdown.push({
          reason: "INFO_LIMIT_EXCEEDED",
          points: RISK_POINTS.INFO_FAIL,
          details: o.rule_name,
        });
      }
    } else if (o.outcome === "BORDERLINE") {
      score += RISK_POINTS.BORDERLINE;
      breakdown.push({
        reason: "BORDERLINE_VALUE",
        points: RISK_POINTS.BORDERLINE,
        details: `${o.rule_name} near limit`,
      });
    }
  }

  // Unknown ingredients
  if (unknownCount > 0) {
    const pts = unknownCount * RISK_POINTS.UNKNOWN;
    score += pts;
    breakdown.push({
      reason: "UNKNOWN_INGREDIENTS",
      points: pts,
      details: `${unknownCount} unidentified ingredient(s)`,
    });
  }

  // Density penalty
  const totalRules = allOutcomes.length;
  const failCount = allOutcomes.filter((o) => o.outcome === "FAIL").length;
  if (totalRules > 0 && failCount / totalRules > 0.5) {
    score += RISK_POINTS.DENSITY_PENALTY;
    breakdown.push({
      reason: "RULE_DENSITY_PENALTY",
      points: RISK_POINTS.DENSITY_PENALTY,
      details: `${Math.round((failCount / totalRules) * 100)}% of rules failed`,
    });
  }

  score = Math.min(score, 100);

  let level = "NONE";
  if (score >= 100) level = "CRITICAL";
  else if (score >= 70) level = "HIGH";
  else if (score >= 30) level = "MODERATE";
  else if (score > 0) level = "LOW";

  return { score, level, breakdown };
}

// ── Legacy Wrapper (backward compat for tests) ───────────────

function evaluateCompliance(normalizedIngredients, unknownIngredients = [], category = "soap") {
  const ruleSet = loadRules(category);

  const ingredientMap = new Map();
  normalizedIngredients.forEach((item) => {
    ingredientMap.set(item.substance_id, item.value_percent);
  });

  const allOutcomes = [];
  for (const rule of ruleSet.rules) {
    const moduleName =
      rule.type === "BANNED" ? "IngredientBanTest" :
      rule.type === "GROUP_MAX" ? "IngredientGroupLimitTest" :
      "IngredientLimitTest";
    allOutcomes.push(executeRule(rule, ingredientMap, moduleName));
  }

  const riskAnalysis = calculateRisk(allOutcomes, unknownIngredients.length);

  const violations = allOutcomes
    .filter((o) => o.outcome === "FAIL")
    .map((o) => ({
      rule_id: o.rule_id,
      rule_name: o.rule_name,
      severity: o.severity,
      description: o.reasoning,
      limit_readable: `${o.limit_value} %`,
      actual_percent: o.actual_value !== null ? o.actual_value.toFixed(4) + "%" : "N/A",
    }));

  const borderlines = allOutcomes
    .filter((o) => o.outcome === "BORDERLINE")
    .map((o) => ({
      rule_id: o.rule_id,
      rule_name: o.rule_name,
      description: o.reasoning,
      limit_readable: `${o.limit_value} %`,
      actual_percent: o.actual_value !== null ? o.actual_value.toFixed(4) + "%" : "N/A",
      warning: "Value is within 10% of the regulatory limit",
    }));

  let status = "COMPLIANT";
  if (violations.length > 0) {
    status = "NON-COMPLIANT";
  } else if (borderlines.length > 0) {
    status = "BORDERLINE";
  } else if (unknownIngredients.length > 0) {
    status = "NOT_EVALUATED";
  }

  return {
    status,
    risk_score: riskAnalysis.score,
    risk_level: riskAnalysis.level,
    risk_breakdown: riskAnalysis.breakdown,
    primary_reasons: riskAnalysis.breakdown.map((b) => b.reason),
    standard: ruleSet.standard,
    total_violations: violations.length,
    total_borderlines: borderlines.length,
    missing_data_count: unknownIngredients.length,
    violations,
    borderlines,
    rule_outcomes: allOutcomes,
  };
}

module.exports = {
  evaluateCompliance,
  getAvailableCategories,
  loadRules,
  executeRule,
  calculateRisk,
  calcDeviation,
  checkBorderline,
  RISK_POINTS,
};
