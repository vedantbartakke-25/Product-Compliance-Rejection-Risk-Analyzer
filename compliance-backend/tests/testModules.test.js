const IngredientLimitTest = require("../src/services/testModules/ingredientLimitTest");
const IngredientBanTest = require("../src/services/testModules/ingredientBanTest");
const IngredientGroupLimitTest = require("../src/services/testModules/ingredientGroupLimitTest");
const { loadRules } = require("../src/services/ruleEngine");

const soapRules = loadRules("soap").rules;

describe("Test Modules", () => {
  describe("IngredientLimitTest", () => {
    test("produces outcomes for all MIN/MAX rules", () => {
      const map = new Map([
        ["PARAM-TFM", 80],
        ["CAS-1310-73-2", 0.02],
        ["CAS-3380-34-5", 0.1],
        ["PARAM-MOISTURE", 10],
        ["CAS-7647-14-5", 0.5],
        ["CAS-60-00-4", 0.05],
        ["CAS-8050-09-7", 15],
      ]);
      const results = IngredientLimitTest.run(map, soapRules);

      // Should only contain MIN_LIMIT and MAX_LIMIT rules (11 of 15 soap rules)
      expect(results.length).toBe(11);
      results.forEach((r) => {
        expect(r.test_module).toBe("IngredientLimitTest");
        expect(["MIN_LIMIT", "MAX_LIMIT"]).toContain(r.rule_type);
        expect(r).toHaveProperty("reasoning");
      });
    });

    test("detects FAIL when exceeding MAX_LIMIT", () => {
      const map = new Map([["CAS-1310-73-2", 0.15]]); // NaOH limit is 0.1%, 0.15% is >10% deviation so FAIL
      const results = IngredientLimitTest.run(map, soapRules);
      const naohResult = results.find((r) => r.target_code === "CAS-1310-73-2");
      expect(naohResult.outcome).toBe("FAIL");
    });

    test("detects PASS when within MAX_LIMIT", () => {
      const map = new Map([["CAS-1310-73-2", 0.02]]);
      const results = IngredientLimitTest.run(map, soapRules);
      const naohResult = results.find((r) => r.target_code === "CAS-1310-73-2");
      expect(naohResult.outcome).toBe("PASS");
    });
  });

  describe("IngredientBanTest", () => {
    test("produces outcomes for all BANNED rules", () => {
      const map = new Map();
      const results = IngredientBanTest.run(map, soapRules);

      // 1 BANNED rule in soap: Mercury (Formaldehyde is now MAX_LIMIT)
      expect(results.length).toBe(1);
      results.forEach((r) => {
        expect(r.test_module).toBe("IngredientBanTest");
        expect(r.rule_type).toBe("BANNED");
      });
    });

    test("returns PASS when banned substances are absent", () => {
      const map = new Map();
      const results = IngredientBanTest.run(map, soapRules);
      results.forEach((r) => {
        expect(r.outcome).toBe("PASS");
      });
    });

    test("returns FAIL when banned substance is present", () => {
      const map = new Map([["CAS-7439-97-6", 0.001]]);
      const results = IngredientBanTest.run(map, soapRules);
      const mercury = results.find((r) => r.target_code === "CAS-7439-97-6");
      expect(mercury.outcome).toBe("FAIL");
      expect(mercury.reasoning).toContain("BANNED");
    });
  });

  describe("IngredientGroupLimitTest", () => {
    test("produces outcomes for GROUP_MAX rules", () => {
      const map = new Map([
        ["CAS-7439-92-1", 0.0005],
        ["CAS-7440-38-2", 0.0005],
      ]);
      const results = IngredientGroupLimitTest.run(map, soapRules);

      // 3 GROUP_MAX rules in soap: Heavy Metals, Total Fragrance, Total Colorant
      expect(results.length).toBe(3);
      expect(results[0].test_module).toBe("IngredientGroupLimitTest");
      expect(results[0].rule_type).toBe("GROUP_MAX");
    });

    test("detects PASS when group sum is within limit", () => {
      const map = new Map([
        ["CAS-7439-92-1", 0.0005],
        ["CAS-7440-38-2", 0.0005],
      ]);
      const results = IngredientGroupLimitTest.run(map, soapRules);
      expect(results[0].outcome).toBe("PASS");
    });

    test("detects FAIL when group sum exceeds limit", () => {
      const map = new Map([
        ["CAS-7439-92-1", 0.0015],
        ["CAS-7440-38-2", 0.002],
      ]);
      const results = IngredientGroupLimitTest.run(map, soapRules);
      expect(results[0].outcome).toBe("FAIL");
    });
  });

  describe("Module isolation", () => {
    test("all modules combined cover all 10 soap rules", () => {
      const map = new Map([["PARAM-TFM", 80]]);
      const limit = IngredientLimitTest.run(map, soapRules);
      const ban = IngredientBanTest.run(map, soapRules);
      const group = IngredientGroupLimitTest.run(map, soapRules);

      const totalCovered = limit.length + ban.length + group.length;
      expect(totalCovered).toBe(15); // 11 limit + 1 banned + 3 groups (heavy metals, fragrance, colorant)
    });

    test("each outcome has all required fields", () => {
      const map = new Map([["PARAM-TFM", 80]]);
      const results = IngredientLimitTest.run(map, soapRules);
      results.forEach((r) => {
        expect(r).toHaveProperty("test_module");
        expect(r).toHaveProperty("rule_id");
        expect(r).toHaveProperty("rule_name");
        expect(r).toHaveProperty("rule_type");
        expect(r).toHaveProperty("outcome");
        expect(r).toHaveProperty("severity");
        expect(r).toHaveProperty("reasoning");
      });
    });
  });
});
