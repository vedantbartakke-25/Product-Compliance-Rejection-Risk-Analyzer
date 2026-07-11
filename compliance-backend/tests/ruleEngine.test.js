const { evaluateCompliance, getAvailableCategories, loadRules, executeRule, calculateRisk, RISK_POINTS } = require("../src/services/ruleEngine");

describe("Rule Engine", () => {
  describe("getAvailableCategories", () => {
    test("returns soap as an available category", () => {
      const categories = getAvailableCategories();
      expect(categories).toContain("soap");
    });

    test("returns cookies as an available category", () => {
      const categories = getAvailableCategories();
      expect(categories).toContain("cookies");
    });
  });

  describe("loadRules", () => {
    test("loads soap rules successfully", () => {
      const rules = loadRules("soap");
      expect(rules.category).toBe("Soap");
      expect(rules.rules.length).toBe(15);
    });

    test("loads cookies rules successfully", () => {
      const rules = loadRules("cookies");
      expect(rules.category).toBe("Cookies & Biscuits");
    });

    test("throws on non-existent category", () => {
      expect(() => loadRules("nonexistent")).toThrow("No rule file found");
    });
  });

  describe("executeRule", () => {
    test("returns PASS for compliant MIN_LIMIT", () => {
      const rule = { id: "R001", name: "TFM Test", type: "MIN_LIMIT", target_code: "PARAM-TFM", limit: 76, unit: "%", severity: "CRITICAL" };
      const map = new Map([["PARAM-TFM", 90]]);
      const outcome = executeRule(rule, map, "IngredientLimitTest");
      expect(outcome.outcome).toBe("PASS");
      expect(outcome.test_module).toBe("IngredientLimitTest");
      expect(outcome.reasoning).toContain("meets MIN_LIMIT");
    });

    test("returns FAIL for violated MIN_LIMIT", () => {
      const rule = { id: "R001", name: "TFM Test", type: "MIN_LIMIT", target_code: "PARAM-TFM", limit: 76, unit: "%", severity: "CRITICAL" };
      const map = new Map([["PARAM-TFM", 50]]);
      const outcome = executeRule(rule, map, "IngredientLimitTest");
      expect(outcome.outcome).toBe("FAIL");
      expect(outcome.deviation_pct).toBeLessThan(0);
    });

    test("returns FAIL for banned substance present", () => {
      const rule = { id: "R004", name: "Mercury Ban", type: "BANNED", target_code: "CAS-7439-97-6", limit: 0, unit: "%", severity: "CRITICAL" };
      const map = new Map([["CAS-7439-97-6", 0.001]]);
      const outcome = executeRule(rule, map, "IngredientBanTest");
      expect(outcome.outcome).toBe("FAIL");
      expect(outcome.reasoning).toContain("BANNED");
    });

    test("returns PASS for banned substance absent", () => {
      const rule = { id: "R004", name: "Mercury Ban", type: "BANNED", target_code: "CAS-7439-97-6", limit: 0, unit: "%", severity: "CRITICAL" };
      const map = new Map();
      const outcome = executeRule(rule, map, "IngredientBanTest");
      expect(outcome.outcome).toBe("PASS");
    });

    test("returns NO_DATA when ingredient is missing for non-BANNED rule", () => {
      const rule = { id: "R001", name: "TFM Test", type: "MIN_LIMIT", target_code: "PARAM-TFM", limit: 76, unit: "%", severity: "CRITICAL" };
      const map = new Map();
      const outcome = executeRule(rule, map, "IngredientLimitTest");
      expect(outcome.outcome).toBe("NO_DATA");
    });

    test("returns BORDERLINE when value is within 10% of limit", () => {
      const rule = { id: "R001", name: "TFM Test", type: "MIN_LIMIT", target_code: "PARAM-TFM", limit: 76, unit: "%", severity: "CRITICAL" };
      const map = new Map([["PARAM-TFM", 77]]); // just barely above 76
      const outcome = executeRule(rule, map, "IngredientLimitTest");
      expect(outcome.outcome).toBe("BORDERLINE");
    });

    test("handles GROUP_MAX rule", () => {
      const rule = { id: "R005", name: "Heavy Metals", type: "GROUP_MAX", targets: ["CAS-A", "CAS-B"], limit: 20, unit: "ppm", severity: "CRITICAL" };
      const map = new Map([["CAS-A", 0.0015], ["CAS-B", 0.002]]);
      const outcome = executeRule(rule, map, "IngredientGroupLimitTest");
      // 0.0035% total vs 0.002% limit (20 ppm) → FAIL
      expect(outcome.outcome).toBe("FAIL");
    });
  });

  describe("calculateRisk", () => {
    test("returns zero score when all outcomes pass", () => {
      const outcomes = [
        { outcome: "PASS", rule_type: "MIN_LIMIT", severity: "CRITICAL", rule_name: "Test" },
      ];
      const risk = calculateRisk(outcomes, 0);
      expect(risk.score).toBe(0);
      expect(risk.level).toBe("NONE");
      expect(risk.breakdown).toHaveLength(0);
    });

    test("assigns BANNED_FAIL points for banned substance violations", () => {
      const outcomes = [
        { outcome: "FAIL", rule_type: "BANNED", severity: "CRITICAL", rule_name: "Mercury Ban", deviation_pct: Infinity, reasoning: "Detected" },
      ];
      const risk = calculateRisk(outcomes, 0);
      // 50 (BANNED) + 15 (density penalty: 100% fail rate) = 65
      expect(risk.score).toBe(RISK_POINTS.BANNED_FAIL + RISK_POINTS.DENSITY_PENALTY);
      expect(risk.breakdown[0].reason).toBe("BANNED_SUBSTANCE");
    });

    test("assigns density penalty when >50% of rules fail", () => {
      const outcomes = [
        { outcome: "FAIL", rule_type: "MAX_LIMIT", severity: "WARNING", rule_name: "R1", deviation_pct: 10, reasoning: "" },
        { outcome: "FAIL", rule_type: "MAX_LIMIT", severity: "WARNING", rule_name: "R2", deviation_pct: 20, reasoning: "" },
        { outcome: "PASS", rule_type: "MIN_LIMIT", severity: "CRITICAL", rule_name: "R3" },
      ];
      const risk = calculateRisk(outcomes, 0);
      const densityEntry = risk.breakdown.find((b) => b.reason === "RULE_DENSITY_PENALTY");
      expect(densityEntry).toBeDefined();
      expect(densityEntry.points).toBe(RISK_POINTS.DENSITY_PENALTY);
    });

    test("includes unknown ingredient points", () => {
      const outcomes = [];
      const risk = calculateRisk(outcomes, 3);
      expect(risk.score).toBe(3 * RISK_POINTS.UNKNOWN);
      expect(risk.breakdown[0].reason).toBe("UNKNOWN_INGREDIENTS");
    });

    test("caps score at 100", () => {
      const outcomes = [
        { outcome: "FAIL", rule_type: "BANNED", severity: "CRITICAL", rule_name: "R1", deviation_pct: Infinity, reasoning: "" },
        { outcome: "FAIL", rule_type: "BANNED", severity: "CRITICAL", rule_name: "R2", deviation_pct: Infinity, reasoning: "" },
        { outcome: "FAIL", rule_type: "BANNED", severity: "CRITICAL", rule_name: "R3", deviation_pct: Infinity, reasoning: "" },
      ];
      const risk = calculateRisk(outcomes, 5);
      expect(risk.score).toBeLessThanOrEqual(100);
    });

    test("returns breakdown with details for each risk factor", () => {
      const outcomes = [
        { outcome: "FAIL", rule_type: "MAX_LIMIT", severity: "CRITICAL", rule_name: "NaOH Test", deviation_pct: 60, reasoning: "over limit" },
        { outcome: "BORDERLINE", rule_type: "MIN_LIMIT", severity: "WARNING", rule_name: "TFM Test", deviation_pct: 2, reasoning: "near limit" },
      ];
      const risk = calculateRisk(outcomes, 0);
      expect(risk.breakdown.length).toBeGreaterThanOrEqual(2);
      risk.breakdown.forEach((b) => {
        expect(b).toHaveProperty("reason");
        expect(b).toHaveProperty("points");
        expect(b).toHaveProperty("details");
      });
    });
  });

  describe("evaluateCompliance (legacy wrapper)", () => {
    test("returns COMPLIANT when all rules pass", () => {
      const ingredients = [
        { substance_id: "PARAM-TFM", value_percent: 90 },
        { substance_id: "CAS-1310-73-2", value_percent: 0.02 },
      ];
      const result = evaluateCompliance(ingredients, [], "soap");
      expect(result.status).toBe("COMPLIANT");
      expect(result.total_violations).toBe(0);
      expect(result.risk_score).toBe(0);
      expect(result.risk_breakdown).toBeDefined();
      expect(result.rule_outcomes).toBeDefined();
    });

    test("returns NON-COMPLIANT when MIN_LIMIT is violated", () => {
      const ingredients = [
        { substance_id: "PARAM-TFM", value_percent: 50 },
      ];
      const result = evaluateCompliance(ingredients, [], "soap");
      expect(result.status).toBe("NON-COMPLIANT");
      expect(result.total_violations).toBeGreaterThan(0);
    });

    test("returns NON-COMPLIANT when BANNED substance is present", () => {
      const ingredients = [
        { substance_id: "PARAM-TFM", value_percent: 80 },
        { substance_id: "CAS-7439-97-6", value_percent: 0.001 },
      ];
      const result = evaluateCompliance(ingredients, [], "soap");
      expect(result.status).toBe("NON-COMPLIANT");
      expect(result.violations.some((v) => v.rule_name.includes("Mercury"))).toBe(true);
    });

    test("returns BORDERLINE when value is within 10% of limit", () => {
      const ingredients = [
        { substance_id: "PARAM-TFM", value_percent: 77 },
      ];
      const result = evaluateCompliance(ingredients, [], "soap");
      expect(result.total_borderlines).toBeGreaterThan(0);
    });

    test("returns NOT_EVALUATED when unknowns exist and no violations", () => {
      const ingredients = [
        { substance_id: "PARAM-TFM", value_percent: 90 },
      ];
      const result = evaluateCompliance(ingredients, ["UnknownSubstance"], "soap");
      expect(result.status).toBe("NOT_EVALUATED");
      expect(result.missing_data_count).toBe(1);
    });

    test("detects GROUP_MAX violations", () => {
      const ingredients = [
        { substance_id: "PARAM-TFM", value_percent: 80 },
        { substance_id: "CAS-7439-92-1", value_percent: 0.0015 },
        { substance_id: "CAS-7440-38-2", value_percent: 0.002 },
      ];
      const result = evaluateCompliance(ingredients, [], "soap");
      const groupViolation = result.violations.find((v) => v.rule_id === "SP010");
      expect(groupViolation).toBeDefined();
    });

    test("works with cookies category (extensibility proof)", () => {
      const ingredients = [
        { substance_id: "PARAM-TRANSFAT", value_percent: 1.5 },
      ];
      const result = evaluateCompliance(ingredients, [], "cookies");
      expect(result.standard).toBe("FSSAI 2.11.10");
      expect(result.status).toBe("COMPLIANT");
    });

    test("risk score is capped at 100", () => {
      const ingredients = [
        { substance_id: "PARAM-TFM", value_percent: 10 },
        { substance_id: "CAS-7439-97-6", value_percent: 5 },
        { substance_id: "CAS-50-00-0", value_percent: 1 },
      ];
      const result = evaluateCompliance(ingredients, [], "soap");
      expect(result.risk_score).toBeLessThanOrEqual(100);
    });

    test("rule_outcomes array contains all rule results", () => {
      const ingredients = [
        { substance_id: "PARAM-TFM", value_percent: 80 },
      ];
      const result = evaluateCompliance(ingredients, [], "soap");
      expect(result.rule_outcomes.length).toBe(15); // 15 soap rules (incl. SP013-SP015 + groups)
      result.rule_outcomes.forEach((o) => {
        expect(o).toHaveProperty("test_module");
        expect(o).toHaveProperty("outcome");
        expect(o).toHaveProperty("reasoning");
      });
    });
  });
});
