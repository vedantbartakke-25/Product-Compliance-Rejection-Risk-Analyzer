const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

/**
 * Build a tight, structured summary of the compliance report.
 * This prevents Gemini from hallucinating facts by giving it
 * only the specific fields it needs — not the whole raw JSON.
 */
function buildStructuredSummary(report) {
  const violations = (report.violations || []).map((v) => ({
    rule: v.rule_name || v.subject,
    outcome: "FAIL",
    value: v.actual_percent !== undefined ? v.actual_percent : "present",
    limit: v.limit_readable !== undefined ? v.limit_readable : "BANNED",
    severity: v.severity || "CRITICAL",
  }));

  const borderlines = (report.borderlines || []).map((b) => ({
    rule: b.rule_name || b.subject,
    outcome: "BORDERLINE",
    value: b.actual_percent !== undefined ? b.actual_percent : "near limit",
    limit: b.limit_readable !== undefined ? b.limit_readable : "—",
    severity: b.severity || "WARNING",
  }));

  return {
    product: report.product || "Unknown Product",
    standard: report.standard || "Unknown Standard",
    overall_status: report.status,
    risk_score: report.risk_score,
    risk_level: report.risk_level,
    total_violations: report.total_violations || 0,
    total_borderlines: report.total_borderlines || 0,
    unknown_ingredient_count: report.missing_data_count || 0,
    unknown_ingredients: report.unknown_list || [],
    violations,
    borderlines,
  };
}

async function generateExplanation(complianceReport) {
  try {
    const summary = buildStructuredSummary(complianceReport);

    const prompt = `You are a Senior Product Compliance Officer reviewing the following compliance evaluation.

EVALUATION DATA (structured, verified — do not add facts not present here):
${JSON.stringify(summary, null, 2)}

YOUR TASK — write a professional compliance summary following these rules EXACTLY:
1. Start with ONE sentence stating the overall status (${summary.overall_status}) and risk score (${summary.risk_score}/100).
2. If there are violations (count: ${summary.total_violations}), name each one with the chemical name, actual value, and limit.
3. If there are borderlines (count: ${summary.total_borderlines}), state which values are close to limits and by how much.
4. If unknown_ingredient_count is ${summary.unknown_ingredient_count} and greater than 0, explicitly list them by name: ${summary.unknown_ingredients.length > 0 ? summary.unknown_ingredients.join(", ") : "none"}. State they require manual verification.
5. Give 1-2 specific, actionable recommendations.
6. If everything is COMPLIANT with 0 violations and 0 unknowns, state the product is ready for lab submission.

STYLE: Professional regulatory tone. No markdown formatting (no **, no ##, no bullet dashes). Plain paragraphs only. Maximum 130 words.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("AI Service Error:", error);
    return "AI explanation unavailable (service error). Please review the structured results above.";
  }
}

module.exports = { generateExplanation };
