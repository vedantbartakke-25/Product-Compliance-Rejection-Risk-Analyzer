const {
  generateSuggestions,
  generateSensitivity,
  SAFE_BELOW_MARGIN,
  SAFE_ABOVE_MARGIN,
} = require("../src/services/suggestionEngine");

// ── Suggestion Generation ────────────────────────────────────

describe("generateSuggestions", () => {
  test("FAIL on MAX_LIMIT → suggest REDUCE", () => {
    const outcomes = [
      {
        rule_id: "SP003", rule_name: "Free Alkali (NaOH)", rule_type: "MAX_LIMIT",
        target_code: "CAS-1310-73-2", outcome: "FAIL", severity: "CRITICAL",
        limit_value: 0.05, actual_value: 0.08,
      },
    ];
    const map = new Map([["CAS-1310-73-2", 0.08]]);
    const { suggestions } = generateSuggestions(outcomes, map);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].type).toBe("REDUCE");
    expect(suggestions[0].suggested_value).toBeCloseTo(0.05 * SAFE_BELOW_MARGIN, 4);
    expect(suggestions[0].priority).toBe("HIGH");
  });

  test("FAIL on MIN_LIMIT → suggest INCREASE", () => {
    const outcomes = [
      {
        rule_id: "SP001", rule_name: "TFM", rule_type: "MIN_LIMIT",
        target_code: "PARAM-TFM", outcome: "FAIL", severity: "CRITICAL",
        limit_value: 76, actual_value: 70,
      },
    ];
    const map = new Map([["PARAM-TFM", 70]]);
    const { suggestions } = generateSuggestions(outcomes, map);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].type).toBe("INCREASE");
    expect(suggestions[0].suggested_value).toBeCloseTo(76 * SAFE_ABOVE_MARGIN, 1);
  });

  test("FAIL on BANNED → suggest REMOVE", () => {
    const outcomes = [
      {
        rule_id: "SP004", rule_name: "Mercury Ban", rule_type: "BANNED",
        target_code: "CAS-7439-97-6", outcome: "FAIL", severity: "CRITICAL",
        limit_value: 0, actual_value: 0.01,
      },
    ];
    const map = new Map([["CAS-7439-97-6", 0.01]]);
    const { suggestions } = generateSuggestions(outcomes, map);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].type).toBe("REMOVE");
    expect(suggestions[0].priority).toBe("CRITICAL");
    expect(suggestions[0].suggested_value).toBe(0);
  });

  test("all PASS → no suggestions", () => {
    const outcomes = [
      {
        rule_id: "SP001", rule_name: "TFM", rule_type: "MIN_LIMIT",
        target_code: "PARAM-TFM", outcome: "PASS", severity: "CRITICAL",
        limit_value: 76, actual_value: 82,
      },
    ];
    const map = new Map([["PARAM-TFM", 82]]);
    const { suggestions } = generateSuggestions(outcomes, map);

    expect(suggestions).toHaveLength(0);
  });

  test("BORDERLINE → low priority suggestion", () => {
    const outcomes = [
      {
        rule_id: "SP003", rule_name: "NaOH", rule_type: "MAX_LIMIT",
        target_code: "CAS-1310-73-2", outcome: "BORDERLINE", severity: "CRITICAL",
        limit_value: 0.05, actual_value: 0.048,
      },
    ];
    const map = new Map([["CAS-1310-73-2", 0.048]]);
    const { suggestions } = generateSuggestions(outcomes, map);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].priority).toBe("LOW");
  });

  test("suggestions sorted by priority (CRITICAL > HIGH > LOW)", () => {
    const outcomes = [
      {
        rule_id: "SP001", rule_name: "TFM", rule_type: "MIN_LIMIT",
        target_code: "PARAM-TFM", outcome: "BORDERLINE", severity: "CRITICAL",
        limit_value: 76, actual_value: 77, // 77 < 79.8 (76*1.05), so suggestion generated
      },
      {
        rule_id: "SP004", rule_name: "Mercury", rule_type: "BANNED",
        target_code: "CAS-7439-97-6", outcome: "FAIL", severity: "CRITICAL",
        limit_value: 0, actual_value: 0.01,
      },
      {
        rule_id: "SP003", rule_name: "NaOH", rule_type: "MAX_LIMIT",
        target_code: "CAS-1310-73-2", outcome: "FAIL", severity: "CRITICAL",
        limit_value: 0.05, actual_value: 0.08,
      },
    ];
    const map = new Map();
    const { suggestions } = generateSuggestions(outcomes, map);

    expect(suggestions[0].priority).toBe("CRITICAL"); // BANNED → REMOVE
    expect(suggestions[1].priority).toBe("HIGH");      // MAX_LIMIT FAIL
    expect(suggestions[2].priority).toBe("LOW");       // BORDERLINE
  });

  test("includes input_name from codeToInputName map", () => {
    const outcomes = [
      {
        rule_id: "SP003", rule_name: "Free Alkali (NaOH equivalent)", rule_type: "MAX_LIMIT",
        target_code: "CAS-1310-73-2", outcome: "FAIL", severity: "CRITICAL",
        limit_value: 0.05, actual_value: 0.08,
      },
    ];
    const map = new Map([["CAS-1310-73-2", 0.08]]);
    const nameMap = new Map([["CAS-1310-73-2", "Lye"]]);
    const { suggestions } = generateSuggestions(outcomes, map, nameMap);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].input_name).toBe("Lye");
  });

  test("skips useless BORDERLINE MIN_LIMIT suggestion when value >= suggested", () => {
    const outcomes = [
      {
        rule_id: "SP001", rule_name: "TFM", rule_type: "MIN_LIMIT",
        target_code: "PARAM-TFM", outcome: "BORDERLINE", severity: "CRITICAL",
        limit_value: 76, actual_value: 83.6, // 83.6 > 79.8 (76*1.05) → skip
      },
    ];
    const map = new Map([["PARAM-TFM", 83.6]]);
    const { suggestions } = generateSuggestions(outcomes, map);

    expect(suggestions).toHaveLength(0); // skipped: value already above suggested
  });

  test("BORDERLINE reason text does NOT say 'below MIN_LIMIT'", () => {
    const outcomes = [
      {
        rule_id: "SP001", rule_name: "TFM", rule_type: "MIN_LIMIT",
        target_code: "PARAM-TFM", outcome: "BORDERLINE", severity: "CRITICAL",
        limit_value: 76, actual_value: 77,
      },
    ];
    const map = new Map([["PARAM-TFM", 77]]);
    const { suggestions } = generateSuggestions(outcomes, map);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].reason).toContain("borderline zone");
    expect(suggestions[0].reason).not.toContain("below MIN_LIMIT");
  });
});

// ── Sensitivity Analysis ─────────────────────────────────────

describe("generateSensitivity", () => {
  test("ranks ingredients by sensitivity score", () => {
    const outcomes = [
      {
        rule_id: "SP001", rule_name: "TFM", rule_type: "MIN_LIMIT",
        target_code: "PARAM-TFM", outcome: "FAIL", severity: "CRITICAL",
        limit_value: 76, actual_value: 75, // very close = high sensitivity
      },
      {
        rule_id: "SP002", rule_name: "Moisture", rule_type: "MAX_LIMIT",
        target_code: "PARAM-MOISTURE", outcome: "PASS", severity: "WARNING",
        limit_value: 15, actual_value: 5, // far from limit = low sensitivity
      },
    ];
    const map = new Map([["PARAM-TFM", 75], ["PARAM-MOISTURE", 5]]);
    
    const sensitivity = generateSensitivity(outcomes, map);

    expect(sensitivity.length).toBe(2);
    expect(sensitivity[0].ingredient).toBe("TFM"); // higher sensitivity
    expect(sensitivity[0].sensitivity_score).toBeGreaterThan(sensitivity[1].sensitivity_score);
  });

  test("excludes BANNED rules (they're binary, not sensitive)", () => {
    const outcomes = [
      {
        rule_id: "SP004", rule_name: "Mercury", rule_type: "BANNED",
        target_code: "CAS-7439-97-6", outcome: "PASS", severity: "CRITICAL",
        limit_value: 0, actual_value: 0,
      },
    ];
    const map = new Map();
    const sensitivity = generateSensitivity(outcomes, map);

    expect(sensitivity).toHaveLength(0);
  });

  test("handles null actual values", () => {
    const outcomes = [
      {
        rule_id: "SP001", rule_name: "TFM", rule_type: "MIN_LIMIT",
        target_code: "PARAM-TFM", outcome: "NO_DATA", severity: "CRITICAL",
        limit_value: 76, actual_value: null,
      },
    ];
    const map = new Map();
    const sensitivity = generateSensitivity(outcomes, map);

    expect(sensitivity).toHaveLength(0);
  });
});
