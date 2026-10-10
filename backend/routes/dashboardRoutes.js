
const express = require("express");
const router = express.Router();

const autenticar = require("../middleware/authMiddleware");

const {
    resumo,
    grafico
} = require("../controllers/dashboardController");

router.use(autenticar);

router.get("/resumo", resumo);
router.get("/grafico", grafico);

module.exports = router;
