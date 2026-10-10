
require("dotenv").config();

const { Pool } = require("pg");

const configuracao = process.env.DATABASE_URL
    ? {
          connectionString: process.env.DATABASE_URL,
          ssl: true
      }
    : {
          host: process.env.DB_HOST,
          port: Number(process.env.DB_PORT || 5432),
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          ssl: {
              rejectUnauthorized: true
          }
      };

const pool = new Pool(configuracao);

pool.on("error", (erro) => {
    console.error("Erro no PostgreSQL:", erro.message);
});

module.exports = pool;
