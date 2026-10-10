
const pool = require("../config/db");

const listar = async (req, res) => {
    try {
        const resultado = await pool.query(
            `SELECT * FROM metas
             WHERE usuario_id = $1
             ORDER BY id DESC`,
            [req.usuarioId]
        );

        res.json(resultado.rows);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({
            erro: "Erro ao listar metas."
        });
    }
};

const cadastrar = async (req, res) => {
    try {
        const { nome, valor_alvo, prazo } = req.body;

        if (
            typeof nome !== "string" ||
            !nome.trim() ||
            nome.length > 120 ||
            typeof valor_alvo !== "number" ||
            !Number.isFinite(valor_alvo) ||
            valor_alvo <= 0 ||
            valor_alvo > 9999999999.99 ||
            (prazo != null &&
                (typeof prazo !== "string" ||
                !/^\d{4}-\d{2}-\d{2}$/.test(prazo) ||
                Number.isNaN(Date.parse(prazo)) ||
                new Date(prazo).toISOString().slice(0, 10) !== prazo))
        ) {
            return res.status(400).json({
                erro: "Dados da meta inválidos."
            });
        }

        const resultado = await pool.query(
            `INSERT INTO metas
             (usuario_id, nome, valor_alvo, prazo)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [
                req.usuarioId,
                nome.trim(),
                valor_alvo,
                prazo || null
            ]
        );

        res.status(201).json(resultado.rows[0]);

    } catch (erro) {
        console.error(erro);
        res.status(500).json({
            erro: "Erro ao cadastrar meta."
        });
    }
};

const atualizar = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { valor_atual } = req.body;

        if (
            !Number.isSafeInteger(id) ||
            id <= 0 ||
            typeof valor_atual !== "number" ||
            !Number.isFinite(valor_atual) ||
            valor_atual < 0 ||
            valor_atual > 9999999999.99
        ) {
            return res.status(400).json({
                erro: "Dados inválidos."
            });
        }

        const resultado = await pool.query(
            `UPDATE metas
             SET valor_atual = $1
             WHERE id = $2 AND usuario_id = $3
             RETURNING *`,
            [valor_atual, id, req.usuarioId]
        );

        if (!resultado.rows.length) {
            return res.status(404).json({
                erro: "Meta não encontrada."
            });
        }

        res.json(resultado.rows[0]);

    } catch (erro) {
        console.error(erro);
        res.status(500).json({
            erro: "Erro ao atualizar meta."
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
            `DELETE FROM metas
             WHERE id = $1 AND usuario_id = $2
             RETURNING id`,
            [id, req.usuarioId]
        );

        if (!resultado.rows.length) {
            return res.status(404).json({
                erro: "Meta não encontrada."
            });
        }

        res.json({
            mensagem: "Meta excluída!"
        });

    } catch (erro) {
        console.error(erro);
        res.status(500).json({
            erro: "Erro ao excluir meta."
        });
    }
};

module.exports = {
    listar,
    cadastrar,
    atualizar,
    excluir
};
