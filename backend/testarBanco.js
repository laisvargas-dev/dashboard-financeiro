
const pool = require("./config/db");

async function testarBanco() {
    try {
        const resultado = await pool.query(
            "SELECT NOW() AS horario"
        );

        console.log("Banco conectado com sucesso!");
        console.log(resultado.rows[0]);
    } catch (erro) {
        console.error("Erro:", erro.message);
    } finally {
        await pool.end();
    }
}

testarBanco();
