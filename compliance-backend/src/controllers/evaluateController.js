const { submissionSchema } = require("../utils/validationSchema");
const CompliancePipeline = require("../services/compliancePipeline");
const { generatePDFReport } = require("../services/reportService");
const db = require("../config/db");

async function evaluateProduct(req, res) {
  try {
    const validatedData = submissionSchema.parse(req.body);
    const userId = req.body.userId || null;
    console.log(`\n📦 Processing Product: ${validatedData.productName} (userId: ${userId})`);

    const result = await CompliancePipeline.run(validatedData, userId);

    res.json({
      status: "success",
      message: "Evaluation completed",
      data: result,
    });
  } catch (error) {
    handleError(res, error);
  }
}

async function getProductReport(req, res) {
  try {
    const validatedData = submissionSchema.parse(req.body);
    const userId = req.body.userId || null;
    console.log(`\n📄 Generating PDF for: ${validatedData.productName}`);

    const result = await CompliancePipeline.run(validatedData, userId);

    const reportData = {
      product: result.product,
      category: result.category,
      compliance_report: result.compliance_report,
    };

    const doc = generatePDFReport(reportData);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=compliance_report_${Date.now()}.pdf`
    );

    doc.pipe(res);
  } catch (error) {
    handleError(res, error);
  }
}

async function getEvaluationHistory(req, res) {
  try {
    const userId = req.query.userId;

    let result;
    if (userId) {
      // Try filtering by user_id (requires migration)
      try {
        result = await db.query(
          `SELECT id, product_name, category, status, risk_score, risk_level,
                  total_violations, total_borderlines, missing_data_count,
                  pipeline_version, created_at
           FROM evaluations
           WHERE user_id = $1
           ORDER BY created_at DESC
           LIMIT 50`,
          [userId]
        );
      } catch (dbErr) {
        // If user_id column doesn't exist, fall back to unfiltered (pre-migration)
        if (dbErr.message && dbErr.message.includes('user_id')) {
          console.warn('⚠️  user_id column not found — run migrate_user_history.sql');
          result = await db.query(
            `SELECT id, product_name, category, status, risk_score, risk_level,
                    total_violations, total_borderlines, missing_data_count,
                    pipeline_version, created_at
             FROM evaluations
             ORDER BY created_at DESC
             LIMIT 50`
          );
        } else {
          throw dbErr;
        }
      }
    } else {
      result = { rows: [] };
    }

    res.json({ status: "success", data: result.rows });
  } catch (error) {
    handleError(res, error);
  }
}

async function getEvaluationDetail(req, res) {
  try {
    const { id } = req.params;
    const userId = req.query.userId;

    // Fetch evaluation (with user ownership check when userId is provided)
    let evalQuery, evalParams;
    if (userId) {
      evalQuery = `SELECT id, product_name, category, status, risk_score, risk_level,
                          total_violations, total_borderlines, missing_data_count,
                          pipeline_version, ai_explanation, created_at
                   FROM evaluations WHERE id = $1 AND user_id = $2`;
      evalParams = [id, userId];
    } else {
      evalQuery = `SELECT id, product_name, category, status, risk_score, risk_level,
                          total_violations, total_borderlines, missing_data_count,
                          pipeline_version, ai_explanation, created_at
                   FROM evaluations WHERE id = $1`;
      evalParams = [id];
    }

    const evalResult = await db.query(evalQuery, evalParams);

    if (evalResult.rows.length === 0) {
      return res.status(404).json({ status: "error", message: "Evaluation not found" });
    }

    // Fetch rule outcomes
    const outcomesResult = await db.query(
      `SELECT test_module, rule_id, rule_name, rule_type, target_code,
              outcome, severity, limit_value, actual_value, deviation_pct, reasoning
       FROM rule_outcomes WHERE evaluation_id = $1
       ORDER BY id`,
      [id]
    );

    // Fetch pipeline stages
    const stagesResult = await db.query(
      `SELECT stage_name, stage_order, status, duration_ms, details
       FROM evaluation_stages WHERE evaluation_id = $1
       ORDER BY stage_order`,
      [id]
    );

    res.json({
      status: "success",
      data: {
        evaluation: evalResult.rows[0],
        rule_outcomes: outcomesResult.rows,
        stages: stagesResult.rows,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
}

function handleError(res, error) {
  if (error.name === "ZodError") {
    return res.status(400).json({ status: "error", errors: error.errors });
  }
  console.error(error);
  res.status(500).json({ status: "error", message: error.message || "Internal Server Error" });
}

module.exports = { evaluateProduct, getProductReport, getEvaluationHistory, getEvaluationDetail };
