const { executeRule } = require("../ruleEngine");

/**
 * IngredientBanTest — Tests BANNED substance rules.
 * Zero-tolerance check: any amount of a banned substance = FAIL.
 */
function run(ingredientMap, rules) {
  const banRules = rules.filter((r) => r.type === "BANNED");
  return banRules.map((rule) =>
    executeRule(rule, ingredientMap, "IngredientBanTest")
  );
}

module.exports = { run };
