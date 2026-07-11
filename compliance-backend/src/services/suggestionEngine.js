const { normalizeToPercent } = require("../utils/unitConverter");

/**
 * Suggestion Engine
 *
 * Generates actionable optimization suggestions from rule outcomes.
 * Also produces a sensitivity analysis ranking.
 */

// ── Safe margin multipliers ──────────────────────────────────
// These target the "comfortably passing" zone, NOT the borderline edge.
//
// Borderline zone = within 10% of the limit value.
// For MAX_LIMIT 0.05%: borderline starts at 0.045% → we suggest 0.0425% (85%)
// For MIN_LIMIT 76%:   borderline ends at 83.6%   → we suggest 79.8% (105%)
//   79.8% is above 76% (passes) and inside the borderline zone,
//   but that's better than landing exactly on the edge at 83.6%.
//   A practical formulation can't always jump 10%+ above the limit.

const SAFE_BELOW_MARGIN = 0.85; // suggest 85% of MAX_LIMIT
const SAFE_ABOVE_MARGIN = 1.05; // suggest 105% of MIN_LIMIT (was 1.10 — too aggressive)

// ── Suggestion Generation ────────────────────────────────────

/**
 * Generate optimization suggestions from rule outcomes.
 *
 * @param {Array}  ruleOutcomes   - Full rule outcomes from pipeline stage 4-5
 * @param {Map}    ingredientMap  - Map<ref_code, value_percent>
 * @param {Map}    codeToInputName - Map<ref_code, user_input_name> (optional)
 * @returns {Object} {suggestions, sensitivity}
 */
function generateSuggestions(ruleOutcomes, ingredientMap, codeToInputName = new Map()) {
  const suggestions = [];
  let sugId = 0;

  for (const outcome of ruleOutcomes) {
    if (outcome.outcome !== "FAIL" && outcome.outcome !== "BORDERLINE") continue;

    const isBorderline = outcome.outcome === "BORDERLINE";
    const priority = isBorderline ? "LOW" : "HIGH";
    const currentValue = outcome.actual_value;
    const limitValue = outcome.limit_value;

    // Resolve user's original ingredient name (e.g. "Lye" not "Free Alkali (NaOH)")
    const inputName = codeToInputName.get(outcome.target_code) || null;

    if (outcome.rule_type === "BANNED") {
      suggestions.push({
        id: `sug-${++sugId}`,
        priority: "CRITICAL",
        type: "REMOVE",
        target_ingredient: outcome.rule_name,
        target_code: outcome.target_code,
        input_name: inputName,
        current_value: currentValue,
        suggested_value: 0,
        unit: "%",
        rule_name: outcome.rule_name,
        reason: `${outcome.rule_name} is a BANNED substance — must be completely removed from formulation.`,
        estimated_outcome: `${outcome.outcome} → PASS`,
      });
    } else if (outcome.rule_type === "MAX_LIMIT") {
      if (currentValue === null || currentValue === undefined) continue;

      const suggestedValue = parseFloat((limitValue * SAFE_BELOW_MARGIN).toFixed(4));
      const reductionPct = currentValue > 0
        ? Math.round(((currentValue - suggestedValue) / currentValue) * 100)
        : 0;

      // Different text for FAIL vs BORDERLINE
      let reason;
      if (isBorderline) {
        reason = `${outcome.rule_name} at ${formatValue(currentValue)}% is within the borderline zone of MAX_LIMIT ${formatValue(limitValue)}%. Reduce to ${formatValue(suggestedValue)}% for a safer margin.`;
      } else {
        reason = `${outcome.rule_name} at ${formatValue(currentValue)}% exceeds MAX_LIMIT of ${formatValue(limitValue)}%. Reduce by ~${reductionPct}% to ${formatValue(suggestedValue)}% for safe compliance margin.`;
      }

      suggestions.push({
        id: `sug-${++sugId}`,
        priority,
        type: "REDUCE",
        target_ingredient: outcome.rule_name,
        target_code: outcome.target_code,
        input_name: inputName,
        current_value: currentValue,
        suggested_value: suggestedValue,
        unit: "%",
        rule_name: outcome.rule_name,
        reason,
        estimated_outcome: `${outcome.outcome} → PASS`,
      });
    } else if (outcome.rule_type === "MIN_LIMIT") {
      if (currentValue === null || currentValue === undefined) continue;

      const suggestedValue = parseFloat((limitValue * SAFE_ABOVE_MARGIN).toFixed(4));

      // Don't suggest the same value the user already has (useless suggestion)
      if (Math.abs(suggestedValue - currentValue) < 0.001) continue;

      // Don't suggest decreasing when the user is already above the suggested value
      if (currentValue >= suggestedValue && isBorderline) continue;

      const increasePct = currentValue > 0
        ? Math.round(((suggestedValue - currentValue) / currentValue) * 100)
        : 100;

      let reason;
      if (isBorderline) {
        reason = `${outcome.rule_name} at ${formatValue(currentValue)}% is in the borderline zone (within 10% of MIN_LIMIT ${formatValue(limitValue)}%). Consider increasing to ${formatValue(suggestedValue)}% for a safer margin.`;
      } else {
        reason = `${outcome.rule_name} at ${formatValue(currentValue)}% is below MIN_LIMIT of ${formatValue(limitValue)}%. Increase by ~${increasePct}% to ${formatValue(suggestedValue)}% for safe margin.`;
      }

      suggestions.push({
        id: `sug-${++sugId}`,
        priority,
        type: "INCREASE",
        target_ingredient: outcome.rule_name,
        target_code: outcome.target_code,
        input_name: inputName,
        current_value: currentValue,
        suggested_value: suggestedValue,
        unit: "%",
        rule_name: outcome.rule_name,
        reason,
        estimated_outcome: `${outcome.outcome} → PASS`,
      });
    } else if (outcome.rule_type === "GROUP_MAX") {
      if (currentValue === null || currentValue === undefined) continue;

      let reason;
      if (isBorderline) {
        reason = `${outcome.rule_name} group total at ${formatValue(currentValue)}% is in the borderline zone of GROUP_MAX ${formatValue(limitValue)}%. Reduce one or more ingredients in this group.`;
      } else {
        reason = `${outcome.rule_name} group total at ${formatValue(currentValue)}% exceeds GROUP_MAX of ${formatValue(limitValue)}%. Reduce one or more ingredients in this group.`;
      }

      suggestions.push({
        id: `sug-${++sugId}`,
        priority,
        type: "REDUCE",
        target_ingredient: outcome.rule_name,
        target_code: outcome.target_code,
        input_name: inputName,
        current_value: currentValue,
        suggested_value: parseFloat((limitValue * SAFE_BELOW_MARGIN).toFixed(4)),
        unit: "%",
        rule_name: outcome.rule_name,
        reason,
        estimated_outcome: `${outcome.outcome} → PASS`,
      });
    }
  }

  // Sort: CRITICAL > HIGH > LOW
  const priorityOrder = { CRITICAL: 0, HIGH: 1, LOW: 2 };
  suggestions.sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3));

  // ── Sensitivity Analysis ───────────────────────────────────

  const sensitivity = generateSensitivity(ruleOutcomes, ingredientMap);

  return { suggestions, sensitivity };
}

// ── Sensitivity Analysis ─────────────────────────────────────

/**
 * Rank ingredients by how sensitive they are — i.e., how close to a rule limit.
 * Higher sensitivity = small change has big compliance impact.
 */
function generateSensitivity(ruleOutcomes, ingredientMap) {
  const sensitivityList = [];
  const severityScore = { CRITICAL: 10, WARNING: 6, INFO: 3 };

  for (const outcome of ruleOutcomes) {
    if (outcome.rule_type === "BANNED") continue; // binary, not "sensitive"
    if (outcome.actual_value === null || outcome.actual_value === undefined) continue;
    if (outcome.limit_value === null || outcome.limit_value === undefined) continue;

    const actual = outcome.actual_value;
    const limit = outcome.limit_value;

    // Proximity = how close is actual to limit (0-1 scale)
    const distance = Math.abs(actual - limit);
    const proximity = limit > 0 ? 1 - Math.min(1, distance / limit) : 0;

    // Sensitivity = proximity × severity weight
    const sevScore = severityScore[outcome.severity] || 3;
    const sensitivityScore = parseFloat((proximity * sevScore).toFixed(2));

    sensitivityList.push({
      ingredient: outcome.rule_name,
      code: outcome.target_code,
      current: actual,
      limit,
      type: outcome.rule_type,
      severity: outcome.severity,
      outcome: outcome.outcome,
      proximity: parseFloat(proximity.toFixed(3)),
      sensitivity_score: sensitivityScore,
    });
  }

  // Sort by sensitivity (highest first)
  sensitivityList.sort((a, b) => b.sensitivity_score - a.sensitivity_score);

  return sensitivityList;
}

// ── Helpers ──────────────────────────────────────────────────

function formatValue(val) {
  if (val === null || val === undefined) return "N/A";
  if (val >= 1) return Number(val).toFixed(2);
  return Number(val).toFixed(4);
}

module.exports = {
  generateSuggestions,
  generateSensitivity,
  SAFE_BELOW_MARGIN,
  SAFE_ABOVE_MARGIN,
};
