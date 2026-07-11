const { z } = require("zod");
const { getAvailableCategories } = require("../services/ruleEngine");

const ingredientSchema = z.object({
  name: z.string().min(1, "Ingredient name is required"),
  concentration: z.number().min(0, "Concentration must be positive"),
  unit: z.enum(["%", "ppm", "mg/kg", "ppb", "mg/L", "µg/kg", "ug/kg"], {
    errorMap: () => ({ message: "Unit must be %, ppm, mg/kg, ppb, mg/L, or µg/kg" }),
  }),
});

const submissionSchema = z
  .object({
    productName: z.string().min(1, "Product name is required"),
    category: z.string().min(1, "Category is required"),
    manufacturer: z.string().optional(),
    ingredients: z
      .array(ingredientSchema)
      .min(1, "Must provide at least one ingredient"),
  })
  .refine(
    (data) => {
      const available = getAvailableCategories();
      return available.includes(data.category);
    },
    {
      message: "Invalid category. No rule file found for this category.",
      path: ["category"],
    }
  );

const shelfLifeSchema = z
  .object({
    productName: z.string().min(1, "Product name is required"),
    category: z.string().min(1, "Category is required"),
    manufacturer: z.string().optional(),
    evaluationId: z.number().int().positive().optional(),
    ingredients: z
      .array(ingredientSchema)
      .min(1, "Must provide at least one ingredient"),
    // Shelf-life-specific optional fields
    phValue: z.number().min(0).max(14).optional(),
    waterPercent: z.number().min(0).max(100).optional(),
    packagingType: z
      .enum(["AIRTIGHT", "SEMI_SEALED", "OPEN"], {
        errorMap: () => ({
          message: "Packaging type must be AIRTIGHT, SEMI_SEALED, or OPEN",
        }),
      })
      .optional(),
    environments: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      const available = getAvailableCategories();
      return available.includes(data.category);
    },
    {
      message: "Invalid category. No rule file found for this category.",
      path: ["category"],
    }
  );

const previousVersionSchema = z.object({
  ingredients: z.array(ingredientSchema),
  riskScore: z.number(),
  status: z.string(),
  totalViolations: z.number().optional(),
  totalBorderlines: z.number().optional(),
  ruleOutcomes: z.array(z.object({
    rule_id: z.string(),
    outcome: z.string(),
    actual_value: z.number().nullable().optional(),
    rule_name: z.string().optional(),
  })).optional(),
});

const simulationSchema = z
  .object({
    productName: z.string().min(1, "Product name is required"),
    category: z.string().min(1, "Category is required"),
    ingredients: z
      .array(ingredientSchema)
      .min(1, "Must provide at least one ingredient"),
    previousVersion: previousVersionSchema.optional(),
  })
  .refine(
    (data) => {
      const available = getAvailableCategories();
      return available.includes(data.category);
    },
    {
      message: "Invalid category. No rule file found for this category.",
      path: ["category"],
    }
  );

module.exports = { submissionSchema, shelfLifeSchema, simulationSchema };
