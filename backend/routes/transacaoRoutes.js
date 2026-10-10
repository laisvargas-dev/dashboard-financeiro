
const express = require("express");
const router = express.Router();

const autenticar = require("../middleware/authMiddleware");

const {
    listar,
    cadastrar,
    atualizar,
    excluir
} = require("../controllers/transacaoController");

router.use(autenticar);

router.get("/", listar);
router.post("/", cadastrar);
router.put("/:id", atualizar);
router.delete("/:id", excluir);

module.exports = router;
