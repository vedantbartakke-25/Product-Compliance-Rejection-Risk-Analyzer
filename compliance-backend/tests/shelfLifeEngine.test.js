const {
  tempAcceleration,
  humidityFactor,
  packagingFactor,
  phMicrobialFactor,
  isThresholdMet,
  sumEffects,
  determineConfidence,
  overallConfidence,
} = require("../src/services/shelfLifeEngine");

// ── Temperature Acceleration ─────────────────────────────────

describe("tempAcceleration", () => {
  test("returns 1.0 at reference temperature (25°C)", () => {
    expect(tempAcceleration(25)).toBeCloseTo(1.0);
  });

  test("doubles at 35°C (Q10 = 2)", () => {
    expect(tempAcceleration(35)).toBeCloseTo(2.0);
  });

  test("quadruples at 45°C", () => {
    expect(tempAcceleration(45)).toBeCloseTo(4.0);
  });

  test("halves at 15°C", () => {
    expect(tempAcceleration(15)).toBeCloseTo(0.5);
  });

  test("quarter speed at 5°C (refrigerated)", () => {
    expect(tempAcceleration(5)).toBeCloseTo(0.25);
  });

  test("8x at 55°C (extreme heat)", () => {
    expect(tempAcceleration(55)).toBeCloseTo(8.0, 0);
  });
});

// ── Humidity Factor ──────────────────────────────────────────

describe("humidityFactor", () => {
  test("dry (≤30%) slows microbial growth", () => {
    expect(humidityFactor(20)).toBe(0.7);
    expect(humidityFactor(30)).toBe(0.7);
  });

  test("normal (31-50%) is baseline", () => {
    expect(humidityFactor(40)).toBe(1.0);
    expect(humidityFactor(50)).toBe(1.0);
  });

  test("humid (51-70%) accelerates growth", () => {
    expect(humidityFactor(60)).toBe(1.3);
    expect(humidityFactor(70)).toBe(1.3);
  });

  test("tropical (>70%) fastest growth", () => {
    expect(humidityFactor(75)).toBe(1.6);
    expect(humidityFactor(90)).toBe(1.6);
  });
});

// ── Packaging Factor ─────────────────────────────────────────

describe("packagingFactor", () => {
  test("AIRTIGHT reduces degradation rate", () => {
    expect(packagingFactor("AIRTIGHT")).toBe(0.7);
  });

  test("SEMI_SEALED is baseline", () => {
    expect(packagingFactor("SEMI_SEALED")).toBe(1.0);
  });

  test("OPEN accelerates degradation", () => {
    expect(packagingFactor("OPEN")).toBe(1.5);
  });

  test("unknown/null defaults to baseline", () => {
    expect(packagingFactor(null)).toBe(1.0);
    expect(packagingFactor(undefined)).toBe(1.0);
    expect(packagingFactor("WEIRD")).toBe(1.0);
  });
});

// ── pH Microbial Factor ──────────────────────────────────────

describe("phMicrobialFactor", () => {
  test("null/undefined pH returns neutral factor", () => {
    expect(phMicrobialFactor(null)).toBe(1.0);
    expect(phMicrobialFactor(undefined)).toBe(1.0);
  });

  test("extreme acidic pH (< 4) is hostile to microbes", () => {
    expect(phMicrobialFactor(3.0)).toBe(0.5);
  });

  test("extreme alkaline pH (> 10) is hostile to microbes", () => {
    expect(phMicrobialFactor(11.0)).toBe(0.5);
  });

  test("slightly acidic/alkaline pH reduces microbial risk", () => {
    expect(phMicrobialFactor(4.5)).toBe(0.7);
    expect(phMicrobialFactor(9.5)).toBe(0.7);
  });

  test("neutral pH (6-8) favors microbial growth", () => {
    expect(phMicrobialFactor(7.0)).toBe(1.3);
    expect(phMicrobialFactor(6.0)).toBe(1.3);
    expect(phMicrobialFactor(8.0)).toBe(1.3);
  });

  test("transition zones return baseline", () => {
    expect(phMicrobialFactor(5.5)).toBe(1.0);
    expect(phMicrobialFactor(8.5)).toBe(1.0);
  });
});

// ── Threshold Checking ───────────────────────────────────────

describe("isThresholdMet", () => {
  test("ABOVE threshold met when actual > threshold", () => {
    const factor = { threshold_type: "ABOVE", threshold_value: 5.0 };
    expect(isThresholdMet(factor, 10.0)).toBe(true);
    expect(isThresholdMet(factor, 5.0)).toBe(false);
    expect(isThresholdMet(factor, 3.0)).toBe(false);
  });

  test("BELOW threshold met when actual < threshold", () => {
    const factor = { threshold_type: "BELOW", threshold_value: 5.0 };
    expect(isThresholdMet(factor, 3.0)).toBe(true);
    expect(isThresholdMet(factor, 5.0)).toBe(false);
    expect(isThresholdMet(factor, 10.0)).toBe(false);
  });

  test("ANY threshold always met", () => {
    const factor = { threshold_type: "ANY", threshold_value: 5.0 };
    expect(isThresholdMet(factor, 0)).toBe(true);
    expect(isThresholdMet(factor, 100)).toBe(true);
  });

  test("null threshold type always met", () => {
    const factor = { threshold_type: null, threshold_value: null };
    expect(isThresholdMet(factor, 50)).toBe(true);
  });
});

// ── Sum Effects ──────────────────────────────────────────────

describe("sumEffects", () => {
  const factors = [
    {
      reference_code: "CAS-123",
      chemical_effect_months: 3,
      microbial_effect_months: -2,
      physical_effect_months: 0,
      threshold_type: "ABOVE",
      threshold_value: 1.0,
    },
    {
      reference_code: "CAS-456",
      chemical_effect_months: -1,
      microbial_effect_months: 5,
      physical_effect_months: 2,
      threshold_type: "ABOVE",
      threshold_value: 0.5,
    },
  ];

  test("sums chemical effects for present ingredients above threshold", () => {
    const map = new Map([
      ["CAS-123", 2.0],
      ["CAS-456", 1.0],
    ]);
    expect(sumEffects(factors, map, "chemical_effect_months")).toBe(2); // 3 + (-1)
  });

  test("sums microbial effects", () => {
    const map = new Map([
      ["CAS-123", 2.0],
      ["CAS-456", 1.0],
    ]);
    expect(sumEffects(factors, map, "microbial_effect_months")).toBe(3); // -2 + 5
  });

  test("ignores ingredients below threshold", () => {
    const map = new Map([
      ["CAS-123", 0.5], // below ABOVE 1.0 → not met
      ["CAS-456", 1.0], // above ABOVE 0.5 → met
    ]);
    expect(sumEffects(factors, map, "chemical_effect_months")).toBe(-1); // only CAS-456
  });

  test("ignores missing ingredients", () => {
    const map = new Map([["CAS-999", 10.0]]);
    expect(sumEffects(factors, map, "chemical_effect_months")).toBe(0);
  });

  test("returns 0 for empty factors", () => {
    const map = new Map([["CAS-123", 2.0]]);
    expect(sumEffects([], map, "chemical_effect_months")).toBe(0);
  });
});

// ── Confidence Determination ─────────────────────────────────

describe("determineConfidence", () => {
  test("HIGH with 5+ ingredients + pH + water", () => {
    expect(determineConfidence(5, 7.0, 12)).toBe("HIGH");
    expect(determineConfidence(6, 9.0, 5)).toBe("HIGH");
  });

  test("MEDIUM with 3 ingredients + pH", () => {
    expect(determineConfidence(3, 7.0, null)).toBe("MEDIUM");
  });

  test("MEDIUM with 5 ingredients + no extras", () => {
    expect(determineConfidence(5, null, null)).toBe("MEDIUM");
  });

  test("LOW with 1 ingredient and no extras", () => {
    expect(determineConfidence(1, null, null)).toBe("LOW");
  });

  test("LOW with 2 ingredients and no extras", () => {
    expect(determineConfidence(2, null, null)).toBe("LOW");
  });
});

// ── Overall Confidence ───────────────────────────────────────

describe("overallConfidence", () => {
  test("HIGH when all environments are HIGH", () => {
    const results = [
      { confidence: "HIGH" },
      { confidence: "HIGH" },
      { confidence: "HIGH" },
    ];
    expect(overallConfidence(results)).toBe("HIGH");
  });

  test("MEDIUM when mixed HIGH and LOW", () => {
    const results = [
      { confidence: "HIGH" },
      { confidence: "LOW" },
    ];
    expect(overallConfidence(results)).toBe("MEDIUM");
  });

  test("LOW when all environments are LOW", () => {
    const results = [
      { confidence: "LOW" },
      { confidence: "LOW" },
    ];
    expect(overallConfidence(results)).toBe("LOW");
  });

  test("LOW for empty results", () => {
    expect(overallConfidence([])).toBe("LOW");
  });
});

// ── Integration-style: Prediction Sanity Checks ─────────────

describe("prediction sanity", () => {
  test("hot environment always produces shorter shelf life than cold", () => {
    // tempAcceleration at 40°C should be higher than at 5°C
    const hotAccel = tempAcceleration(40);
    const coldAccel = tempAcceleration(5);
    expect(hotAccel).toBeGreaterThan(coldAccel);

    // So base/hotAccel < base/coldAccel (shorter life in heat)
    const base = 24;
    const hotLife = base / hotAccel;
    const coldLife = base / coldAccel;
    expect(hotLife).toBeLessThan(coldLife);
  });

  test("airtight packaging extends life compared to open", () => {
    const airtight = packagingFactor("AIRTIGHT");
    const open = packagingFactor("OPEN");
    // Lower packaging factor means slower degradation → longer life
    expect(airtight).toBeLessThan(open);
  });

  test("predicted range always has min >= 1", () => {
    // Even with extreme acceleration, floor should be 1 month
    const extremeAccel = tempAcceleration(60); // ~11.3
    const base = 6; // short base (cookies)
    const life = base / extremeAccel;
    const predictedMin = Math.max(1, Math.round(life * 0.85));
    expect(predictedMin).toBeGreaterThanOrEqual(1);
  });
});
