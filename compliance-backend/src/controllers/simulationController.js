const { simulationSchema } = require("../utils/validationSchema");
const { simulate } = require("../services/simulationPipeline");

/**
 * POST /api/simulate
 * Run a lightweight simulation for iterative formulation testing.
 */
async function handleSimulation(req, res) {
  try {
    const validatedData = simulationSchema.parse(req.body);

    console.log(`\n🧪 Simulation: ${validatedData.productName} (category: ${validatedData.category})`);

    const result = await simulate(validatedData, validatedData.previousVersion || null);

    console.log(`   ✅ Simulation completed in ${result.duration_ms}ms — ${result.compliance.status} (risk: ${result.compliance.risk_score})`);

    res.json({
      status: "success",
      message: "Simulation completed",
      data: result,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ status: "error", errors: error.errors });
    }
    console.error("Simulation error:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Internal Server Error",
    });
  }
}

module.exports = { handleSimulation };
