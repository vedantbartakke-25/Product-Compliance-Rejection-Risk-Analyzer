const db = require("../../config/db");

/**
 * IngredientInteractionTest — Detects dangerous chemical combinations.
 * Queries the ingredient_interactions table for known incompatibilities
 * between substances present in the formulation.
 */
async function run(ingredientMap, _rules, category) {
  const presentCodes = Array.from(ingredientMap.keys()).filter(
    (code) => ingredientMap.get(code) > 0
  );

  if (presentCodes.length < 2) return [];

  // Look up substance IDs for the present reference codes
  const idQuery = `
    SELECT id, reference_code FROM substances
    WHERE reference_code = ANY($1)
  `;
  const idResult = await db.query(idQuery, [presentCodes]);
  const substanceIds = idResult.rows.map((r) => r.id);
  const idToCode = new Map(idResult.rows.map((r) => [r.id, r.reference_code]));

  if (substanceIds.length < 2) return [];

  // Query for any known interactions between these substances
  const interactionQuery = `
    SELECT ii.id, ii.substance_a_id, ii.substance_b_id,
           ii.interaction_type, ii.severity, ii.description,
           sa.official_name AS name_a, sb.official_name AS name_b
    FROM ingredient_interactions ii
    JOIN substances sa ON ii.substance_a_id = sa.id
    JOIN substances sb ON ii.substance_b_id = sb.id
    WHERE ii.substance_a_id = ANY($1) AND ii.substance_b_id = ANY($1)
       OR ii.substance_b_id = ANY($1) AND ii.substance_a_id = ANY($1)
  `;
  const interactionResult = await db.query(interactionQuery, [substanceIds]);

  // Convert interactions to RuleOutcome objects
  return interactionResult.rows.map((row) => {
    let outcome = "PASS";
    if (row.severity === "CRITICAL") outcome = "FAIL";
    else if (row.severity === "WARNING") outcome = "BORDERLINE";
    // INFO-level interactions are noted but not failures

    return {
      test_module: "IngredientInteractionTest",
      rule_id: `INTERACTION-${row.id}`,
      rule_name: `${row.name_a} + ${row.name_b} Interaction`,
      rule_type: "INTERACTION",
      target_code: `${idToCode.get(row.substance_a_id) || row.substance_a_id},${idToCode.get(row.substance_b_id) || row.substance_b_id}`,
      outcome,
      severity: row.severity,
      limit_value: null,
      actual_value: null,
      deviation_pct: null,
      reasoning: `${row.interaction_type}: ${row.description}`,
    };
  });
}

module.exports = { run };
