const IngredientLimitTest = require("./ingredientLimitTest");
const IngredientBanTest = require("./ingredientBanTest");
const IngredientGroupLimitTest = require("./ingredientGroupLimitTest");
const IngredientInteractionTest = require("./ingredientInteractionTest");
const LabelingComplianceTest = require("./labelingComplianceTest");

/**
 * Test Module Registry
 *
 * Ordered list of compliance test modules.
 * Synchronous modules (limit, ban, group) run from JSON rules.
 * Async modules (interaction, labeling) query the database.
 */
const TEST_MODULES = [
  { name: "IngredientLimitTest",       executor: IngredientLimitTest.run,      async: false },
  { name: "IngredientBanTest",         executor: IngredientBanTest.run,        async: false },
  { name: "IngredientGroupLimitTest",  executor: IngredientGroupLimitTest.run, async: false },
  { name: "IngredientInteractionTest", executor: IngredientInteractionTest.run,async: true  },
  { name: "LabelingComplianceTest",    executor: LabelingComplianceTest.run,   async: true  },
];

module.exports = { TEST_MODULES };
