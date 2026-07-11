const { executeRule } = require("../ruleEngine");

/**
 * IngredientLimitTest — Tests MIN_LIMIT and MAX_LIMIT rules.
 * Checks individual substance concentrations against regulatory thresholds.
 */
function run(ingredientMap, rules) {
  const limitRules = rules.filter(
    (r) => r.type === "MIN_LIMIT" || r.type === "MAX_LIMIT"
  );
  return limitRules.map((rule) =>
    executeRule(rule, ingredientMap, "IngredientLimitTest")
  );
}

module.exports = { run };
