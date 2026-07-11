const fs = require("fs");
const path = require("path");

const REQUIRED_RULE_FIELDS = ["id", "name", "type", "limit", "unit", "severity", "description"];
const VALID_TYPES = ["MIN_LIMIT", "MAX_LIMIT", "BANNED", "GROUP_MAX"];
const VALID_SEVERITIES = ["CRITICAL", "WARNING", "INFO"];
const VALID_UNITS = ["%", "ppm", "mg/kg"];

function validateRuleFile(filePath) {
  const errors = [];
  const fileName = path.basename(filePath);

  if (!fs.existsSync(filePath)) {
    return { valid: false, errors: [`File not found: ${filePath}`] };
  }

  let data;
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    data = JSON.parse(raw);
  } catch (e) {
    return { valid: false, errors: [`Invalid JSON in ${fileName}: ${e.message}`] };
  }

  if (!data.category) errors.push("Missing top-level field: 'category'");
  if (!data.standard) errors.push("Missing top-level field: 'standard'");
  if (!data.version) errors.push("Missing top-level field: 'version'");
  if (!Array.isArray(data.rules)) {
    errors.push("Missing or invalid 'rules' array");
    return { valid: false, errors };
  }

  const ruleIds = new Set();

  data.rules.forEach((rule, index) => {
    const prefix = `Rule[${index}]`;

    REQUIRED_RULE_FIELDS.forEach((field) => {
      if (rule[field] === undefined && !(field === "limit" && rule.type === "BANNED")) {
        if (field === "target_code" && rule.type === "GROUP_MAX") return;
        errors.push(`${prefix}: Missing required field '${field}'`);
      }
    });

    if (rule.id) {
      if (ruleIds.has(rule.id)) {
        errors.push(`${prefix}: Duplicate rule ID '${rule.id}'`);
      }
      ruleIds.add(rule.id);
    }

    if (rule.type && !VALID_TYPES.includes(rule.type)) {
      errors.push(`${prefix}: Invalid type '${rule.type}'. Must be one of: ${VALID_TYPES.join(", ")}`);
    }

    if (rule.severity && !VALID_SEVERITIES.includes(rule.severity)) {
      errors.push(`${prefix}: Invalid severity '${rule.severity}'. Must be one of: ${VALID_SEVERITIES.join(", ")}`);
    }

    if (rule.unit && !VALID_UNITS.includes(rule.unit)) {
      errors.push(`${prefix}: Invalid unit '${rule.unit}'. Must be one of: ${VALID_UNITS.join(", ")}`);
    }

    if (rule.type === "GROUP_MAX") {
      if (!Array.isArray(rule.targets) || rule.targets.length === 0) {
        errors.push(`${prefix}: GROUP_MAX rule must have a non-empty 'targets' array`);
      }
    } else {
      if (!rule.target_code) {
        errors.push(`${prefix}: Non-GROUP rules must have 'target_code'`);
      }
    }

    if (rule.type !== "BANNED" && (typeof rule.limit !== "number" || rule.limit < 0)) {
      errors.push(`${prefix}: 'limit' must be a non-negative number`);
    }
  });

  return {
    valid: errors.length === 0,
    file: fileName,
    category: data.category,
    ruleCount: data.rules.length,
    errors,
  };
}

function validateAllRuleFiles(rulesDir) {
  const files = fs.readdirSync(rulesDir).filter((f) => f.endsWith(".bis.json"));
  const results = [];

  for (const file of files) {
    results.push(validateRuleFile(path.join(rulesDir, file)));
  }

  return results;
}

if (require.main === module) {
  const rulesDir = path.join(__dirname, "../../rules");
  const results = validateAllRuleFiles(rulesDir);

  results.forEach((r) => {
    if (r.valid) {
      console.log(`✅ ${r.file} — Valid (${r.ruleCount} rules, category: ${r.category})`);
    } else {
      console.log(`❌ ${r.file} — INVALID`);
      r.errors.forEach((e) => console.log(`   - ${e}`));
    }
  });

  const hasErrors = results.some((r) => !r.valid);
  process.exit(hasErrors ? 1 : 0);
}

module.exports = { validateRuleFile, validateAllRuleFiles };
