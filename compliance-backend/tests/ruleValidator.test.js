const { validateRuleFile, validateAllRuleFiles } = require("../src/utils/ruleValidator");
const path = require("path");

const RULES_DIR = path.join(__dirname, "../rules");

describe("Rule Validator", () => {
  test("soap.bis.json passes validation", () => {
    const result = validateRuleFile(path.join(RULES_DIR, "soap.bis.json"));
    expect(result.valid).toBe(true);
    expect(result.ruleCount).toBe(15);
  });

  test("cookies.bis.json passes validation", () => {
    const result = validateRuleFile(path.join(RULES_DIR, "cookies.bis.json"));
    expect(result.valid).toBe(true);
    expect(result.ruleCount).toBe(10);
  });

  test("non-existent file returns invalid", () => {
    const result = validateRuleFile(path.join(RULES_DIR, "fake.bis.json"));
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("File not found");
  });

  test("validates all rule files in directory", () => {
    const results = validateAllRuleFiles(RULES_DIR);
    expect(results.length).toBeGreaterThanOrEqual(2);
    results.forEach((r) => {
      expect(r.valid).toBe(true);
    });
  });
});
