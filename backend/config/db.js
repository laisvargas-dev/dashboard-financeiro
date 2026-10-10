
require("dotenv").config();

const { Pool } = require("pg");

const usarNeon = Boolean(process.env.DATABASE_URL);

const pool = new Pool(
    usarNeon
        ? {
              connectionString: process.env.DATABASE_URL,
              ssl: {
                  rejectUnauthorized: true
              },
              max: 10,
              idleTimeoutMillis: 30000,
              connectionTimeoutMillis: 10000
          }
        : {
              host: process.env.DB_HOST || "localhost",
              port: Number(process.env.DB_PORT || 5432),
              user: process.env.DB_USER,
              password: process.env.DB_PASSWORD,
              database: process.env.DB_NAME
          }
);

pool.on("error", (erro) => {
    console.error("Erro no PostgreSQL:", erro.message);
});

module.exports = pool;
