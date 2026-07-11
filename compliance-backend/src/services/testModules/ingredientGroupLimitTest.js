const { executeRule } = require("../ruleEngine");

/**
 * IngredientGroupLimitTest — Tests GROUP_MAX rules.
 * Checks cumulative concentration of grouped substances (e.g. total heavy metals).
 */
function run(ingredientMap, rules) {
  const groupRules = rules.filter((r) => r.type === "GROUP_MAX");
  return groupRules.map((rule) =>
    executeRule(rule, ingredientMap, "IngredientGroupLimitTest")
  );
}

module.exports = { run };
