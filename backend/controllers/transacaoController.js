
const pool = require("../config/db");

const tipos = ["receita", "despesa"];

function validarDados(dados) {
    const { descricao, tipo, valor, data } = dados;

    if (
        typeof descricao !== "string" ||
        !descricao.trim() ||
        descricao.length > 200 ||
        !tipos.includes(tipo) ||
        typeof valor !== "number" ||
        !Number.isFinite(valor) ||
        valor <= 0 ||
        valor > 9999999999.99 ||
        !Number.isInteger(Math.round(valor * 100))
    ) {
        return false;
    }

    if (data !== undefined) {
        if (
            typeof data !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(data)
        ) {
            return false;
        }

        const parsed = new Date(`${data}T00:00:00Z`);

        if (
            Number.isNaN(parsed.getTime()) ||
            parsed.toISOString().slice(0, 10) !== data
        ) {
            return false;
        }
    }

    return true;
}

const listar = async (req, res) => {
    try {
        const resultado = await pool.query(
            `SELECT id, descricao, tipo, valor, data
             FROM transacoes
             WHERE usuario_id = $1
             ORDER BY data DESC, id DESC`,
            [req.usuarioId]
        );

        res.json(resultado.rows);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({
            erro: "Erro ao listar movimentações."
        });
    }
};

const cadastrar = async (req, res) => {
    try {
        const { descricao, tipo, valor, data } = req.body;

        if (!validarDados(req.body)) {
            return res.status(400).json({
                erro: "Dados da movimentação inválidos."
            });
        }

        const resultado = await pool.query(
            `INSERT INTO transacoes
             (usuario_id, descricao, tipo, valor, data)
             VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE))
             RETURNING *`,
            [
                req.usuarioId,
                descricao.trim(),
                tipo,
                valor,
                data || null
            ]
        );

        res.status(201).json({
            mensagem: "Movimentação cadastrada!",
            transacao: resultado.rows[0]
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({
            erro: "Erro ao cadastrar movimentação."
        });
    }
};

const atualizar = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: "ID inválido."
            });
        }

        if (!validarDados(req.body)) {
            return res.status(400).json({
                erro: "Dados inválidos."
            });
        }

        const { descricao, tipo, valor, data } = req.body;

        const resultado = await pool.query(
            `UPDATE transacoes
             SET descricao = $1,
                 tipo = $2,
                 valor = $3,
                 data = COALESCE($4::date, data),
                 categoria_id = NULL
             WHERE id = $5 AND usuario_id = $6
             RETURNING *`,
            [
                descricao.trim(),
                tipo,
                valor,
                data || null,
                id,
                req.usuarioId
            ]
        );

        if (!resultado.rows.length) {
            return res.status(404).json({
                erro: "Movimentação não encontrada."
            });
        }

        res.json({
            mensagem: "Movimentação atualizada!",
            transacao: resultado.rows[0]
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({
            erro: "Erro ao atualizar movimentação."
        });
    }
};

const excluir = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: "ID inválido."
            });
        }

        const resultado = await pool.query(
            `DELETE FROM transacoes
             WHERE id = $1 AND usuario_id = $2
             RETURNING id`,
            [id, req.usuarioId]
        );

        if (!resultado.rows.length) {
            return res.status(404).json({
                erro: "Movimentação não encontrada."
            });
        }

        res.json({
            mensagem: "Movimentação excluída!"
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({
            erro: "Erro ao excluir movimentação."
        });
    }
};

module.exports = {
    listar,
    cadastrar,
    atualizar,
    excluir
};
