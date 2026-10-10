
require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const transacaoRoutes = require("./routes/transacaoRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const metaRoutes = require("./routes/metaRoutes");

const app = express();

// Permite acesso do frontend publicado no GitHub Pages
const origensPermitidas = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://laisvargas-dev.github.io"
];

if (process.env.FRONTEND_ORIGIN) {
    origensPermitidas.push(
        process.env.FRONTEND_ORIGIN.replace(/\/$/, "")
    );
}

// Segurança
app.use(helmet());

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || origensPermitidas.includes(origin)) {
            return callback(null, true);
        }

        callback(new Error("Origem não permitida pelo CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Receber dados JSON
app.use(express.json({ limit: "20kb" }));

// Arquivos do frontend para testes locais
app.use(express.static(
    path.join(__dirname, "../frontend")
));

// Limite de requisições de autenticação
const limiteAuth = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false
});

// Verificar se a API está funcionando
app.get("/", (req, res) => {
    res.json({
        mensagem: "API Meu Financeiro funcionando!",
        status: "online"
    });
});

// Rotas da API
app.use("/api/auth", limiteAuth, authRoutes);
app.use("/api/transacoes", transacaoRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/metas", metaRoutes);

// Rota não encontrada
app.use((req, res) => {
    res.status(404).json({
        erro: "Rota não encontrada."
    });
});

// Tratamento de erros
app.use((erro, req, res, next) => {
    console.error("Erro na API:", erro.message);

    res.status(500).json({
        erro: "Erro interno do servidor."
    });
});

// Iniciar servidor
const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor iniciado na porta ${PORT}`);
});
