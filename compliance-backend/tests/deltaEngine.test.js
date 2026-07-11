const {
  detectIngredientChanges,
  diffRuleOutcomes,
  attributeImpact,
  computeDelta,
} = require("../src/services/deltaEngine");

// ── Ingredient Change Detection ──────────────────────────────

describe("detectIngredientChanges", () => {
  test("detects MODIFIED ingredient", () => {
    const prev = [{ name: "TFM", concentration: 74, unit: "%" }];
    const curr = [{ name: "TFM", concentration: 80, unit: "%" }];
    const changes = detectIngredientChanges(prev, curr);

    expect(changes).toHaveLength(1);
    expect(changes[0].action).toBe("MODIFIED");
    expect(changes[0].old_value).toBe(74);
    expect(changes[0].new_value).toBe(80);
    expect(changes[0].change_pct).toBeCloseTo(8.11, 1);
  });

  test("detects ADDED ingredient", () => {
    const prev = [{ name: "TFM", concentration: 80, unit: "%" }];
    const curr = [
      { name: "TFM", concentration: 80, unit: "%" },
      { name: "NaOH", concentration: 0.03, unit: "%" },
    ];
    const changes = detectIngredientChanges(prev, curr);

    const added = changes.find((c) => c.action === "ADDED");
    expect(added).toBeDefined();
    expect(added.name).toBe("NaOH");
    expect(added.new_value).toBe(0.03);
    expect(added.old_value).toBeNull();
  });

  test("detects REMOVED ingredient", () => {
    const prev = [
      { name: "TFM", concentration: 80, unit: "%" },
      { name: "NaOH", concentration: 0.06, unit: "%" },
    ];
    const curr = [{ name: "TFM", concentration: 80, unit: "%" }];
    const changes = detectIngredientChanges(prev, curr);

    const removed = changes.find((c) => c.action === "REMOVED");
    expect(removed).toBeDefined();
    expect(removed.name).toBe("NaOH");
    expect(removed.change_pct).toBe(-100);
  });

  test("detects UNCHANGED ingredient", () => {
    const prev = [{ name: "TFM", concentration: 80, unit: "%" }];
    const curr = [{ name: "TFM", concentration: 80, unit: "%" }];
    const changes = detectIngredientChanges(prev, curr);

    expect(changes).toHaveLength(1);
    expect(changes[0].action).toBe("UNCHANGED");
    expect(changes[0].change_pct).toBe(0);
  });

  test("handles case-insensitive name matching", () => {
    const prev = [{ name: "tfm", concentration: 80, unit: "%" }];
    const curr = [{ name: "TFM", concentration: 80, unit: "%" }];
    const changes = detectIngredientChanges(prev, curr);

    expect(changes[0].action).toBe("UNCHANGED");
  });

  test("handles empty previous (all ADDED)", () => {
    const prev = [];
    const curr = [{ name: "TFM", concentration: 80, unit: "%" }];
    const changes = detectIngredientChanges(prev, curr);

    expect(changes).toHaveLength(1);
    expect(changes[0].action).toBe("ADDED");
  });

  test("handles empty current (all REMOVED)", () => {
    const prev = [{ name: "TFM", concentration: 80, unit: "%" }];
    const curr = [];
    const changes = detectIngredientChanges(prev, curr);

    expect(changes).toHaveLength(1);
    expect(changes[0].action).toBe("REMOVED");
  });
});

// ── Rule Outcome Diffing ─────────────────────────────────────

describe("diffRuleOutcomes", () => {
  test("detects outcome flip FAIL → PASS", () => {
    const prev = [{ rule_id: "SP001", outcome: "FAIL", actual_value: 74 }];
    const curr = [
      { rule_id: "SP001", rule_name: "TFM", outcome: "PASS", actual_value: 80 },
    ];
    const flips = diffRuleOutcomes(prev, curr);

    expect(flips).toHaveLength(1);
    expect(flips[0].old_outcome).toBe("FAIL");
    expect(flips[0].new_outcome).toBe("PASS");
  });

  test("detects outcome flip PASS → FAIL", () => {
    const prev = [{ rule_id: "SP001", outcome: "PASS", actual_value: 80 }];
    const curr = [
      { rule_id: "SP001", rule_name: "TFM", outcome: "FAIL", actual_value: 70 },
    ];
    const flips = diffRuleOutcomes(prev, curr);

    expect(flips).toHaveLength(1);
    expect(flips[0].old_outcome).toBe("PASS");
    expect(flips[0].new_outcome).toBe("FAIL");
  });

  test("no flips when outcomes unchanged", () => {
    const prev = [{ rule_id: "SP001", outcome: "PASS", actual_value: 80 }];
    const curr = [
      { rule_id: "SP001", rule_name: "TFM", outcome: "PASS", actual_value: 82 },
    ];
    expect(diffRuleOutcomes(prev, curr)).toHaveLength(0);
  });

  test("returns empty for null/empty previous", () => {
    expect(diffRuleOutcomes(null, [{ rule_id: "SP001", outcome: "PASS" }])).toHaveLength(0);
    expect(diffRuleOutcomes([], [{ rule_id: "SP001", outcome: "PASS" }])).toHaveLength(0);
  });
});

// ── computeDelta ─────────────────────────────────────────────

describe("computeDelta", () => {
  test("returns null when no previous version", () => {
    expect(computeDelta(null, {})).toBeNull();
  });

  test("computes summary correctly", () => {
    const prev = {
      ingredients: [
        { name: "TFM", concentration: 74, unit: "%" },
        { name: "NaOH", concentration: 0.06, unit: "%" },
      ],
      riskScore: 80,
      status: "NON-COMPLIANT",
      totalViolations: 2,
      totalBorderlines: 0,
      ruleOutcomes: [
        { rule_id: "SP001", outcome: "FAIL", actual_value: 74 },
        { rule_id: "SP003", outcome: "FAIL", actual_value: 0.06 },
      ],
    };

    const curr = {
      raw_ingredients: [
        { name: "TFM", concentration: 80, unit: "%" },
        { name: "NaOH", concentration: 0.03, unit: "%" },
      ],
      rule_outcomes: [
        { rule_id: "SP001", rule_name: "TFM", outcome: "PASS", actual_value: 80 },
        { rule_id: "SP003", rule_name: "NaOH", outcome: "PASS", actual_value: 0.03 },
      ],
      risk_score: 0,
      status: "COMPLIANT",
      total_violations: 0,
      total_borderlines: 0,
    };

    const delta = computeDelta(prev, curr);

    expect(delta).not.toBeNull();
    expect(delta.summary.risk_score_delta).toBe(80);
    expect(delta.summary.status_change.old).toBe("NON-COMPLIANT");
    expect(delta.summary.status_change.new).toBe("COMPLIANT");
    expect(delta.summary.violations_delta).toBe(2);
    expect(delta.summary.ingredients_modified).toBe(2);
    expect(delta.outcome_flips).toHaveLength(2);
  });
});
