
const pool = require("../config/db");

const resumo = async (req, res) => {
    try {
        const resultado = await pool.query(
            `SELECT
                COALESCE(SUM(valor) FILTER (
                    WHERE tipo = 'receita'
                ), 0) AS receitas,

                COALESCE(SUM(valor) FILTER (
                    WHERE tipo = 'despesa'
                ), 0) AS despesas,

                COALESCE(SUM(
                    CASE
                        WHEN tipo = 'receita' THEN valor
                        ELSE -valor
                    END
                ), 0) AS saldo

             FROM transacoes
             WHERE usuario_id = $1`,
            [req.usuarioId]
        );

        const dados = resultado.rows[0];

        res.json({
            receitas: Number(dados.receitas),
            despesas: Number(dados.despesas),
            saldo: Number(dados.saldo)
        });

    } catch (erro) {
        console.error(erro);
        res.status(500).json({
            erro: "Erro ao calcular resumo."
        });
    }
};

const grafico = async (req, res) => {
    try {
        const resultado = await pool.query(
            `SELECT
                TO_CHAR(data, 'YYYY-MM') AS mes,
                tipo,
                SUM(valor) AS total
             FROM transacoes
             WHERE usuario_id = $1
             GROUP BY mes, tipo
             ORDER BY mes ASC`,
            [req.usuarioId]
        );

        res.json(resultado.rows);

    } catch (erro) {
        console.error(erro);
        res.status(500).json({
            erro: "Erro ao carregar gráfico."
        });
    }
};

module.exports = { resumo, grafico };
