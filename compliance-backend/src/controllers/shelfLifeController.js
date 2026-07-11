const { shelfLifeSchema } = require("../utils/validationSchema");
const { resolveIngredient } = require("../services/normalizationService");
const { normalizeToPercent } = require("../utils/unitConverter");
const { predictShelfLife } = require("../services/shelfLifeEngine");
const { persistShelfLifeResult } = require("../services/shelfLifeData");

/**
 * POST /api/shelf-life
 * Predict environment-wise shelf life for a product formulation.
 */
async function handleShelfLifePrediction(req, res) {
  try {
    const validatedData = shelfLifeSchema.parse(req.body);
    const userId = req.body.userId || null;

    console.log(`\n🧪 Shelf Life Prediction: ${validatedData.productName} (category: ${validatedData.category})`);

    // ── Step 1: Normalize ingredients (reuse compliance normalization logic) ──
    const normalizedIngredients = [];
    const unknownIngredients = [];

    for (const item of validatedData.ingredients) {
      const substance = await resolveIngredient(item.name);
      if (substance) {
        const percentValue = normalizeToPercent(item.concentration, item.unit);
        normalizedIngredients.push({
          input_name: item.name,
          substance_id: substance.reference_code,
          official_name: substance.official_name,
          type: substance.type,
          value_percent: percentValue,
        });
      } else {
        unknownIngredients.push(item.name);
      }
    }

    // Build ingredient map for the engine
    const ingredientMap = new Map();
    normalizedIngredients.forEach((item) => {
      ingredientMap.set(item.substance_id, item.value_percent);
    });

    // ── Step 2: Run shelf life prediction engine ──
    const prediction = await predictShelfLife({
      category: validatedData.category,
      normalizedIngredients,
      ingredientMap,
      phValue: validatedData.phValue || null,
      waterPercent: validatedData.waterPercent || null,
      packagingType: validatedData.packagingType || null,
      environments: validatedData.environments || null,
    });

    // ── Step 3: Persist result to database ──
    const resultId = await persistShelfLifeResult({
      evaluationId: validatedData.evaluationId || null,
      userId,
      productName: validatedData.productName,
      category: validatedData.category,
      phValue: validatedData.phValue || null,
      waterPercent: validatedData.waterPercent || null,
      packagingType: validatedData.packagingType || null,
      environmentResults: prediction.environments,
      overallConfidence: prediction.overall_confidence,
    });

    // ── Step 4: Return response ──
    res.json({
      status: "success",
      message: "Shelf life prediction completed",
      data: {
        result_id: resultId,
        evaluation_id: validatedData.evaluationId || null,
        product_name: validatedData.productName,
        category: validatedData.category,
        base_shelf_life_months: prediction.base_shelf_life,
        packaging: prediction.packaging,
        ph: prediction.ph,
        water_percent: prediction.water_percent,
        normalization_summary: {
          resolved_count: normalizedIngredients.length,
          unknown_count: unknownIngredients.length,
          unknown_list: unknownIngredients,
        },
        environments: prediction.environments,
        overall_confidence: prediction.overall_confidence,
        disclaimer: prediction.disclaimer,
      },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ status: "error", errors: error.errors });
    }
    console.error("Shelf life prediction error:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Internal Server Error",
    });
  }
}

module.exports = { handleShelfLifePrediction };
