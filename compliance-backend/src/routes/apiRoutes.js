const express = require("express");
const router = express.Router();
const {
  evaluateProduct,
  getProductReport,
  getEvaluationHistory,
  getEvaluationDetail,
} = require("../controllers/evaluateController");
const { handleShelfLifePrediction } = require("../controllers/shelfLifeController");
const { handleSimulation } = require("../controllers/simulationController");

router.post("/evaluate", evaluateProduct);
router.post("/report", getProductReport);
router.get("/history", getEvaluationHistory);
router.get("/evaluations/:id", getEvaluationDetail);
router.post("/shelf-life", handleShelfLifePrediction);
router.post("/simulate", handleSimulation);

module.exports = router;