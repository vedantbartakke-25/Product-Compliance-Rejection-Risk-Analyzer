const { loadRules, executeRule, calculateRisk } = require("./ruleEngine");
const { normalizeToPercent } = require("../utils/unitConverter");

/**
 * Delta Analysis Engine
 *
 * Computes per-ingredient impact analysis between two formulation versions.
 * Tracks: what changed, why it matters, which rules flipped, and risk impact.
 */

// ── Change Detection ─────────────────────────────────────────

/**
 * Detect ingredient-level changes between two formulations.
 * @param {Array} prevIngredients - Previous version's ingredients [{name, concentration, unit}]
 * @param {Array} currIngredients - Current version's ingredients
 * @returns {Array} Change list with action (ADDED/REMOVED/MODIFIED/UNCHANGED)
 */
function detectIngredientChanges(prevIngredients, currIngredients) {
  const prevMap = new Map();
  prevIngredients.forEach((item) => {
    prevMap.set(item.name.toLowerCase().trim(), item);
  });

  const currMap = new Map();
  currIngredients.forEach((item) => {
    currMap.set(item.name.toLowerCase().trim(), item);
  });

  const changes = [];

  // Check current ingredients against previous
  for (const [key, curr] of currMap) {
    const prev = prevMap.get(key);
    if (!prev) {
      changes.push({
        name: curr.name,
        action: "ADDED",
        old_value: null,
        old_unit: null,
        new_value: Number(curr.concentration),
        new_unit: curr.unit,
        change_pct: null,
      });
    } else {
      const oldVal = Number(prev.concentration);
      const newVal = Number(curr.concentration);
      const samUnit = prev.unit === curr.unit;
      const changed = !samUnit || Math.abs(oldVal - newVal) > 0.0001;

      changes.push({
        name: curr.name,
        action: changed ? "MODIFIED" : "UNCHANGED",
        old_value: oldVal,
        old_unit: prev.unit,
        new_value: newVal,
        new_unit: curr.unit,
        change_pct: changed && oldVal > 0
          ? parseFloat((((newVal - oldVal) / oldVal) * 100).toFixed(2))
          : changed ? null : 0,
      });
    }
  }

  // Check for removed ingredients
  for (const [key, prev] of prevMap) {
    if (!currMap.has(key)) {
      changes.push({
        name: prev.name,
        action: "REMOVED",
        old_value: Number(prev.concentration),
        old_unit: prev.unit,
        new_value: null,
        new_unit: null,
        change_pct: -100,
      });
    }
  }

  return changes;
}

// ── Rule Outcome Diffing ─────────────────────────────────────

/**
 * Compare rule outcomes between two versions.
 * @param {Array} prevOutcomes - [{rule_id, outcome, actual_value}]
 * @param {Array} currOutcomes - Full rule outcomes from current evaluation
 * @returns {Array} Rules that changed outcome
 */
function diffRuleOutcomes(prevOutcomes, currOutcomes) {
  if (!prevOutcomes || prevOutcomes.length === 0) return [];

  const prevMap = new Map();
  prevOutcomes.forEach((o) => prevMap.set(o.rule_id, o));

  const flips = [];
  for (const curr of currOutcomes) {
    const prev = prevMap.get(curr.rule_id);
    if (prev && prev.outcome !== curr.outcome) {
      flips.push({
        rule_id: curr.rule_id,
        rule_name: curr.rule_name,
        old_outcome: prev.outcome,
        new_outcome: curr.outcome,
        old_value: prev.actual_value,
        new_value: curr.actual_value,
      });
    }
  }

  return flips;
}

// ── Impact Attribution ───────────────────────────────────────

/**
 * For each modified/added/removed ingredient, estimate its impact on the
 * risk score by isolating its effect on rule outcomes.
 */
function attributeImpact(ingredientChanges, outcomeFlips, prevRiskScore, currRiskScore) {
  const totalDelta = prevRiskScore - currRiskScore;

  return ingredientChanges
    .filter((c) => c.action !== "UNCHANGED")
    .map((change) => {
      // Find outcome flips related to this ingredient
      const nameLower = change.name.toLowerCase();
      const relatedFlips = outcomeFlips.filter((f) => {
        const ruleLower = (f.rule_name || "").toLowerCase();
        return ruleLower.includes(nameLower) ||
               nameLower.includes(ruleLower.split("(")[0].trim().toLowerCase().split(" ")[0]);
      });

      // Estimate risk impact proportionally
      let estimatedImpact = 0;
      if (relatedFlips.length > 0 && outcomeFlips.length > 0) {
        estimatedImpact = Math.round(totalDelta * (relatedFlips.length / outcomeFlips.length));
      }

      // Generate explanation
      let explanation = "";
      if (change.action === "MODIFIED") {
        const direction = change.new_value > change.old_value ? "Increasing" : "Reducing";
        explanation = `${direction} ${change.name} from ${change.old_value}${change.old_unit} to ${change.new_value}${change.new_unit}`;
        if (relatedFlips.length > 0) {
          const flipDescs = relatedFlips.map(
            (f) => `${f.rule_name}: ${f.old_outcome} → ${f.new_outcome}`
          );
          explanation += `. Impact: ${flipDescs.join("; ")}`;
        }
      } else if (change.action === "ADDED") {
        explanation = `Added ${change.name} at ${change.new_value}${change.new_unit}`;
      } else if (change.action === "REMOVED") {
        explanation = `Removed ${change.name} (was ${change.old_value}${change.old_unit})`;
      }

      return {
        ...change,
        impact: {
          risk_delta: estimatedImpact,
          outcomes_changed: relatedFlips,
          explanation,
        },
      };
    });
}

// ── Main Delta Analysis ──────────────────────────────────────

/**
 * Compute full delta analysis between a previous version and current results.
 *
 * @param {Object} previousVersion - {ingredients, riskScore, status, ruleOutcomes}
 * @param {Object} currentResult - Current simulation result from pipeline
 * @returns {Object|null} Delta analysis or null if no previous version
 */
function computeDelta(previousVersion, currentResult) {
  if (!previousVersion) return null;

  const ingredientChanges = detectIngredientChanges(
    previousVersion.ingredients,
    currentResult.raw_ingredients
  );

  const outcomeFlips = diffRuleOutcomes(
    previousVersion.ruleOutcomes || [],
    currentResult.rule_outcomes || []
  );

  const prevRisk = previousVersion.riskScore ?? 0;
  const currRisk = currentResult.risk_score ?? 0;

  const changesWithImpact = attributeImpact(
    ingredientChanges,
    outcomeFlips,
    prevRisk,
    currRisk
  );

  const modified = ingredientChanges.filter((c) => c.action === "MODIFIED").length;
  const added = ingredientChanges.filter((c) => c.action === "ADDED").length;
  const removed = ingredientChanges.filter((c) => c.action === "REMOVED").length;

  return {
    ingredient_changes: changesWithImpact,
    outcome_flips: outcomeFlips,
    summary: {
      risk_score_delta: prevRisk - currRisk,
      status_change: {
        old: previousVersion.status,
        new: currentResult.status,
      },
      violations_delta:
        (previousVersion.totalViolations ?? 0) - (currentResult.total_violations ?? 0),
      borderlines_delta:
        (previousVersion.totalBorderlines ?? 0) - (currentResult.total_borderlines ?? 0),
      ingredients_added: added,
      ingredients_removed: removed,
      ingredients_modified: modified,
    },
  };
}

module.exports = {
  detectIngredientChanges,
  diffRuleOutcomes,
  attributeImpact,
  computeDelta,
};
