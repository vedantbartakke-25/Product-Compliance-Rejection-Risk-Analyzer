const db = require("../../config/db");

/**
 * LabelingComplianceTest — Checks that expected substances for the category
 * are declared in the formulation.
 *
 * For example, a lotion product expects Water, Glycerin, etc.
 * Missing expected substances get a NO_DATA outcome.
 */
async function run(ingredientMap, _rules, category) {
  // Query for required parameters in this category
  const query = `
    SELECT s.reference_code, s.official_name
    FROM substance_categories sc
    JOIN substances s ON sc.substance_id = s.id
    WHERE sc.category = $1
  `;
  const result = await db.query(query, [category]);
  const outcomes = [];

  for (const row of result.rows) {
    const actualValue = ingredientMap.get(row.reference_code);
    if (actualValue !== undefined && actualValue !== null) {
      outcomes.push({
        test_module: "LabelingComplianceTest",
        rule_id: `LABEL-${row.reference_code}`,
        rule_name: `${row.official_name} Declaration`,
        rule_type: "LABELING",
        target_code: row.reference_code,
        outcome: "PASS",
        severity: "WARNING",
        limit_value: null,
        actual_value: actualValue,
        deviation_pct: null,
        reasoning: `Expected substance ${row.official_name} is declared in the formulation`,
      });
    } else {
      outcomes.push({
        test_module: "LabelingComplianceTest",
        rule_id: `LABEL-${row.reference_code}`,
        rule_name: `${row.official_name} Declaration`,
        rule_type: "LABELING",
        target_code: row.reference_code,
        outcome: "NO_DATA",
        severity: "WARNING",
        limit_value: null,
        actual_value: null,
        deviation_pct: null,
        reasoning: `Expected substance ${row.official_name} is NOT declared — formulation may be incomplete`,
      });
    }
  }

  return outcomes;
}

module.exports = { run };
